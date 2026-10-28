from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.smtp_settings import SmtpSettings
from app.schemas.smtp_settings import SmtpSettingsRead, SmtpSettingsUpdate, SmtpTestRequest
from app.services.email_service import EmailNotConfiguredError, send_email

router = APIRouter(
    prefix="/smtp-settings", tags=["smtp-settings"], dependencies=[Depends(require_admin)]
)


def _get_or_create(db: Session) -> SmtpSettings:
    settings = db.get(SmtpSettings, 1)
    if settings is None:
        settings = SmtpSettings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=SmtpSettingsRead)
def get_smtp_settings(db: Session = Depends(get_db)):
    return _get_or_create(db)


@router.put("", response_model=SmtpSettingsRead)
def update_smtp_settings(payload: SmtpSettingsUpdate, db: Session = Depends(get_db)):
    if not payload.host.strip():
        raise HTTPException(status_code=400, detail="SMTP Host를 입력해주세요.")
    if not payload.from_address.strip():
        raise HTTPException(status_code=400, detail="발신 이메일 주소를 입력해주세요.")

    settings = _get_or_create(db)
    settings.host = payload.host.strip()
    settings.port = payload.port
    settings.username = payload.username.strip()
    settings.password = payload.password
    settings.use_tls = payload.use_tls
    settings.from_address = payload.from_address.strip()
    db.commit()
    db.refresh(settings)
    return settings


@router.post("/test", status_code=204)
def send_test_email(payload: SmtpTestRequest, db: Session = Depends(get_db)):
    if not payload.to_address.strip():
        raise HTTPException(status_code=400, detail="수신 이메일 주소를 입력해주세요.")
    try:
        send_email(
            db,
            payload.to_address.strip(),
            "VCF License Management 테스트 메일",
            "이 메일을 받았다면 SMTP 설정이 정상적으로 동작하는 것입니다.",
        )
    except EmailNotConfiguredError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except Exception as err:  # smtplib / socket errors etc.
        raise HTTPException(status_code=502, detail=f"메일 발송에 실패했습니다: {err}") from err
