from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.approval_record import ApprovalRecord
from app.models.csp_data import CspLicenseItem
from app.models.license_item import LicenseItem
from app.models.network_settings import NetworkSettings
from app.models.project import Project
from app.models.smtp_settings import SmtpSettings
from app.models.user import User, user_project_assignments
from app.models.user_application import UserApplication
from app.models.vcenter import VCenterConnection, VCenterInventoryItem, VCenterLicenseInfo
from app.models.vcf_ops import VcfOpsConnection, VcfOpsCoreLicenseItem

router = APIRouter(prefix="/system", tags=["system"], dependencies=[Depends(require_admin)])


@router.post("/reset", status_code=204)
def reset_environment(db: Session = Depends(get_db)):
    """Wipes every piece of configured/collected data except the admin
    account itself and the current 브랜드 background/logo images: uploaded
    supplier/CSP data, connected vCenter and VCF Operations accounts (and
    everything they collected), projects, every non-admin user and pending
    signup request, and resets SMTP/Network settings back to blank.
    Triggered from Settings > 환경 설정 초기화. Brand images are deliberately
    left untouched - they only ever change via an explicit admin upload in
    Settings > 브랜드."""
    # Child rows that reference connections/projects, deleted before their
    # parents to satisfy foreign keys.
    db.query(VCenterInventoryItem).delete(synchronize_session=False)
    db.query(VCenterLicenseInfo).delete(synchronize_session=False)
    db.query(VcfOpsCoreLicenseItem).delete(synchronize_session=False)
    db.query(CspLicenseItem).delete(synchronize_session=False)
    db.query(LicenseItem).delete(synchronize_session=False)
    db.execute(user_project_assignments.delete())

    db.query(VCenterConnection).delete(synchronize_session=False)
    db.query(VcfOpsConnection).delete(synchronize_session=False)
    db.query(Project).delete(synchronize_session=False)

    db.query(UserApplication).delete(synchronize_session=False)
    db.query(ApprovalRecord).delete(synchronize_session=False)
    db.query(User).filter(User.is_admin.is_(False)).delete(synchronize_session=False)

    smtp = db.get(SmtpSettings, 1)
    if smtp is not None:
        smtp.host = ""
        smtp.port = 587
        smtp.username = ""
        smtp.password = ""
        smtp.use_tls = True
        smtp.from_address = ""

    network = db.get(NetworkSettings, 1)
    if network is not None:
        network.dns_server = ""
        network.ntp_server = ""

    # BrandSettings (background/logo images, live and default) is
    # intentionally left alone - it survives a reset and only changes via
    # an explicit admin upload in Settings > 브랜드.

    db.commit()
