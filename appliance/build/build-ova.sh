#!/bin/bash
# Reference/scaffold script for assembling the final .ova. Written to be
# run on a Linux box with root access, qemu-utils (qemu-img/qemu-nbd),
# and the `nbd` kernel module available - NOT runnable in the sandbox
# this repo was built in (no /dev/kvm, no nbd module, no vSphere to
# validate against). See ../README.md before running this.
#
# What it does:
#   1. Extracts a base Photon OS OVA you provide (download it yourself
#      from your organization's verified VMware/Broadcom source - this
#      script deliberately does not hardcode a download URL).
#   2. Mounts its .vmdk directly as a block device (no boot required).
#   3. Copies this repo + the appliance/docker production stack onto it,
#      installs Docker, and installs the guest customization service.
#   4. Merges appliance/ovf/product-section.xml into the OVF descriptor.
#   5. Repackages everything into a new .ova with a regenerated manifest.
#
# Every step below has been written carefully but NOT run end-to-end -
# there was no environment available to actually test it. Treat this as
# a strong starting point, not a guaranteed-working tool: verify each
# step against the real base OVA you use (partition layout, service
# names, and tdnf package names can differ by Photon OS version).

set -euo pipefail

BASE_OVA="${1:?Usage: $0 <base-photon-os.ova> <repo-root> <output.ova>}"
REPO_ROOT="${2:?Usage: $0 <base-photon-os.ova> <repo-root> <output.ova>}"
OUTPUT_OVA="${3:?Usage: $0 <base-photon-os.ova> <repo-root> <output.ova>}"
APPLIANCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

WORKDIR="$(mktemp -d)"
MNT="$WORKDIR/mnt"
trap 'cleanup' EXIT

cleanup() {
  mountpoint -q "$MNT" 2>/dev/null && umount "$MNT" || true
  [ -n "${NBD_DEV:-}" ] && qemu-nbd --disconnect "$NBD_DEV" 2>/dev/null || true
  rm -rf "$WORKDIR"
}

echo "==> extracting base OVA"
mkdir -p "$WORKDIR/extracted" "$MNT"
tar -xf "$BASE_OVA" -C "$WORKDIR/extracted"

OVF_FILE="$(find "$WORKDIR/extracted" -name '*.ovf' | head -n1)"
VMDK_FILE="$(find "$WORKDIR/extracted" -name '*.vmdk' | sort | head -n1)"
[ -n "$OVF_FILE" ] && [ -n "$VMDK_FILE" ] || { echo "could not find .ovf/.vmdk in $BASE_OVA"; exit 1; }
echo "    ovf:  $OVF_FILE"
echo "    vmdk: $VMDK_FILE"

echo "==> connecting vmdk via qemu-nbd"
modprobe nbd max_part=16
NBD_DEV="/dev/nbd0"
qemu-nbd --connect="$NBD_DEV" "$VMDK_FILE"
sleep 1
partprobe "$NBD_DEV"

# ASSUMPTION: Photon OS's own published OVAs typically put / on the 2nd
# partition (1st is often a small boot/EFI partition). VERIFY this on
# your actual base image with `fdisk -l "$NBD_DEV"` before trusting it -
# if wrong, this mounts the wrong partition and everything below is a
# no-op or corrupts the wrong filesystem.
ROOT_PART="${NBD_DEV}p2"
mount "$ROOT_PART" "$MNT"

echo "==> copying app + appliance files to /opt/vcf-lic-mgmt"
mkdir -p "$MNT/opt/vcf-lic-mgmt"
rsync -a --exclude node_modules --exclude .git \
  "$REPO_ROOT"/ "$MNT/opt/vcf-lic-mgmt/"

echo "==> installing guest customization script + service"
install -m 0755 "$APPLIANCE_DIR/guest/ovf-customize.sh" "$MNT/usr/local/sbin/ovf-customize.sh"
install -m 0644 "$APPLIANCE_DIR/guest/ovf-customize.service" "$MNT/etc/systemd/system/ovf-customize.service"
install -m 0644 "$APPLIANCE_DIR/docker/vcf-lic-mgmt.service" "$MNT/etc/systemd/system/vcf-lic-mgmt.service"

echo "==> enabling services + installing Docker inside the guest filesystem"
# Needs the guest's own resolv.conf to resolve package mirrors from
# inside the chroot.
cp /etc/resolv.conf "$MNT/etc/resolv.conf"
chroot "$MNT" /bin/bash -c '
  set -e
  tdnf install -y docker docker-compose open-vm-tools
  systemctl enable docker
  systemctl enable open-vm-tools
  systemctl enable ovf-customize.service
  systemctl enable vcf-lic-mgmt.service
'

echo "==> unmounting"
umount "$MNT"
qemu-nbd --disconnect "$NBD_DEV"
NBD_DEV=""

echo "==> merging OVF ProductSection"
python3 "$(dirname "${BASH_SOURCE[0]}")/merge-ovf-properties.py" \
  "$OVF_FILE" "$APPLIANCE_DIR/ovf/product-section.xml"

echo "==> regenerating manifest + repackaging as $OUTPUT_OVA"
MF_FILE="${OVF_FILE%.ovf}.mf"
(
  cd "$(dirname "$OVF_FILE")"
  : > "$(basename "$MF_FILE")"
  for f in *.ovf *.vmdk; do
    [ -f "$f" ] || continue
    echo "SHA256($f)= $(sha256sum "$f" | awk '{print $1}')" >> "$(basename "$MF_FILE")"
  done
  tar -cf "$OUTPUT_OVA" "$(basename "$OVF_FILE")" "$(basename "$MF_FILE")" *.vmdk
)

echo "==> done: $OUTPUT_OVA"
echo "    NOT validated against a real vSphere import - test that yourself."
