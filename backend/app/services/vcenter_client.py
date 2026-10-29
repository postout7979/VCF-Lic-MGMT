import socket
import ssl

from pyVim.connect import Disconnect, SmartConnect
from pyVmomi import vim

SUPPORTED_MAJOR_VERSIONS = {"7", "8"}
CONNECT_TIMEOUT_SECONDS = 8


def _check_reachable(host: str, port: int = 443) -> None:
    try:
        with socket.create_connection((host, port), timeout=CONNECT_TIMEOUT_SECONDS):
            return
    except OSError as exc:
        raise ValueError(f"vCenter 서버({host}:{port})에 연결할 수 없습니다: {exc}") from exc


def _license_category_from_cost_unit(cost_unit: str | None) -> str:
    """Perpetual vSphere licenses are sold per-CPU ("cpuPackage"); term
    licenses (introduced with VCF) are sold per-core. The cost unit vCenter
    reports is the reliable signal for this - not whether an expirationDate
    happens to be set, which some per-core entitlements leave unset too."""
    return "PERPETUAL" if cost_unit == "cpuPackage" else "SUBSCRIPTION"


def _collect_licenses(si) -> list[dict]:
    """Reads the vCenter-wide license entitlements (key -> total/used quantity)
    from the License Manager, independent of which hosts consume them."""
    try:
        licenses = si.content.licenseManager.licenses
    except Exception:
        return []

    rows: list[dict] = []
    for lic in licenses:
        # The unset/eval slot reports as an all-zero key with no entitlement;
        # skip it so only real, assigned licenses are shown.
        if not lic.licenseKey or not lic.total:
            continue
        props = {p.key: p.value for p in (lic.properties or [])}
        expiration = props.get("expirationDate")
        rows.append(
            {
                "license_key": lic.licenseKey,
                "product_name": props.get("ProductName") or lic.name,
                "cost_unit": lic.costUnit,
                "total": lic.total,
                "used": lic.used,
                "license_category": _license_category_from_cost_unit(lic.costUnit),
                # vCenter reports this as a datetime; only the calendar date matters here.
                "expiration_date": expiration.date() if hasattr(expiration, "date") else expiration,
            }
        )
    return rows


def collect_inventory(
    host: str, username: str, password: str, verify_tls: bool = False
) -> tuple[str, list[dict], list[dict]]:
    """Connect to a vCenter (7.x/8.x) and collect per-host hardware/license
    assignment info, plus the vCenter-wide license entitlement quantities.

    Returns (detected_version, inventory_rows, license_rows). Raises
    ValueError on any connection failure or unsupported server version.
    """
    _check_reachable(host)

    # Internal vCenters are commonly self-signed; certificate validation is
    # skipped unless the connection was explicitly configured to require it.
    ssl_context = ssl.create_default_context() if verify_tls else ssl._create_unverified_context()

    try:
        si = SmartConnect(host=host, user=username, pwd=password, sslContext=ssl_context)
    except Exception as exc:
        raise ValueError(f"vCenter 연결 실패: {exc}") from exc

    try:
        about = si.content.about
        detected_version = about.version
        major = detected_version.split(".")[0]
        if major not in SUPPORTED_MAJOR_VERSIONS:
            raise ValueError(f"지원하지 않는 vCenter 버전입니다: {detected_version} (7.x/8.x만 지원)")

        try:
            license_assignment_manager = si.content.licenseManager.licenseAssignmentManager
        except Exception:
            license_assignment_manager = None

        inventory: list[dict] = []
        container = si.content.viewManager.CreateContainerView(
            si.content.rootFolder, [vim.ComputeResource], True
        )
        try:
            for compute_resource in container.view:
                cluster_name = compute_resource.name
                for host_system in compute_resource.host:
                    cpu_info = host_system.hardware.cpuInfo if host_system.hardware else None
                    cpu_sockets = cpu_info.numCpuPackages if cpu_info else None
                    total_cores = cpu_info.numCpuCores if cpu_info else None
                    cores_per_socket = (
                        total_cores // cpu_sockets
                        if cpu_sockets and total_cores
                        else None
                    )

                    license_key = None
                    license_category = None
                    if license_assignment_manager is not None:
                        try:
                            assignments = license_assignment_manager.QueryAssignedLicenses(
                                entityId=host_system._moId
                            )
                            if assignments:
                                assigned = assignments[0].assignedLicense
                                license_key = assigned.licenseKey
                                license_category = _license_category_from_cost_unit(assigned.costUnit)
                        except Exception:
                            license_key = None
                            license_category = None

                    inventory.append(
                        {
                            "cluster_name": cluster_name,
                            "host_name": host_system.name,
                            "cpu_sockets": cpu_sockets,
                            "cores_per_socket": cores_per_socket,
                            "total_cores": total_cores,
                            "license_key": license_key,
                            "license_category": license_category,
                        }
                    )
        finally:
            container.Destroy()

        license_rows = _collect_licenses(si)
        return detected_version, inventory, license_rows
    finally:
        Disconnect(si)
