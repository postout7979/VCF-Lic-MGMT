#!/usr/bin/env python3
"""Merges appliance/ovf/product-section.xml's <ProductSection> into a real
exported .ovf descriptor, inserted inside the first <VirtualSystem>
element right after <OperatingSystemSection> - where both the OVF spec
and vCenter's own exports put it. Modifies the .ovf file in place.

Tested against a synthetic sample OVF (see appliance/build/test-merge.sh),
not against a real vCenter/ovftool export - inspect the result before
trusting it blindly.
"""
import sys
import xml.etree.ElementTree as ET

OVF_NS = "http://schemas.dmtf.org/ovf/envelope/1"
ET.register_namespace("", OVF_NS)
ET.register_namespace("ovf", OVF_NS)


def qn(tag: str) -> str:
    return f"{{{OVF_NS}}}{tag}"


def main(ovf_path: str, fragment_path: str) -> None:
    tree = ET.parse(ovf_path)
    root = tree.getroot()

    virtual_system = root.find(f".//{qn('VirtualSystem')}")
    if virtual_system is None:
        raise SystemExit("no <VirtualSystem> found in " + ovf_path)

    if virtual_system.find(qn("ProductSection")) is not None:
        print("ProductSection already present - leaving the OVF untouched.")
        return

    fragment_tree = ET.parse(fragment_path)
    product_section = fragment_tree.getroot()

    os_section = virtual_system.find(qn("OperatingSystemSection"))
    children = list(virtual_system)
    insert_at = children.index(os_section) + 1 if os_section is not None else len(children)
    virtual_system.insert(insert_at, product_section)

    tree.write(ovf_path, xml_declaration=True, encoding="UTF-8")
    print(f"merged ProductSection into {ovf_path}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(f"usage: {sys.argv[0]} <file.ovf> <product-section.xml>")
    main(sys.argv[1], sys.argv[2])
