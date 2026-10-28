from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.csp_data import CspLicenseItem
from app.models.license_item import LicenseItem
from app.models.project import Project
from app.models.user import User
from app.models.vcenter import VCenterInventoryItem
from app.models.vcf_ops import VcfOpsCoreLicenseItem
from app.schemas.license_item import AssignItemsRequest
from app.schemas.project import ProjectCreate, ProjectDetail, ProjectSummary

router = APIRouter(prefix="/projects", tags=["projects"])


def _quantity_sum(db: Session, project_id: int, license_type: str) -> int:
    result = (
        db.query(func.coalesce(func.sum(LicenseItem.quantity_ent), 0))
        .filter(
            LicenseItem.project_id == project_id,
            func.upper(LicenseItem.license_type) == license_type.upper(),
        )
        .scalar()
    )
    return int(result or 0)


def _to_summary(db: Session, project: Project) -> ProjectSummary:
    item_count = (
        db.query(func.count(LicenseItem.id))
        .filter(LicenseItem.project_id == project.id)
        .scalar()
        or 0
    )
    vcenter_count = (
        db.query(func.count(func.distinct(VCenterInventoryItem.vcenter_name)))
        .filter(VCenterInventoryItem.project_id == project.id)
        .scalar()
        or 0
    )
    # Perpetual vCenter licensing is per-socket; term (subscription) licensing
    # is per-core actually consumed.
    vcenter_perpetual_quantity = (
        db.query(func.coalesce(func.sum(VCenterInventoryItem.cpu_sockets), 0))
        .filter(
            VCenterInventoryItem.project_id == project.id,
            VCenterInventoryItem.license_category == "PERPETUAL",
        )
        .scalar()
        or 0
    )
    vcenter_term_quantity = (
        db.query(func.coalesce(func.sum(VCenterInventoryItem.total_cores), 0))
        .filter(
            VCenterInventoryItem.project_id == project.id,
            VCenterInventoryItem.license_category == "SUBSCRIPTION",
        )
        .scalar()
        or 0
    )
    vcf_license_count = (
        db.query(func.count(VcfOpsCoreLicenseItem.id))
        .filter(VcfOpsCoreLicenseItem.project_id == project.id)
        .scalar()
        or 0
    )
    # core_capacity is the entitlement's total pool, repeated on every
    # vCenter-domain row of that license - dedupe by license_key before
    # summing so it isn't counted once per domain.
    vcf_capacity_by_license: dict[str | None, int] = {}
    for license_key, capacity in (
        db.query(VcfOpsCoreLicenseItem.license_key, VcfOpsCoreLicenseItem.core_capacity)
        .filter(VcfOpsCoreLicenseItem.project_id == project.id)
        .all()
    ):
        vcf_capacity_by_license[license_key] = capacity or 0
    vcf_core_capacity = sum(vcf_capacity_by_license.values())
    vcf_core_used = (
        db.query(func.coalesce(func.sum(VcfOpsCoreLicenseItem.core_used), 0))
        .filter(VcfOpsCoreLicenseItem.project_id == project.id)
        .scalar()
        or 0
    )
    csp_license_count = (
        db.query(func.count(CspLicenseItem.id))
        .filter(CspLicenseItem.project_id == project.id)
        .scalar()
        or 0
    )
    csp_core_quantity = (
        db.query(func.coalesce(func.sum(CspLicenseItem.quantity), 0))
        .filter(CspLicenseItem.project_id == project.id)
        .scalar()
        or 0
    )
    csp_core_quantity_expired = (
        db.query(func.coalesce(func.sum(CspLicenseItem.quantity), 0))
        .filter(
            CspLicenseItem.project_id == project.id,
            CspLicenseItem.contract_end_date < date.today(),
        )
        .scalar()
        or 0
    )
    user_count = (
        db.query(func.count(User.id)).filter(User.project_id == project.id).scalar() or 0
    )
    return ProjectSummary(
        id=project.id,
        name=project.name,
        description=project.description,
        created_at=project.created_at,
        perpetual_quantity=_quantity_sum(db, project.id, "PERPETUAL"),
        subscription_quantity=_quantity_sum(db, project.id, "SUBSCRIPTION"),
        vcenter_count=vcenter_count,
        vcenter_perpetual_quantity=int(vcenter_perpetual_quantity),
        vcenter_term_quantity=int(vcenter_term_quantity),
        vcf_license_count=int(vcf_license_count),
        vcf_core_capacity=int(vcf_core_capacity),
        vcf_core_used=int(vcf_core_used),
        csp_license_count=int(csp_license_count),
        csp_core_quantity=int(csp_core_quantity),
        csp_core_quantity_expired=int(csp_core_quantity_expired),
        user_count=int(user_count),
        item_count=item_count,
    )


def _reconcile_assignment(db: Session, model, project_id: int, desired_ids: set[int]) -> None:
    """Set `model.project_id` so the final assigned set for this project equals
    `desired_ids`, drawn from items that are unassigned or already assigned to
    this project. Items newly claimed that already belong to another project
    raise a 409; anything previously assigned to this project but missing from
    `desired_ids` is unassigned (supports un-checking in the picker UI)."""

    requested_items = db.query(model).filter(model.id.in_(desired_ids)).all() if desired_ids else []
    found_ids = {item.id for item in requested_items}
    missing_ids = desired_ids - found_ids
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"존재하지 않는 항목: {sorted(missing_ids)}")

    conflicts = [
        item.id for item in requested_items if item.project_id is not None and item.project_id != project_id
    ]
    if conflicts:
        raise HTTPException(
            status_code=409,
            detail=f"이미 다른 프로젝트에 할당된 항목입니다: {sorted(conflicts)}",
        )

    current_items = db.query(model).filter(model.project_id == project_id).all()
    current_ids = {item.id for item in current_items}

    for item in current_items:
        if item.id not in desired_ids:
            item.project_id = None
    for item in requested_items:
        if item.id not in current_ids:
            item.project_id = project_id

    db.commit()


@router.get("", response_model=list[ProjectSummary])
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    return [_to_summary(db, project) for project in projects]


@router.post("", response_model=ProjectSummary, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    if db.query(Project).filter(Project.name == payload.name).first():
        raise HTTPException(status_code=409, detail="같은 이름의 프로젝트가 이미 존재합니다.")
    project = Project(name=payload.name, description=payload.description)
    db.add(project)
    db.commit()
    db.refresh(project)
    return _to_summary(db, project)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

    # Unassign rather than cascade-delete: the underlying supplier/vCenter
    # data is independent of the project and must survive its deletion.
    db.query(LicenseItem).filter(LicenseItem.project_id == project_id).update(
        {"project_id": None}
    )
    db.query(VCenterInventoryItem).filter(VCenterInventoryItem.project_id == project_id).update(
        {"project_id": None}
    )
    db.query(VcfOpsCoreLicenseItem).filter(VcfOpsCoreLicenseItem.project_id == project_id).update(
        {"project_id": None}
    )
    db.query(CspLicenseItem).filter(CspLicenseItem.project_id == project_id).update(
        {"project_id": None}
    )
    db.query(User).filter(User.project_id == project_id).update({"project_id": None})
    db.delete(project)
    db.commit()


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    summary = _to_summary(db, project)
    items = (
        db.query(LicenseItem)
        .filter(LicenseItem.project_id == project_id)
        .order_by(LicenseItem.id)
        .all()
    )
    return ProjectDetail(**summary.model_dump(), license_items=items)


@router.post("/{project_id}/assign", response_model=ProjectDetail)
def assign_items(project_id: int, payload: AssignItemsRequest, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

    _reconcile_assignment(db, LicenseItem, project_id, set(payload.item_ids))
    return get_project(project_id, db)


@router.post("/{project_id}/assign-vcenter", response_model=list[int])
def assign_vcenter_items(
    project_id: int, payload: AssignItemsRequest, db: Session = Depends(get_db)
):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

    _reconcile_assignment(db, VCenterInventoryItem, project_id, set(payload.item_ids))

    assigned = (
        db.query(VCenterInventoryItem.id)
        .filter(VCenterInventoryItem.project_id == project_id)
        .all()
    )
    return [row[0] for row in assigned]


@router.post("/{project_id}/assign-vcf-ops", response_model=list[int])
def assign_vcf_ops_items(
    project_id: int, payload: AssignItemsRequest, db: Session = Depends(get_db)
):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

    _reconcile_assignment(db, VcfOpsCoreLicenseItem, project_id, set(payload.item_ids))

    assigned = (
        db.query(VcfOpsCoreLicenseItem.id)
        .filter(VcfOpsCoreLicenseItem.project_id == project_id)
        .all()
    )
    return [row[0] for row in assigned]


@router.post("/{project_id}/assign-csp", response_model=list[int])
def assign_csp_items(project_id: int, payload: AssignItemsRequest, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

    _reconcile_assignment(db, CspLicenseItem, project_id, set(payload.item_ids))

    assigned = db.query(CspLicenseItem.id).filter(CspLicenseItem.project_id == project_id).all()
    return [row[0] for row in assigned]
