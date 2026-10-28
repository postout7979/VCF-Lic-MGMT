import asyncio
import logging
from datetime import datetime, timedelta

from app.core.database import SessionLocal
from app.models.vcenter import VCenterConnection
from app.models.vcf_ops import VcfOpsConnection

logger = logging.getLogger(__name__)

# How often the loop wakes up to check whether any connection is due; each
# connection's own sync_interval_minutes decides whether it actually syncs.
CHECK_INTERVAL_SECONDS = 60


def _is_due(last_synced_at: datetime | None, interval_minutes: int) -> bool:
    if last_synced_at is None:
        return True
    return datetime.utcnow() - last_synced_at >= timedelta(minutes=interval_minutes)


def _run_due_syncs() -> None:
    # Imported here, not at module load, to avoid a circular import with the
    # API routers (which import get_current_user from app.core.auth, which
    # doesn't touch this module, but keeps the dependency direction one-way).
    from app.api.legacy_infra import _sync_connection as sync_vcenter
    from app.api.vcf_ops import _sync_connection as sync_vcf_ops

    db = SessionLocal()
    try:
        for connection in db.query(VCenterConnection).all():
            if _is_due(connection.last_synced_at, connection.sync_interval_minutes):
                try:
                    sync_vcenter(connection, db)
                except Exception:
                    logger.exception("예약 동기화 실패 (vCenter: %s)", connection.name)
        for connection in db.query(VcfOpsConnection).all():
            if _is_due(connection.last_synced_at, connection.sync_interval_minutes):
                try:
                    sync_vcf_ops(connection, db)
                except Exception:
                    logger.exception("예약 동기화 실패 (VCF Operations: %s)", connection.name)
    finally:
        db.close()


async def scheduler_loop() -> None:
    while True:
        await asyncio.to_thread(_run_due_syncs)
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
