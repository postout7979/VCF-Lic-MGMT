#!/bin/bash
# First-boot guest customization: reads the vApp Properties defined in
# ../ovf/product-section.xml (delivered via VMware Tools' guestinfo.*
# namespace) and applies them to the running Ubuntu Server guest.
#
# Idempotent: exits immediately if /etc/.ovf-customized already exists,
# so it only ever does anything on the VM's true first boot after a
# fresh OVA deployment. Intended to run via ovf-customize.service
# (see that file in this same directory) before networking comes up.
#
# Requires open-vm-tools (specifically `vmware-rpctool`) to be installed
# in the guest image - see ../build/build-ova.sh.
#
# Built and tested on an Ubuntu 26.04 Server (minimal) image - see
# appliance/README.md for exactly what's been verified vs. what you
# still need to validate on a real vSphere deployment.

set -euo pipefail

MARKER=/etc/.ovf-customized
LOG_TAG="ovf-customize"

log() { logger -t "$LOG_TAG" -- "$*"; echo "[$LOG_TAG] $*"; }

if [ -e "$MARKER" ]; then
  log "already customized, skipping"
  exit 0
fi

if ! command -v vmware-rpctool >/dev/null 2>&1; then
  log "vmware-rpctool not found (open-vm-tools missing?) - skipping customization"
  exit 0
fi

get_prop() {
  # Reads one guestinfo.<key> value; prints nothing (not an error) if unset.
  vmware-rpctool "info-get guestinfo.$1" 2>/dev/null || true
}

HOSTNAME_VAL="$(get_prop hostname)"
IP_VAL="$(get_prop ipaddress)"
NETMASK_VAL="$(get_prop netmask)"
GATEWAY_VAL="$(get_prop gateway)"
DNS_VAL="$(get_prop dns)"
DNSSEARCH_VAL="$(get_prop dnssearch)"
NTP_VAL="$(get_prop ntp)"
ROOTPW_VAL="$(get_prop rootpw)"

# --- hostname -----------------------------------------------------------
if [ -n "$HOSTNAME_VAL" ]; then
  log "setting hostname to $HOSTNAME_VAL"
  hostnamectl set-hostname "$HOSTNAME_VAL"
fi

# --- netmask -> CIDR prefix ----------------------------------------------
netmask_to_prefix() {
  local mask="$1" prefix=0 octet
  IFS=. read -r a b c d <<<"$mask"
  for octet in "$a" "$b" "$c" "$d"; do
    case "$octet" in
      255) prefix=$((prefix + 8)) ;;
      254) prefix=$((prefix + 7)) ;; 252) prefix=$((prefix + 6)) ;;
      248) prefix=$((prefix + 5)) ;; 240) prefix=$((prefix + 4)) ;;
      224) prefix=$((prefix + 3)) ;; 192) prefix=$((prefix + 2)) ;;
      128) prefix=$((prefix + 1)) ;; 0) ;;
      *) echo "24"; return ;; # unrecognized mask, fall back to a sane default
    esac
  done
  echo "$prefix"
}

# --- static network (netplan, Ubuntu's default network config frontend) -
if [ -n "$IP_VAL" ]; then
  IFACE="$(ls /sys/class/net | grep -v '^lo$' | head -n1)"
  if [ -z "$IFACE" ]; then
    log "no network interface found, skipping network config"
  else
    PREFIX="$(netmask_to_prefix "${NETMASK_VAL:-255.255.255.0}")"
    log "configuring $IFACE as ${IP_VAL}/${PREFIX}, gateway ${GATEWAY_VAL:-none}"

    {
      echo "network:"
      echo "  version: 2"
      echo "  ethernets:"
      echo "    $IFACE:"
      echo "      dhcp4: false"
      echo "      addresses: [${IP_VAL}/${PREFIX}]"
      if [ -n "$GATEWAY_VAL" ]; then
        echo "      routes:"
        echo "        - to: default"
        echo "          via: $GATEWAY_VAL"
      fi
      if [ -n "$DNS_VAL" ] || [ -n "$DNSSEARCH_VAL" ]; then
        echo "      nameservers:"
        if [ -n "$DNS_VAL" ]; then
          IFS=',' read -ra dns_servers <<<"$DNS_VAL"
          printf '        addresses: ['
          printf '%s' "${dns_servers[0]}"
          for d in "${dns_servers[@]:1}"; do printf ', %s' "$d"; done
          echo ']'
        fi
        if [ -n "$DNSSEARCH_VAL" ]; then
          IFS=',' read -ra search_domains <<<"$DNSSEARCH_VAL"
          printf '        search: ['
          printf '%s' "${search_domains[0]}"
          for s in "${search_domains[@]:1}"; do printf ', %s' "$s"; done
          echo ']'
        fi
      fi
    } > /etc/netplan/90-ovf-static.yaml
    chmod 600 /etc/netplan/90-ovf-static.yaml
    # The image's default DHCP config (01-netcfg.yaml) would otherwise
    # conflict with this static one.
    rm -f /etc/netplan/01-netcfg.yaml
  fi
fi

# --- NTP (systemd-timesyncd, Ubuntu's default) ---------------------------
if [ -n "$NTP_VAL" ]; then
  log "setting NTP servers: $NTP_VAL"
  NTP_LINE="$(echo "$NTP_VAL" | tr ',' ' ')"
  if [ -f /etc/systemd/timesyncd.conf ]; then
    sed -i "s/^#\?NTP=.*/NTP=$NTP_LINE/" /etc/systemd/timesyncd.conf
    grep -q '^NTP=' /etc/systemd/timesyncd.conf || echo "NTP=$NTP_LINE" >> /etc/systemd/timesyncd.conf
  else
    printf '[Time]\nNTP=%s\n' "$NTP_LINE" > /etc/systemd/timesyncd.conf
  fi
fi

# --- root password --------------------------------------------------------
if [ -n "$ROOTPW_VAL" ]; then
  log "setting root password"
  echo "root:${ROOTPW_VAL}" | chpasswd
fi

touch "$MARKER"
log "customization complete"

# Apply network/NTP changes now rather than waiting for the next boot.
netplan apply 2>/dev/null || true
systemctl restart systemd-timesyncd 2>/dev/null || true
