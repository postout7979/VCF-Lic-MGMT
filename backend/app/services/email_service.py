import socket
from contextlib import contextmanager
from datetime import datetime, timezone
from email.mime.text import MIMEText
from email.utils import format_datetime

import smtplib

from sqlalchemy.orm import Session

from app.models.network_settings import NetworkSettings
from app.models.smtp_settings import SmtpSettings


class EmailNotConfiguredError(Exception):
    pass


def _get_settings(db: Session) -> SmtpSettings:
    settings = db.get(SmtpSettings, 1)
    if settings is None or not settings.host or not settings.from_address:
        raise EmailNotConfiguredError(
            "SMTP 설정이 아직 구성되지 않았습니다. 설정 > SMTP 메뉴에서 먼저 구성해주세요."
        )
    return settings


@contextmanager
def _dns_override(dns_server: str | None):
    """Temporarily resolve hostnames via the configured DNS server instead
    of the system resolver, for the duration of the SMTP connection. Only
    the address lookup is rerouted - the original hostname is still what's
    passed to smtplib, so TLS SNI/certificate checks are unaffected.

    NOTE: this patches socket.getaddrinfo process-wide, so it isn't safe
    against another concurrent outbound connection racing inside the same
    `with` block. Acceptable here given how infrequently this app sends
    mail (password resets, occasional test sends)."""
    if not dns_server:
        yield
        return

    import dns.resolver

    resolver = dns.resolver.Resolver(configure=False)
    resolver.nameservers = [dns_server]
    original_getaddrinfo = socket.getaddrinfo

    def patched_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        try:
            answer = resolver.resolve(host, "A")
            resolved_ip = str(answer[0])
        except Exception:
            return original_getaddrinfo(host, port, family, type, proto, flags)
        return original_getaddrinfo(resolved_ip, port, family, type, proto, flags)

    socket.getaddrinfo = patched_getaddrinfo
    try:
        yield
    finally:
        socket.getaddrinfo = original_getaddrinfo


def _ntp_now(ntp_server: str | None) -> datetime:
    """Best-effort current time from the configured NTP server, used for
    the outgoing message's Date header; falls back to the local clock if
    the server isn't configured or can't be reached."""
    if not ntp_server:
        return datetime.now(timezone.utc)
    try:
        import ntplib

        response = ntplib.NTPClient().request(ntp_server, version=3, timeout=5)
        return datetime.fromtimestamp(response.tx_time, tz=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def send_email(db: Session, to_address: str, subject: str, body: str) -> None:
    settings = _get_settings(db)
    network = db.get(NetworkSettings, 1)
    dns_server = network.dns_server if network else None
    ntp_server = network.ntp_server if network else None

    message = MIMEText(body, "plain", "utf-8")
    message["Subject"] = subject
    message["From"] = settings.from_address
    message["To"] = to_address
    message["Date"] = format_datetime(_ntp_now(ntp_server))

    with _dns_override(dns_server):
        with smtplib.SMTP(settings.host, settings.port, timeout=10) as server:
            if settings.use_tls:
                server.starttls()
            if settings.username:
                server.login(settings.username, settings.password)
            server.sendmail(settings.from_address, [to_address], message.as_string())
