import socket

import requests
import urllib3

CONNECT_TIMEOUT_SECONDS = 8
REQUEST_TIMEOUT_SECONDS = 15

# Internal VCF Operations instances commonly use self-signed certificates;
# certificate validation is intentionally skipped below rather than requiring
# a trusted CA bundle, so the resulting warning is silenced here.
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def _check_reachable(host: str, port: int = 443) -> None:
    try:
        with socket.create_connection((host, port), timeout=CONNECT_TIMEOUT_SECONDS):
            return
    except OSError as exc:
        raise ValueError(f"VCF Operations 서버({host}:{port})에 연결할 수 없습니다: {exc}") from exc


def collect_core_license_usage(host: str, username: str, password: str) -> tuple[str | None, list[dict]]:
    """Authenticate against VCF 9 Operations and collect core license
    allocation/usage rows.

    This targets the documented SDDC Manager-style token auth
    (`POST /v1/tokens`) and license inventory (`GET /v1/licenses`) endpoints,
    reading several likely field-name variants defensively since VCF 9
    Operations' exact REST surface for core-based licensing was not
    confirmed against a live environment. If sync fails with a 404 or an
    unexpected response shape, the endpoint path / field keys below are the
    first thing to adjust against the target environment's actual API docs.

    Returns (detected_version, rows). Raises ValueError on any connection,
    auth, or request failure.
    """
    _check_reachable(host)
    base = f"https://{host}"

    try:
        auth_resp = requests.post(
            f"{base}/v1/tokens",
            json={"username": username, "password": password},
            verify=False,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        auth_resp.raise_for_status()
    except requests.RequestException as exc:
        raise ValueError(f"VCF Operations 인증에 실패했습니다: {exc}") from exc

    auth_body = auth_resp.json() if auth_resp.content else {}
    token = auth_body.get("accessToken")
    if not token:
        raise ValueError("VCF Operations 인증 응답에 accessToken이 없습니다.")

    headers = {"Authorization": f"Bearer {token}"}

    detected_version = None
    try:
        version_resp = requests.get(
            f"{base}/v1/releases/domains", headers=headers, verify=False, timeout=REQUEST_TIMEOUT_SECONDS
        )
        if version_resp.ok:
            body = version_resp.json()
            elements = body.get("elements", body if isinstance(body, list) else [])
            if elements:
                detected_version = elements[0].get("version")
    except requests.RequestException:
        detected_version = None

    try:
        lic_resp = requests.get(
            f"{base}/v1/licenses", headers=headers, verify=False, timeout=REQUEST_TIMEOUT_SECONDS
        )
        lic_resp.raise_for_status()
    except requests.RequestException as exc:
        raise ValueError(f"라이센스 정보를 가져오지 못했습니다: {exc}") from exc

    payload = lic_resp.json() if lic_resp.content else []
    raw_items = payload.get("elements", payload if isinstance(payload, list) else []) if isinstance(payload, dict) else payload

    rows: list[dict] = []
    for lic in raw_items:
        rows.append(
            {
                "license_key": lic.get("key") or lic.get("licenseKeyValue"),
                "license_type": lic.get("licenseType") or lic.get("productType"),
                "license_status": lic.get("status"),
                "domain_name": lic.get("domainName") or lic.get("domainId"),
                "core_capacity": lic.get("count") or lic.get("capacity") or lic.get("coreCapacity"),
                "core_used": lic.get("consumedCount") or lic.get("usage") or lic.get("coreUsage"),
            }
        )
    return detected_version, rows
