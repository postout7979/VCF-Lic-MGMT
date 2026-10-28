import base64
import gzip
import json
import socket
import time

import requests
import urllib3
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

CONNECT_TIMEOUT_SECONDS = 8
REQUEST_TIMEOUT_SECONDS = 15
BROWSER_DEFAULT_TIMEOUT_MS = 30000

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


def _acquire_suite_api_token(base: str, username: str, password: str) -> str:
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


def _detect_version(base: str, token: str) -> str | None:
    """A lightweight authenticated suite-api call that doubles as an auth
    check: a bad token surfaces here as a 401 instead of silently returning
    no data later."""
    headers = {"Authorization": f"vRealizeOpsToken {token}", "Accept": "application/json"}
    try:
        resp = requests.get(
            f"{base}/suite-api/api/versions/current",
            headers=headers,
            verify=False,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise ValueError(f"VCF Operations 인증이 거부되었습니다: {exc}") from exc

    body = resp.json() if resp.content else {}
    return body.get("releaseName") or body.get("humanReadableReleaseName")


def _decode_jws_payload(compact: str) -> dict:
    """Decode the (unverified) payload segment of a compact JWS string.
    The signature is not checked - this is only used to read claims from a
    report fetched over an authenticated, TLS-protected connection to a
    trusted internal instance, not to validate a third party's claims."""
    payload_segment = compact.split(".")[1]
    payload_segment += "=" * (-len(payload_segment) % 4)
    return json.loads(base64.urlsafe_b64decode(payload_segment))


def _collect_usage_report(base: str, token: str) -> dict[tuple[str, str], int]:
    """Fetch the suite-api license usage report (the same report submitted
    every ~180 days per KB 448518 to keep the license "heartbeat" alive:
    `POST /suite-api/internal/extension/vcf-license-cloud-integration/usage/offline/report`)
    and return the latest known usage quantity per (product_name, unit of
    measure), used only as a cross-check against the web-UI-scraped figures.

    Response body is `{"gzipJwsEncodedData": <base64>, "fileName": ..., "timestamp": ...}`.
    That base64 blob is gzip-compressed, and the decompressed text is a
    compact JWS whose payload is itself a report containing a
    `jws_child_asset_usages` array of further nested compact-JWS usage
    snapshots (one per asset, per time the report was generated) - the
    newest snapshot per (asset_id, allocation_id) reflects current usage.
    This report only ever contains usage figures, never capacity/allocation,
    so it cannot replace the browser-scraped entitlement rows on its own.
    """
    now_ms = int(time.time() * 1000)
    params = {"startDate": now_ms + 24 * 3600 * 1000, "endDate": now_ms + 30 * 24 * 3600 * 1000}
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"OpsToken {token}",
        "X-Ops-API-use-unsupported": "true",
    }
    resp = requests.post(
        f"{base}/suite-api/internal/extension/vcf-license-cloud-integration/usage/offline/report",
        headers=headers,
        params=params,
        verify=False,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    resp.raise_for_status()

    body = resp.json()
    gzipped = base64.b64decode(body["gzipJwsEncodedData"])
    report = _decode_jws_payload(gzip.decompress(gzipped).decode("utf-8"))

    latest: dict[tuple[str, str], dict] = {}
    for child in report.get("jws_child_asset_usages", []):
        asset = _decode_jws_payload(child)
        asset_id = asset.get("asset_id")
        for entry in asset.get("license_usage_data", []):
            key = (asset_id, entry["allocation_id"])
            if key not in latest or entry["usage_end_time"] > latest[key]["usage_end_time"]:
                latest[key] = entry

    totals: dict[tuple[str, str], int] = {}
    for entry in latest.values():
        product_key = (entry["product_name"], entry["uom"])
        totals[product_key] = totals.get(product_key, 0) + (entry.get("quantity") or 0)
    return totals


def _collect_entitlements_via_browser(base: str, username: str, password: str) -> list[dict]:
    """Log in to the VCF Operations *web UI* and collect the per-product
    core/TiB license entitlement rows shown on Manage > Licensing >
    Licenses & Registration.

    That page's data comes from a UI-internal REST endpoint
    (`/vcf-operations/rest/ops/internal/extension/vcf-entitlement/entitlements/query`)
    that is only reachable through a real, fully bootstrapped browser
    session (a suite-api token, or a hand-replicated cookie/CSRF-header
    combination, both returned 400s in testing) - logging in through the UI
    also establishes a second, nested "platform" session beyond the initial
    one, which calling the REST endpoint directly skips. A headless
    Chromium instance is used here to log in and navigate exactly like a
    real user, then the page's own XHR response for that endpoint is
    captured rather than re-issuing our own request (a manual GET to the
    same URL after login was rejected with 405, most likely due to extra
    validation Angular's HttpClient attaches that wasn't reverse-engineered).
    """
    captured: dict = {}

    def on_response(resp):
        if "/vcf-entitlement/entitlements/query" in resp.url and resp.status == 200:
            try:
                captured["body"] = resp.json()
            except Exception:
                pass

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--ignore-certificate-errors"])
            try:
                context = browser.new_context(ignore_https_errors=True)
                page = context.new_page()
                page.set_default_timeout(BROWSER_DEFAULT_TIMEOUT_MS)
                # A concurrent-session warning (from repeated syncs) shows as
                # a confirm() dialog in the browser; accept it like a user
                # clicking "OK" so the login can proceed with forceLogin.
                page.on("dialog", lambda d: d.accept())
                page.on("response", on_response)

                page.goto(f"{base}/ui/login.action?vcf=1", wait_until="domcontentloaded")
                page.wait_for_timeout(1500)

                # Default "Login Method" is VCF SSO, which hides the
                # username/password fields; switch to Local Account first.
                page.click("#authSelector-inputEl")
                page.wait_for_timeout(500)
                page.get_by_text("Local Account", exact=True).click()
                page.wait_for_timeout(500)
                page.fill("#userName-inputEl", username)
                page.fill("#password-inputEl", password)
                page.click("text=LOG IN")
                page.wait_for_timeout(5000)

                if "login.action" in page.url:
                    raise ValueError("VCF Operations 로그인에 실패했습니다 (아이디/비밀번호를 확인하세요).")

                # Navigate to Manage > Licensing > Licenses & Registration;
                # this is what triggers the entitlements/query call.
                page.get_by_text("Manage", exact=True).click()
                page.wait_for_timeout(1500)
                page.get_by_text("Licensing", exact=True).click()
                page.wait_for_timeout(1500)
                page.get_by_text("Licenses & Registration", exact=True).click()
                page.wait_for_timeout(5000)
            finally:
                browser.close()
    except PlaywrightTimeoutError as exc:
        raise ValueError(f"VCF Operations 웹 UI 탐색이 지연되어 라이센스 정보를 가져오지 못했습니다: {exc}") from exc

    body = captured.get("body")
    if not body:
        # Login/navigation succeeded but the UI's own layout or route may
        # have changed since this was written - degrade to an empty list
        # rather than failing the whole sync, since the connection itself
        # (and its detected version) is still valid.
        return []

    rows: list[dict] = []
    for entry in body.get("entitlementWithVcentersDetails", []):
        info = entry.get("entitlementInfo", {})
        vcenters = entry.get("assignedVcenters", [])
        license_key = info.get("productDisplayName") or info.get("name")
        license_type = f"{info.get('type', '-')} ({info.get('unitOfMeasure', '-')})"
        core_capacity = info.get("capacity")
        # vcAdapterName on an issue identifies which vCenter it's about (eg.
        # "UNLICENSED_ASSET" for that domain specifically); fall back to
        # unlicensedUsage below for vCenters an issue entry doesn't name.
        issue_vcenters = {
            issue.get("vcAdapterName") for issue in (info.get("issues") or []) if issue.get("vcAdapterName")
        }

        if not vcenters:
            rows.append(
                {
                    "license_key": license_key,
                    "license_type": license_type,
                    "license_status": "이슈 있음" if info.get("issues") else "정상",
                    "domain_name": None,
                    "core_capacity": core_capacity,
                    "core_used": info.get("usage"),
                }
            )
            continue

        # One row per vCenter this license is assigned to (matches the
        # product UI's own "vCenter Systems" breakdown under a license),
        # rather than one combined row per license with domain names joined
        # together - core_capacity is still the entitlement's total pool
        # (shared across its vCenters), but core_used here is that vCenter's
        # own licensedUsage.
        for v in vcenters:
            vcenter_info = v.get("vcenterInfo", {})
            domain_name = vcenter_info.get("adapterName") or vcenter_info.get("host") or "?"
            has_issue = (v.get("unlicensedUsage") or 0) > 0 or domain_name in issue_vcenters
            rows.append(
                {
                    "license_key": license_key,
                    "license_type": license_type,
                    "license_status": "이슈 있음" if has_issue else "정상",
                    "domain_name": domain_name,
                    "core_capacity": core_capacity,
                    "core_used": v.get("licensedUsage"),
                }
            )
    return rows


def collect_core_license_usage(host: str, username: str, password: str) -> tuple[str | None, list[dict]]:
    """Log in to VCF 9 Operations and collect core license allocation/usage
    rows (the same data shown on Manage > Licensing > Licenses & Registration).

    Returns (detected_version, rows). Raises ValueError on a connection or
    authentication failure.
    """
    _check_reachable(host)
    base = f"https://{host}"

    suite_api_token = _acquire_suite_api_token(base, username, password)
    detected_version = _detect_version(base, suite_api_token)
    rows = _collect_entitlements_via_browser(base, username, password)

    try:
        usage_totals = _collect_usage_report(base, suite_api_token)
    except (requests.RequestException, KeyError, ValueError):
        # Supplementary cross-check only; its absence must not fail the sync.
        usage_totals = {}

    for row in rows:
        uom = (row.get("license_type") or "").rsplit("(", 1)[-1].rstrip(")")
        license_key = (row.get("license_key") or "").lower()
        row["verified_core_used"] = next(
            (
                quantity
                for (product_name, product_uom), quantity in usage_totals.items()
                if product_uom == uom and license_key.startswith(product_name.lower())
            ),
            None,
        )

    return detected_version, rows
