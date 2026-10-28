# VCF License Management - appliance scaffold

Everything here supports turning this app into a Photon-OS-based OVA that,
when imported into vSphere, lets the deploying admin set the guest's
hostname, IP address, subnet mask, gateway, DNS servers, DNS search
domains, NTP servers, and root password through the standard "Deploy OVF
Template" wizard - the same mechanism VCSA, NSX Manager, and most other
VMware appliances use.

## What's actually been verified vs. what hasn't

This was built and tested from a plain Ubuntu VM with Docker but **no
`/dev/kvm`, no `ovftool`, and no vCenter/ESXi access** - so there was no
way to build or deploy-test a real OVA end-to-end. Here's exactly what
that means for each piece:

| Piece | Status |
|---|---|
| `docker/frontend/Dockerfile.prod`, `nginx.conf`, `docker-compose.prod.yml` | **Tested.** Built the image, brought the full stack up, confirmed the SPA loads over HTTPS and `/api/` correctly proxies to the backend. |
| `build/merge-ovf-properties.py` | **Tested** against a synthetic sample OVF (`build/sample.ovf`, run via `build/test-merge.sh`) - confirmed it inserts `ProductSection` in the right place with well-formed XML. **Not** tested against a real vCenter/ovftool export, which may format things slightly differently. |
| `guest/ovf-customize.sh` | Syntax-checked, and the netmask→CIDR conversion logic unit-tested directly. The parts that call `vmware-rpctool`, `hostnamectl`, `systemd-networkd`, and `chpasswd` are **not** tested - there's no Photon OS guest here to run them against. |
| `ovf/product-section.xml` | Schema-correct per the OVF 1.x/2.x spec; **not** validated against a real `ovftool`/vCenter import. |
| `build/build-ova.sh` | **Not run.** Needs `qemu-nbd`, the `nbd` kernel module, and root - none available here. Also assumes the base OVA's root filesystem is on its 2nd partition, which you need to verify against whatever base image you actually use. |

Short version: the Docker/production-stack half is solid and proven. The
OVA-assembly half is a carefully-written, best-effort scaffold that you
need to run and validate yourself on a machine with real virtualization
access - it's the part that fundamentally can't be tested blind.

## Layout

```
appliance/
  ovf/
    product-section.xml       vApp Properties fragment (the 8 fields)
  guest/
    ovf-customize.sh           first-boot script: reads the properties, applies them
    ovf-customize.service      systemd unit that runs the script before networking comes up
  docker/
    frontend/
      Dockerfile.prod           nginx-served production build (vs. the Vite dev server in frontend/Dockerfile)
      nginx.conf
    docker-compose.prod.yml      production stack (db + backend + nginx frontend), ports 80/443 only
    vcf-lic-mgmt.service         host-level systemd unit: `docker compose up -d` on boot
  build/
    build-ova.sh                 reference script that assembles the final .ova
    merge-ovf-properties.py      merges product-section.xml into a real .ovf
    sample.ovf, test-merge.sh    synthetic OVF + test for the merge script
```

## How the properties actually reach the guest

1. The OVF's `ProductSection` declares 8 `<Property>` elements, each keyed
   `guestinfo.<name>` (`guestinfo.hostname`, `guestinfo.ipaddress`,
   `guestinfo.netmask`, `guestinfo.gateway`, `guestinfo.dns`,
   `guestinfo.dnssearch`, `guestinfo.ntp`, `guestinfo.rootpw`).
2. vSphere's deploy wizard shows these as input fields, and writes
   whatever the admin enters into the VM's `guestinfo.*` namespace via
   VMware Tools - but **only if** the source VM's vApp Options have
   "VMware Tools" enabled as an OVF environment transport. This is a
   per-VM setting on whatever VM you export from; it's not something
   baked into the OVF XML alone.
3. Inside the guest, `ovf-customize.service` runs `ovf-customize.sh` once
   on first boot (guarded by `/etc/.ovf-customized`), which reads each
   value with `vmware-rpctool "info-get guestinfo.<name>"` and applies
   it: `hostnamectl`, a static `systemd-networkd` config, a
   `systemd-timesyncd.conf` NTP line, and `chpasswd` for root.

## Steps to actually produce and test the OVA

1. **Get a base Photon OS OVA.** Download the official one from your
   organization's verified VMware/Broadcom source - deliberately not
   hardcoded anywhere in this scaffold.
2. **Build the production image locally first** (cheap, no vSphere
   needed) to make sure nothing in the app itself is broken:
   ```
   docker build -f appliance/docker/frontend/Dockerfile.prod -t frontend-prod .
   docker compose -f appliance/docker/docker-compose.prod.yml up -d
   curl -k https://localhost/api/v1/brand/info   # should return JSON, not an error
   ```
3. **Run `build/test-merge.sh`** to confirm the OVF merge logic still
   produces well-formed XML in your environment too.
4. **On a machine with root, `qemu-utils`, and the `nbd` kernel module**
   (this sandbox had none of these), run:
   ```
   sudo appliance/build/build-ova.sh <base-photon.ova> <path-to-this-repo> vcf-lic-mgmt.ova
   ```
   Before trusting it, check `fdisk -l /dev/nbd0` against the base image
   to confirm the root partition really is `p2` - adjust the script if
   not.
5. **Validate the OVF** with `ovftool vcf-lic-mgmt.ova` (it does schema
   validation) before importing anywhere.
6. **Deploy to a real vSphere environment**, fill in the property
   fields in the wizard, and confirm on first boot that hostname/IP/DNS/
   NTP/root password all actually land correctly. This last step is the
   one piece of the whole chain that truly cannot be verified without
   vCenter/ESXi access - do it carefully, ideally on a throwaway VM
   first.

## Known gaps to be aware of

- `ovf-customize.sh` assumes the guest's only NIC is whatever
  `/sys/class/net` lists first (excluding `lo`). Fine for a single-NIC
  appliance; revisit if you ever add a second interface.
- It doesn't remove a pre-existing DHCP `.network` file by a name other
  than `10-dhcp-en.network` - check what the base OVA actually ships
  before relying on that cleanup line.
- `build-ova.sh` doesn't grow the base image's disk to fit Docker +
  this app's images. If the base OVA's disk is small, you'll likely
  need to resize the `.vmdk` (`qemu-img resize`) and the guest
  filesystem before `rsync`-ing the app in.
