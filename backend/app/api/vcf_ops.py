from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.vcf_ops import VcfOpsConnection, VcfOpsCoreLicenseItem
from app.schemas.vcf_ops import (
    VcfOpsConnectionCreate,
    VcfOpsConnectionRead,
    VcfOpsCoreLicenseItemRead,
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
            connection.host, connection.username, connection.password
        )
    except ValueError as exc:
        connection.status = "failed"
        connection.last_error = str(exc)
        db.commit()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Upsert by license_key so an existing project assignment survives a
    # re-sync instead of being wiped out by a delete-then-recreate.
    existing_by_key = {
        item.license_key: item
        for item in db.query(VcfOpsCoreLicenseItem).filter(
            VcfOpsCoreLicenseItem.connection_id == connection.id
        )
    }
    seen_keys: set[str | None] = set()
    for row in rows:
        license_key = row.get("license_key")
        seen_keys.add(license_key)
        existing = existing_by_key.get(license_key)
        if existing is not None:
            for key, value in row.items():
                setattr(existing, key, value)
        else:
            db.add(VcfOpsCoreLicenseItem(connection_id=connection.id, **row))

    for license_key, item in existing_by_key.items():
        if license_key not in seen_keys:
            db.delete(item)

    connection.status = "connected"
    connection.detected_version = detected_version
    connection.last_error = None
    connection.last_synced_at = datetime.utcnow()
    db.commit()


@router.get("/connections", response_model=list[VcfOpsConnectionRead])
def list_connections(db: Session = Depends(get_db)):
    connections = db.query(VcfOpsConnection).order_by(VcfOpsConnection.created_at.desc()).all()
    return [_to_read(c, db) for c in connections]


@router.post("/connections", response_model=VcfOpsConnectionRead, status_code=201)
def create_connection(payload: VcfOpsConnectionCreate, db: Session = Depends(get_db)):
    if db.query(VcfOpsConnection).filter(VcfOpsConnection.name == payload.name).first():
        raise HTTPException(status_code=409, detail="같은 이름의 연결이 이미 존재합니다.")

    connection = VcfOpsConnection(
        name=payload.name,
        host=payload.host,
        username=payload.username,
        password=payload.password,
        status="pending",
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)

    _sync_connection(connection, db)
    return _to_read(connection, db)


@router.post("/connections/{connection_id}/sync", response_model=VcfOpsConnectionRead)
def sync_connection(connection_id: int, db: Session = Depends(get_db)):
    connection = db.get(VcfOpsConnection, connection_id)
    if connection is None:
        raise HTTPException(status_code=404, detail="연결을 찾을 수 없습니다.")
    _sync_connection(connection, db)
    return _to_read(connection, db)


@router.get(
    "/connections/{connection_id}/inventory",
    response_model=list[VcfOpsCoreLicenseItemRead],
)
def get_inventory(connection_id: int, db: Session = Depends(get_db)):
    connection = db.get(VcfOpsConnection, connection_id)
    if connection is None:
        raise HTTPException(status_code=404, detail="연결을 찾을 수 없습니다.")
    return (
        db.query(VcfOpsCoreLicenseItem)
        .filter(VcfOpsCoreLicenseItem.connection_id == connection_id)
        .order_by(VcfOpsCoreLicenseItem.domain_name, VcfOpsCoreLicenseItem.license_key)
        .all()
    )


@router.delete("/connections/{connection_id}", status_code=204)
def delete_connection(connection_id: int, db: Session = Depends(get_db)):
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
):
    query = db.query(VcfOpsCoreLicenseItem)
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
