import shutil
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.database import get_db
from app.schemas.backup import StorageInfo
from app.services.db_backup import BackupError, create_backup, restore_backup

router = APIRouter(prefix="/backup", tags=["backup"], dependencies=[Depends(require_admin)])

MAX_IMPORT_BYTES = 200 * 1024 * 1024


@router.get("/storage", response_model=StorageInfo)
def get_storage_info(db: Session = Depends(get_db)):
    # The container's own filesystem is the same host disk the `db_data`
    # Docker volume lives on (Docker doesn't give a named volume its own
    # quota), so this reports real, actionable capacity - not just what
    # Postgres's own data files add up to.
    usage = shutil.disk_usage("/")
    db_size = db.execute(text("SELECT pg_database_size(current_database())")).scalar() or 0
    used_percent = (usage.used / usage.total * 100) if usage.total else 0.0
    return StorageInfo(
        volume_total_bytes=usage.total,
        volume_used_bytes=usage.used,
        volume_available_bytes=usage.free,
        volume_used_percent=round(used_percent, 1),
        db_size_bytes=int(db_size),
    )


@router.get("/export")
def export_backup():
    try:
        data = create_backup()
    except BackupError as err:
        raise HTTPException(status_code=500, detail=f"백업 생성에 실패했습니다: {err}") from err
    filename = f"vcf-lic-mgmt-backup-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.sql"
    return Response(
        content=data,
        media_type="application/sql",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/import", status_code=204)
def import_backup(file: UploadFile, db: Session = Depends(get_db)):
    raw = file.file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")
    if len(raw) > MAX_IMPORT_BYTES:
        raise HTTPException(status_code=400, detail="파일이 너무 큽니다 (최대 200MB).")
    # The require_admin dependency above already queried `users` on this
    # same session; close it now so that lookup's transaction isn't still
    # holding a lock the restore's DROP/ALTER statements need below.
    db.close()
    try:
        restore_backup(raw)
    except BackupError as err:
        raise HTTPException(status_code=500, detail=f"복구에 실패했습니다: {err}") from err
