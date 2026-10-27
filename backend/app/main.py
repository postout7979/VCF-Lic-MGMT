from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.legacy_infra import router as legacy_infra_router
from app.api.projects import router as projects_router
from app.api.supplier_data import router as supplier_data_router
from app.api.vcf_ops import router as vcf_ops_router
from app.core.config import settings
from app.core.database import Base, engine
from app.models import (  # noqa: F401  (register models with Base)
    LicenseItem,
    Project,
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
]

app = FastAPI(title="VCF License Management")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(supplier_data_router, prefix=settings.api_v1_prefix)
app.include_router(projects_router, prefix=settings.api_v1_prefix)
app.include_router(legacy_infra_router, prefix=settings.api_v1_prefix)
app.include_router(vcf_ops_router, prefix=settings.api_v1_prefix)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        for statement in SCHEMA_PATCHES:
            conn.execute(text(statement))


@app.get("/health")
def health():
    return {"status": "ok"}
