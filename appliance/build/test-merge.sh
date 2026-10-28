#!/bin/bash
# Sanity check for merge-ovf-properties.py: runs it against sample.ovf (a
# synthetic, structurally-representative OVF) and confirms the result is
# well-formed XML with the ProductSection in the expected place. This is
# NOT a substitute for validating against a real exported .ovf with
# `ovftool` - it only proves the merge script's XML handling works.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

tmp="$(mktemp)"
cp sample.ovf "$tmp"
python3 merge-ovf-properties.py "$tmp" ../ovf/product-section.xml

python3 - "$tmp" <<'EOF'
import sys
import xml.etree.ElementTree as ET

OVF_NS = "http://schemas.dmtf.org/ovf/envelope/1"
tree = ET.parse(sys.argv[1])
vs = tree.getroot().find(f".//{{{OVF_NS}}}VirtualSystem")
tags = [c.tag.split('}')[-1] for c in vs]
assert tags == ["Info", "Name", "OperatingSystemSection", "ProductSection", "VirtualHardwareSection"], tags
props = vs.find(f"{{{OVF_NS}}}ProductSection").findall(f"{{{OVF_NS}}}Property")
assert len(props) == 8, f"expected 8 properties, got {len(props)}"
print("OK: ProductSection placed correctly with all 8 properties")
EOF

rm -f "$tmp"
