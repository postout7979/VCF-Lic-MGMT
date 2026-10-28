from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.network_settings import NetworkSettings
from app.schemas.network_settings import NetworkSettingsRead, NetworkSettingsUpdate

router = APIRouter(
    prefix="/network-settings", tags=["network-settings"], dependencies=[Depends(require_admin)]
)


def _get_or_create(db: Session) -> NetworkSettings:
    settings = db.get(NetworkSettings, 1)
    if settings is None:
        settings = NetworkSettings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=NetworkSettingsRead)
def get_network_settings(db: Session = Depends(get_db)):
    return _get_or_create(db)


@router.put("", response_model=NetworkSettingsRead)
def update_network_settings(payload: NetworkSettingsUpdate, db: Session = Depends(get_db)):
    settings = _get_or_create(db)
    settings.dns_server = payload.dns_server.strip()
    settings.ntp_server = payload.ntp_server.strip()
    db.commit()
    db.refresh(settings)
    return settings
