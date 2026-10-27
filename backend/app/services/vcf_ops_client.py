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


def _acquire_token(base: str, username: str, password: str) -> str:
    """Log in with username/password via the Aria/VCF Operations suite-api
    and return a session token.

    This is the product's actual, documented login endpoint
    (`POST /suite-api/api/auth/token/acquire`). An earlier version of this
    client mistakenly called SDDC Manager's `/v1/tokens` endpoint, which
    belongs to a different VCF component and is why login was failing.
    """
    try:
        resp = requests.post(
            f"{base}/suite-api/api/auth/token/acquire",
            json={"username": username, "password": password},
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            verify=False,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise ValueError(f"VCF Operations 인증에 실패했습니다: {exc}") from exc

    body = resp.json() if resp.content else {}
    token = body.get("token")
    if not token:
        raise ValueError("VCF Operations 인증 응답에 token이 없습니다.")
    return token


def collect_core_license_usage(
    host: str,
    auth_method: str,
    username: str | None = None,
    password: str | None = None,
    api_token: str | None = None,
) -> tuple[str | None, list[dict]]:
    """Log in to VCF 9 Operations (via credentials or a pre-issued API
    token) and collect core license allocation/usage rows.

    Returns (detected_version, rows). Raises ValueError on a connection or
    authentication failure. The license rows themselves are collected via a
    best-effort resource/stat lookup (VCF Operations surfaces license
    consumption as resource stats rather than a dedicated endpoint, and the
    exact resource kind / stat key names are version-specific and weren't
    confirmed against a live VCF 9 environment) — a failure or empty result
    at that stage does not fail the sync, since auth succeeding is the part
    that matters for "connected" status; adjust the resource/stat matching
    below once the real key names for this environment are known.
    """
    _check_reachable(host)
    base = f"https://{host}"

    if auth_method == "token":
        if not api_token:
            raise ValueError("API 토큰이 설정되지 않았습니다.")
        token = api_token
    else:
        if not username or not password:
            raise ValueError("사용자 이름과 비밀번호가 설정되지 않았습니다.")
        token = _acquire_token(base, username, password)

    headers = {"Authorization": f"vRealizeOpsToken {token}", "Accept": "application/json"}

    # A lightweight authenticated call doubles as an auth check: a bad token
    # surfaces here as a 401 instead of silently returning no data later.
    try:
        version_resp = requests.get(
            f"{base}/suite-api/api/versions/current",
            headers=headers,
            verify=False,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        version_resp.raise_for_status()
    except requests.RequestException as exc:
        raise ValueError(f"VCF Operations 인증이 거부되었습니다: {exc}") from exc

    version_body = version_resp.json() if version_resp.content else {}
    detected_version = version_body.get("releaseName") or version_body.get("humanReadableReleaseName")

    rows: list[dict] = []
    try:
        res_resp = requests.get(
            f"{base}/suite-api/api/resources",
            headers=headers,
            params={"pageSize": 1000},
            verify=False,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        res_resp.raise_for_status()
        resources = (res_resp.json() or {}).get("resourceList", [])
        license_resources = [
            r
            for r in resources
            if "licens" in (r.get("resourceKey", {}).get("resourceKindKey") or "").lower()
        ]

        for res in license_resources:
            resource_id = res.get("identifier")
            resource_key = res.get("resourceKey", {})
            stats_resp = requests.get(
                f"{base}/suite-api/api/resources/{resource_id}/stats/latest",
                headers=headers,
                verify=False,
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            if not stats_resp.ok:
                continue

            stat_values: dict[str, float] = {}
            for entry in (stats_resp.json() or {}).get("values", []):
                for stat in entry.get("stat-list", {}).get("stat", []):
                    key = stat.get("statKey", {}).get("key", "")
                    data = stat.get("data") or []
                    if data:
                        stat_values[key] = data[-1]

            core_capacity = next(
                (
                    v
                    for k, v in stat_values.items()
                    if "core" in k.lower() and ("cap" in k.lower() or "total" in k.lower())
                ),
                None,
            )
            core_used = next(
                (
                    v
                    for k, v in stat_values.items()
                    if "core" in k.lower() and ("used" in k.lower() or "consum" in k.lower())
                ),
                None,
            )
            if core_capacity is None and core_used is None:
                continue

            rows.append(
                {
                    "license_key": None,
                    "license_type": resource_key.get("resourceKindKey"),
                    "license_status": (res.get("resourceStatusStates") or [{}])[0].get("resourceStatus"),
                    "domain_name": resource_key.get("name"),
                    "core_capacity": int(core_capacity) if core_capacity is not None else None,
                    "core_used": int(core_used) if core_used is not None else None,
                }
            )
    except requests.RequestException:
        rows = []

    return detected_version, rows
