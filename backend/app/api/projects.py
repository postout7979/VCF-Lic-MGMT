from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.license_item import LicenseItem
from app.models.project import Project
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
    return ProjectSummary(
        id=project.id,
        name=project.name,
        description=project.description,
        created_at=project.created_at,
        perpetual_quantity=_quantity_sum(db, project.id, "PERPETUAL"),
        subscription_quantity=_quantity_sum(db, project.id, "SUBSCRIPTION"),
        item_count=item_count,
    )


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

    items = db.query(LicenseItem).filter(LicenseItem.id.in_(payload.item_ids)).all()
    found_ids = {item.id for item in items}
    missing_ids = set(payload.item_ids) - found_ids
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"존재하지 않는 항목: {sorted(missing_ids)}")

    already_assigned = [item.id for item in items if item.project_id is not None]
    if already_assigned:
        raise HTTPException(
            status_code=409,
            detail=f"이미 다른 프로젝트에 할당된 항목입니다: {sorted(already_assigned)}",
        )

    for item in items:
        item.project_id = project_id
    db.commit()

    return get_project(project_id, db)
