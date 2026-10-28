import smtplib
from email.mime.text import MIMEText

from sqlalchemy.orm import Session

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


def send_email(db: Session, to_address: str, subject: str, body: str) -> None:
    settings = _get_settings(db)
    message = MIMEText(body, "plain", "utf-8")
    message["Subject"] = subject
    message["From"] = settings.from_address
    message["To"] = to_address

    with smtplib.SMTP(settings.host, settings.port, timeout=10) as server:
        if settings.use_tls:
            server.starttls()
        if settings.username:
            server.login(settings.username, settings.password)
        server.sendmail(settings.from_address, [to_address], message.as_string())
