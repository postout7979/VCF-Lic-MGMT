import asyncio
import random

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.auth import router as auth_router
from app.api.backup import router as backup_router
from app.api.brand import router as brand_router
from app.api.csp_data import router as csp_data_router
from app.api.legacy_infra import router as legacy_infra_router
from app.api.projects import router as projects_router
from app.api.network_settings import router as network_settings_router
from app.api.smtp_settings import router as smtp_settings_router
from app.api.supplier_data import router as supplier_data_router
from app.api.system import router as system_router
from app.api.user_applications import router as user_applications_router
from app.api.users import router as users_router
from app.api.vcf_ops import router as vcf_ops_router
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.services.scheduler import scheduler_loop
from app.models import (  # noqa: F401  (register models with Base)
    BrandSettings,
    CspLicenseItem,
    LicenseItem,
    NetworkSettings,
    Project,
    SmtpSettings,
    User,
    UserApplication,
    VCenterConnection,
    VCenterInventoryItem,
    VcfOpsConnection,
    VcfOpsCoreLicenseItem,
)

# Additive, idempotent patches for columns added after a table already
# existed in a running database. Remove once Alembic migrations are in place.
SCHEMA_PATCHES = [
    "ALTER TABLE vcenter_inventory_items ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id)",
    "ALTER TABLE vcenter_inventory_items ADD COLUMN IF NOT EXISTS license_category VARCHAR",
    # vcenter_name used to store vCenter's own version/build string; backfill
    # already-collected rows to the connection-name(host) display format too.
    """
    UPDATE vcenter_inventory_items vi
    SET vcenter_name = vc.name || '(' || vc.host || ')'
    FROM vcenter_connections vc
    WHERE vi.connection_id = vc.id
    """,
    "ALTER TABLE license_items ADD COLUMN IF NOT EXISTS upload_name VARCHAR NOT NULL DEFAULT '기존 업로드'",
    "ALTER TABLE vcf_ops_connections ADD COLUMN IF NOT EXISTS auth_method VARCHAR NOT NULL DEFAULT 'credentials'",
    "ALTER TABLE vcf_ops_connections ADD COLUMN IF NOT EXISTS api_token VARCHAR",
    "ALTER TABLE vcf_ops_connections ALTER COLUMN username DROP NOT NULL",
    "ALTER TABLE vcf_ops_connections ALTER COLUMN password DROP NOT NULL",
    # Token-based login was removed; credentials are required again.
    "ALTER TABLE vcf_ops_connections DROP COLUMN IF EXISTS auth_method",
    "ALTER TABLE vcf_ops_connections DROP COLUMN IF EXISTS api_token",
    "UPDATE vcf_ops_connections SET username = '' WHERE username IS NULL",
    "UPDATE vcf_ops_connections SET password = '' WHERE password IS NULL",
    "ALTER TABLE vcf_ops_connections ALTER COLUMN username SET NOT NULL",
    "ALTER TABLE vcf_ops_connections ALTER COLUMN password SET NOT NULL",
    "ALTER TABLE vcf_ops_core_license_items ADD COLUMN IF NOT EXISTS verified_core_used INTEGER",
    "ALTER TABLE vcf_ops_core_license_items ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id)",
    # Previously TLS verification was unconditionally skipped; now it's an
    # explicit per-connection choice exposed in the connect modal, defaulted
    # to true to preserve existing connections' current behavior.
    "ALTER TABLE vcenter_connections ADD COLUMN IF NOT EXISTS tls_skip BOOLEAN NOT NULL DEFAULT true",
    "ALTER TABLE vcf_ops_connections ADD COLUMN IF NOT EXISTS tls_skip BOOLEAN NOT NULL DEFAULT true",
    # Login/authorization: is_admin + session_token on users, and a
    # per-connection auto-sync interval.
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS session_token VARCHAR",
    "ALTER TABLE vcenter_connections ADD COLUMN IF NOT EXISTS sync_interval_minutes INTEGER NOT NULL DEFAULT 60",
    "ALTER TABLE vcf_ops_connections ADD COLUMN IF NOT EXISTS sync_interval_minutes INTEGER NOT NULL DEFAULT 60",
    # Users can now be assigned to multiple projects (user_project_assignments,
    # created by create_all above) instead of a single project_id column;
    # backfill existing single assignments into the new table, then drop the
    # old column. Guarded so it's a no-op once project_id is gone.
    """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'project_id'
        ) THEN
            INSERT INTO user_project_assignments (user_id, project_id)
            SELECT id, project_id FROM users WHERE project_id IS NOT NULL
            ON CONFLICT DO NOTHING;
            ALTER TABLE users DROP COLUMN project_id;
        END IF;
    END $$;
    """,
    # SMTP relay + password-reset (recovery key / OTP / security questions).
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer_1 VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer_2 VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer_3 VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_key_hash VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_key_created_at TIMESTAMP",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_code VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expires_at TIMESTAMP",
    # Non-admin accounts now log in with their email address; `name` is the
    # display name collected instead of a username on signup/creation.
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR",
    # user_applications used to key on `username`; guarded so it's a no-op
    # on a fresh install, where create_all already made the new schema.
    """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_applications' AND column_name = 'username'
        ) THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'user_applications' AND column_name = 'name'
            ) THEN
                ALTER TABLE user_applications ADD COLUMN name VARCHAR;
            END IF;
            UPDATE user_applications SET name = username WHERE name IS NULL;
            ALTER TABLE user_applications ALTER COLUMN name SET NOT NULL;
            ALTER TABLE user_applications DROP COLUMN username;
        END IF;
    END $$;
    """,
    # Per-user visibility toggle for the "공급자 현황" sidebar menu
    # (non-admin only; admin always sees it regardless of this flag).
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS show_supplier_menu BOOLEAN NOT NULL DEFAULT false",
    # Brand settings: a permanent default background/logo, restorable via
    # Settings > 브랜드's reset button.
    "ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS default_background_image BYTEA",
    "ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS default_background_image_mimetype VARCHAR",
    "ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS default_logo_image BYTEA",
    "ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS default_logo_image_mimetype VARCHAR",
]

_RANDOM_HIRE_YEARS = [str(y) for y in range(2008, 2024)]
_RANDOM_FIRST_EMPLOYERS = ["대한소프트", "한빛테크", "그린시스템즈", "유니콤정보", "서울데이타", "미래넷웍스"]
_RANDOM_BIRTH_CITIES = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "수원"]

app = FastAPI(title="VCF License Management")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(supplier_data_router, prefix=settings.api_v1_prefix)
app.include_router(projects_router, prefix=settings.api_v1_prefix)
app.include_router(legacy_infra_router, prefix=settings.api_v1_prefix)
app.include_router(vcf_ops_router, prefix=settings.api_v1_prefix)
app.include_router(csp_data_router, prefix=settings.api_v1_prefix)
app.include_router(users_router, prefix=settings.api_v1_prefix)
app.include_router(smtp_settings_router, prefix=settings.api_v1_prefix)
app.include_router(user_applications_router, prefix=settings.api_v1_prefix)
app.include_router(network_settings_router, prefix=settings.api_v1_prefix)
app.include_router(brand_router, prefix=settings.api_v1_prefix)
app.include_router(system_router, prefix=settings.api_v1_prefix)
app.include_router(backup_router, prefix=settings.api_v1_prefix)


def _seed_admin_user(db: Session) -> None:
    from app.models.user import User

    if db.query(User).filter(User.username == "admin").first() is not None:
        return
    db.add(User(username="admin", password="admin", email="admin@local", is_admin=True))
    db.commit()


def _migrate_username_to_email(db: Session) -> None:
    """Non-admin accounts now log in with their email address instead of an
    arbitrary username; align `username` to `email` and preserve whatever
    the old username was as the display `name`, for accounts that predate
    this change and don't have one yet."""
    from app.models.user import User

    users = db.query(User).filter(User.is_admin.is_(False)).all()
    seen_emails: set[str] = set()
    for user in users:
        if user.name is None:
            user.name = user.username
        if user.email in seen_emails:
            # Duplicate email among non-admin accounts; leave username as-is
            # rather than violate the unique constraint - needs manual fixup.
            continue
        seen_emails.add(user.email)
        if user.username != user.email:
            user.username = user.email
    db.commit()


def _snapshot_brand_defaults(db: Session) -> None:
    """One-time: whatever background/logo is live right now becomes the
    permanent default that Settings > 브랜드's reset button restores to.
    Later uploads only replace the live image, never this snapshot."""
    from app.models.brand_settings import BrandSettings

    settings = db.get(BrandSettings, 1)
    if settings is None:
        return
    changed = False
    if settings.background_image is not None and settings.default_background_image is None:
        settings.default_background_image = settings.background_image
        settings.default_background_image_mimetype = settings.background_image_mimetype
        changed = True
    if settings.logo_image is not None and settings.default_logo_image is None:
        settings.default_logo_image = settings.logo_image
        settings.default_logo_image_mimetype = settings.logo_image_mimetype
        changed = True
    if changed:
        db.commit()


def _backfill_security_answers(db: Session) -> None:
    """Existing non-admin users predate the security-question fields;
    fill them with plausible random answers so the password-reset
    fallback flow works without requiring every user to re-register them."""
    from app.models.user import User

    users = (
        db.query(User)
        .filter(User.is_admin.is_(False))
        .filter(
            (User.security_answer_1.is_(None))
            | (User.security_answer_2.is_(None))
            | (User.security_answer_3.is_(None))
        )
        .all()
    )
    if not users:
        return
    for user in users:
        if user.security_answer_1 is None:
            user.security_answer_1 = random.choice(_RANDOM_HIRE_YEARS)
        if user.security_answer_2 is None:
            user.security_answer_2 = random.choice(_RANDOM_FIRST_EMPLOYERS)
        if user.security_answer_3 is None:
            user.security_answer_3 = random.choice(_RANDOM_BIRTH_CITIES)
    db.commit()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        for statement in SCHEMA_PATCHES:
            conn.execute(text(statement))

    db = SessionLocal()
    try:
        _seed_admin_user(db)
        _migrate_username_to_email(db)
        _backfill_security_answers(db)
        _snapshot_brand_defaults(db)
    finally:
        db.close()

    asyncio.create_task(scheduler_loop())


@app.get("/health")
def health():
    return {"status": "ok"}
