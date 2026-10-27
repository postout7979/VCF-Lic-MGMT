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


def collect_inventory(host: str, username: str, password: str) -> tuple[str, list[dict]]:
    """Connect to a vCenter (7.x/8.x) and collect per-host license/hardware info.

    Returns (detected_version, inventory_rows). Raises ValueError on any
    connection failure or unsupported server version.
    """
    _check_reachable(host)

    # Internal vCenters are commonly self-signed; certificate validation is
    # intentionally skipped here rather than requiring a trusted CA bundle.
    ssl_context = ssl._create_unverified_context()

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

        vcenter_name = about.fullName

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
                    if license_assignment_manager is not None:
                        try:
                            assignments = license_assignment_manager.QueryAssignedLicenses(
                                entityId=host_system._moId
                            )
                            if assignments:
                                license_key = assignments[0].assignedLicense.licenseKey
                        except Exception:
                            license_key = None

                    inventory.append(
                        {
                            "vcenter_name": vcenter_name,
                            "cluster_name": cluster_name,
                            "host_name": host_system.name,
                            "cpu_sockets": cpu_sockets,
                            "cores_per_socket": cores_per_socket,
                            "total_cores": total_cores,
                            "license_key": license_key,
                        }
                    )
        finally:
            container.Destroy()

        return detected_version, inventory
    finally:
        Disconnect(si)
