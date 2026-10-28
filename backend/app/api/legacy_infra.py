from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_admin
from app.core.database import get_db
from app.models.user import User
from app.models.vcenter import VCenterConnection, VCenterInventoryItem
from app.schemas.vcenter import (
    VCenterConnectionCreate,
    VCenterConnectionRead,
    VCenterInventoryItemRead,
    VCenterSyncIntervalUpdate,
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
            "tls_skip": connection.tls_skip,
            "sync_interval_minutes": connection.sync_interval_minutes,
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

    # Upsert by host_name so an existing project assignment survives a re-sync
    # instead of being wiped out by a delete-then-recreate.
    existing_by_host = {
        item.host_name: item
        for item in db.query(VCenterInventoryItem).filter(
            VCenterInventoryItem.connection_id == connection.id
        )
    }
    seen_hosts: set[str] = set()

    # Show the connection's own name + FQDN/IP rather than vCenter's reported
    # version/build string, which isn't useful for telling instances apart.
    display_name = f"{connection.name}({connection.host})"

    for row in rows:
        row["vcenter_name"] = display_name
        host_name = row.get("host_name")
        seen_hosts.add(host_name)
        existing = existing_by_host.get(host_name)
        if existing is not None:
            for key, value in row.items():
                setattr(existing, key, value)
        else:
            db.add(VCenterInventoryItem(connection_id=connection.id, **row))

    for host_name, item in existing_by_host.items():
        if host_name not in seen_hosts:
            db.delete(item)

    connection.status = "connected"
    connection.detected_version = detected_version
    connection.last_error = None
    connection.last_synced_at = datetime.utcnow()
    db.commit()


@router.get("/vcenter-connections", response_model=list[VCenterConnectionRead])
def list_connections(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    connections = db.query(VCenterConnection).order_by(VCenterConnection.created_at.desc()).all()
    return [_to_read(c, db) for c in connections]


@router.post("/vcenter-connections", response_model=VCenterConnectionRead, status_code=201)
def create_connection(
    payload: VCenterConnectionCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    if db.query(VCenterConnection).filter(VCenterConnection.name == payload.name).first():
        raise HTTPException(status_code=409, detail="같은 이름의 연결이 이미 존재합니다.")

    connection = VCenterConnection(
        name=payload.name,
        host=payload.host,
        username=payload.username,
        password=payload.password,
        version_hint=payload.version_hint,
        tls_skip=payload.tls_skip,
        sync_interval_minutes=payload.sync_interval_minutes,
        status="pending",
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)

    _sync_connection(connection, db)
    return _to_read(connection, db)


@router.post("/vcenter-connections/{connection_id}/sync", response_model=VCenterConnectionRead)
def sync_connection(
    connection_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    connection = db.get(VCenterConnection, connection_id)
    if connection is None:
        raise HTTPException(status_code=404, detail="연결을 찾을 수 없습니다.")
    _sync_connection(connection, db)
    return _to_read(connection, db)


@router.patch(
    "/vcenter-connections/{connection_id}/sync-interval", response_model=VCenterConnectionRead
)
def update_sync_interval(
    connection_id: int,
    payload: VCenterSyncIntervalUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    connection = db.get(VCenterConnection, connection_id)
    if connection is None:
        raise HTTPException(status_code=404, detail="연결을 찾을 수 없습니다.")
    if payload.minutes < 1:
        raise HTTPException(status_code=400, detail="동기화 주기는 1분 이상이어야 합니다.")
    connection.sync_interval_minutes = payload.minutes
    db.commit()
    db.refresh(connection)
    return _to_read(connection, db)


@router.get(
    "/vcenter-connections/{connection_id}/inventory",
    response_model=list[VCenterInventoryItemRead],
)
def get_inventory(
    connection_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
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
def delete_connection(
    connection_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    connection = db.get(VCenterConnection, connection_id)
    if connection is None:
        raise HTTPException(status_code=404, detail="연결을 찾을 수 없습니다.")
    db.delete(connection)
    db.commit()


@router.get("/vcenter-items", response_model=list[VCenterInventoryItemRead])
def list_vcenter_items(
    assignable_for_project: int | None = None,
    assigned_to_project: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(VCenterInventoryItem)
    if not current_user.is_admin:
        # Non-admins may only ever see their own assigned projects' items -
        # the assignment-picker params are an admin-only concept.
        project_ids = [p.id for p in current_user.projects]
        if not project_ids:
            return []
        return query.filter(VCenterInventoryItem.project_id.in_(project_ids)).order_by(
            VCenterInventoryItem.vcenter_name, VCenterInventoryItem.cluster_name, VCenterInventoryItem.host_name
        ).all()
    if assigned_to_project is not None:
        query = query.filter(VCenterInventoryItem.project_id == assigned_to_project)
    elif assignable_for_project is not None:
        query = query.filter(
            (VCenterInventoryItem.project_id.is_(None))
            | (VCenterInventoryItem.project_id == assignable_for_project)
        )
    return query.order_by(
        VCenterInventoryItem.vcenter_name, VCenterInventoryItem.cluster_name, VCenterInventoryItem.host_name
    ).all()
