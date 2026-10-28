from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_admin
from app.core.database import get_db
from app.models.user import User
from app.models.vcf_ops import VcfOpsConnection, VcfOpsCoreLicenseItem
from app.schemas.vcf_ops import (
    VcfOpsConnectionCreate,
    VcfOpsConnectionRead,
    VcfOpsCoreLicenseItemRead,
    VcfOpsSyncIntervalUpdate,
)
from app.services.vcf_ops_client import collect_core_license_usage

router = APIRouter(prefix="/vcf-ops", tags=["vcf-ops"])


def _to_read(connection: VcfOpsConnection, db: Session) -> VcfOpsConnectionRead:
    license_count = (
        db.query(VcfOpsCoreLicenseItem)
        .filter(VcfOpsCoreLicenseItem.connection_id == connection.id)
        .count()
    )
    return VcfOpsConnectionRead(
        **{
            "id": connection.id,
            "name": connection.name,
            "host": connection.host,
            "username": connection.username,
            "tls_skip": connection.tls_skip,
            "sync_interval_minutes": connection.sync_interval_minutes,
            "detected_version": connection.detected_version,
            "status": connection.status,
            "last_error": connection.last_error,
            "last_synced_at": connection.last_synced_at,
            "created_at": connection.created_at,
            "license_count": license_count,
        }
    )


def _sync_connection(connection: VcfOpsConnection, db: Session) -> None:
    try:
        detected_version, rows = collect_core_license_usage(
            connection.host,
            connection.username,
            connection.password,
            verify_tls=not connection.tls_skip,
        )
    except ValueError as exc:
        connection.status = "failed"
        connection.last_error = str(exc)
        db.commit()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Upsert by (license_key, domain_name) - one license now expands into one
    # row per assigned vCenter, so license_key alone is no longer unique -
    # so an existing project assignment survives a re-sync instead of being
    # wiped out by a delete-then-recreate.
    existing_by_key = {
        (item.license_key, item.domain_name): item
        for item in db.query(VcfOpsCoreLicenseItem).filter(
            VcfOpsCoreLicenseItem.connection_id == connection.id
        )
    }
    seen_keys: set[tuple[str | None, str | None]] = set()
    for row in rows:
        key = (row.get("license_key"), row.get("domain_name"))
        seen_keys.add(key)
        existing = existing_by_key.get(key)
        if existing is not None:
            for field, value in row.items():
                setattr(existing, field, value)
        else:
            db.add(VcfOpsCoreLicenseItem(connection_id=connection.id, **row))

    for key, item in existing_by_key.items():
        if key not in seen_keys:
            db.delete(item)

    connection.status = "connected"
    connection.detected_version = detected_version
    connection.last_error = None
    connection.last_synced_at = datetime.utcnow()
    db.commit()


@router.get("/connections", response_model=list[VcfOpsConnectionRead])
def list_connections(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    connections = db.query(VcfOpsConnection).order_by(VcfOpsConnection.created_at.desc()).all()
    return [_to_read(c, db) for c in connections]


@router.post("/connections", response_model=VcfOpsConnectionRead, status_code=201)
def create_connection(
    payload: VcfOpsConnectionCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    if db.query(VcfOpsConnection).filter(VcfOpsConnection.name == payload.name).first():
        raise HTTPException(status_code=409, detail="같은 이름의 연결이 이미 존재합니다.")

    connection = VcfOpsConnection(
        name=payload.name,
        host=payload.host,
        username=payload.username,
        password=payload.password,
        tls_skip=payload.tls_skip,
        sync_interval_minutes=payload.sync_interval_minutes,
        status="pending",
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)

    _sync_connection(connection, db)
    return _to_read(connection, db)


@router.post("/connections/{connection_id}/sync", response_model=VcfOpsConnectionRead)
def sync_connection(
    connection_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    connection = db.get(VcfOpsConnection, connection_id)
    if connection is None:
        raise HTTPException(status_code=404, detail="연결을 찾을 수 없습니다.")
    _sync_connection(connection, db)
    return _to_read(connection, db)


@router.patch("/connections/{connection_id}/sync-interval", response_model=VcfOpsConnectionRead)
def update_sync_interval(
    connection_id: int,
    payload: VcfOpsSyncIntervalUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    connection = db.get(VcfOpsConnection, connection_id)
    if connection is None:
        raise HTTPException(status_code=404, detail="연결을 찾을 수 없습니다.")
    if payload.minutes < 1:
        raise HTTPException(status_code=400, detail="동기화 주기는 1분 이상이어야 합니다.")
    connection.sync_interval_minutes = payload.minutes
    db.commit()
    db.refresh(connection)
    return _to_read(connection, db)


@router.get(
    "/connections/{connection_id}/inventory",
    response_model=list[VcfOpsCoreLicenseItemRead],
)
def get_inventory(
    connection_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    connection = db.get(VcfOpsConnection, connection_id)
    if connection is None:
        raise HTTPException(status_code=404, detail="연결을 찾을 수 없습니다.")
    return (
        db.query(VcfOpsCoreLicenseItem)
        .filter(VcfOpsCoreLicenseItem.connection_id == connection_id)
        .order_by(VcfOpsCoreLicenseItem.license_key, VcfOpsCoreLicenseItem.domain_name)
        .all()
    )


@router.delete("/connections/{connection_id}", status_code=204)
def delete_connection(
    connection_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    connection = db.get(VcfOpsConnection, connection_id)
    if connection is None:
        raise HTTPException(status_code=404, detail="연결을 찾을 수 없습니다.")
    db.delete(connection)
    db.commit()


@router.get("/items", response_model=list[VcfOpsCoreLicenseItemRead])
def list_vcf_ops_items(
    assignable_for_project: int | None = None,
    assigned_to_project: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(VcfOpsCoreLicenseItem)
    if not current_user.is_admin:
        project_ids = [p.id for p in current_user.projects]
        if not project_ids:
            return []
        return query.filter(VcfOpsCoreLicenseItem.project_id.in_(project_ids)).order_by(
            VcfOpsCoreLicenseItem.connection_id, VcfOpsCoreLicenseItem.license_key
        ).all()
    if assigned_to_project is not None:
        query = query.filter(VcfOpsCoreLicenseItem.project_id == assigned_to_project)
    elif assignable_for_project is not None:
        query = query.filter(
            (VcfOpsCoreLicenseItem.project_id.is_(None))
            | (VcfOpsCoreLicenseItem.project_id == assignable_for_project)
        )
    return query.order_by(
        VcfOpsCoreLicenseItem.connection_id, VcfOpsCoreLicenseItem.license_key
    ).all()
