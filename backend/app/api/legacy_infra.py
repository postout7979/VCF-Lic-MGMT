from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.vcenter import VCenterConnection, VCenterInventoryItem
from app.schemas.vcenter import (
    VCenterConnectionCreate,
    VCenterConnectionRead,
    VCenterInventoryItemRead,
)
from app.services.vcenter_client import collect_inventory

router = APIRouter(prefix="/legacy-infra", tags=["legacy-infra"])


def _to_read(connection: VCenterConnection, db: Session) -> VCenterConnectionRead:
    host_count = (
        db.query(VCenterInventoryItem)
        .filter(VCenterInventoryItem.connection_id == connection.id)
        .count()
    )
    return VCenterConnectionRead(
        **{
            "id": connection.id,
            "name": connection.name,
            "host": connection.host,
            "username": connection.username,
            "version_hint": connection.version_hint,
            "detected_version": connection.detected_version,
            "status": connection.status,
            "last_error": connection.last_error,
            "last_synced_at": connection.last_synced_at,
            "created_at": connection.created_at,
            "host_count": host_count,
        }
    )


def _sync_connection(connection: VCenterConnection, db: Session) -> None:
    try:
        detected_version, rows = collect_inventory(
            connection.host, connection.username, connection.password
        )
    except ValueError as exc:
        connection.status = "failed"
        connection.last_error = str(exc)
        db.commit()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    db.query(VCenterInventoryItem).filter(
        VCenterInventoryItem.connection_id == connection.id
    ).delete()

    for row in rows:
        db.add(VCenterInventoryItem(connection_id=connection.id, **row))

    connection.status = "connected"
    connection.detected_version = detected_version
    connection.last_error = None
    connection.last_synced_at = datetime.utcnow()
    db.commit()


@router.get("/vcenter-connections", response_model=list[VCenterConnectionRead])
def list_connections(db: Session = Depends(get_db)):
    connections = db.query(VCenterConnection).order_by(VCenterConnection.created_at.desc()).all()
    return [_to_read(c, db) for c in connections]


@router.post("/vcenter-connections", response_model=VCenterConnectionRead, status_code=201)
def create_connection(payload: VCenterConnectionCreate, db: Session = Depends(get_db)):
    if db.query(VCenterConnection).filter(VCenterConnection.name == payload.name).first():
        raise HTTPException(status_code=409, detail="같은 이름의 연결이 이미 존재합니다.")

    connection = VCenterConnection(
        name=payload.name,
        host=payload.host,
        username=payload.username,
        password=payload.password,
        version_hint=payload.version_hint,
        status="pending",
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)

    _sync_connection(connection, db)
    return _to_read(connection, db)


@router.post("/vcenter-connections/{connection_id}/sync", response_model=VCenterConnectionRead)
def sync_connection(connection_id: int, db: Session = Depends(get_db)):
    connection = db.get(VCenterConnection, connection_id)
    if connection is None:
        raise HTTPException(status_code=404, detail="연결을 찾을 수 없습니다.")
    _sync_connection(connection, db)
    return _to_read(connection, db)


@router.get(
    "/vcenter-connections/{connection_id}/inventory",
    response_model=list[VCenterInventoryItemRead],
)
def get_inventory(connection_id: int, db: Session = Depends(get_db)):
    connection = db.get(VCenterConnection, connection_id)
    if connection is None:
        raise HTTPException(status_code=404, detail="연결을 찾을 수 없습니다.")
    return (
        db.query(VCenterInventoryItem)
        .filter(VCenterInventoryItem.connection_id == connection_id)
        .order_by(VCenterInventoryItem.cluster_name, VCenterInventoryItem.host_name)
        .all()
    )


@router.delete("/vcenter-connections/{connection_id}", status_code=204)
def delete_connection(connection_id: int, db: Session = Depends(get_db)):
    connection = db.get(VCenterConnection, connection_id)
    if connection is None:
        raise HTTPException(status_code=404, detail="연결을 찾을 수 없습니다.")
    db.delete(connection)
    db.commit()
