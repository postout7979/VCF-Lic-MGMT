import io
import math
from datetime import date

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_admin
from app.core.database import get_db
from app.core.search_filters import apply_filters
from app.models.csp_data import CspLicenseItem
from app.models.user import User
from app.schemas.csp_data import (
    CspDeleteUploadsRequest,
    CspLicenseItemPage,
    CspLicenseItemRead,
    CspUploadBatchRead,
    CspUploadResult,
)
from app.services.csp_excel_import import import_csp_excel

router = APIRouter(prefix="/csp-data", tags=["csp-data"])

SEARCHABLE_FIELDS = {
    "upload_name": CspLicenseItem.upload_name,
    "license_key": CspLicenseItem.license_key,
    "product_name": CspLicenseItem.product_name,
    "folder_name": CspLicenseItem.folder_name,
}

SORTABLE_FIELDS = {
    **SEARCHABLE_FIELDS,
    "quantity": CspLicenseItem.quantity,
    "unit": CspLicenseItem.unit,
    "contract_end_date": CspLicenseItem.contract_end_date,
}


@router.post("/upload", response_model=CspUploadResult)
def upload_csp_data(
    file: UploadFile,
    upload_name: str = Form(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="엑셀 파일(.xlsx)만 업로드할 수 있습니다.")
    if not upload_name.strip():
        raise HTTPException(status_code=400, detail="업로드 이름을 입력해주세요.")

    content = file.file.read()
    try:
        return import_csp_excel(db, io.BytesIO(content), upload_name.strip())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("", status_code=204)
def delete_all_csp_data(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    db.query(CspLicenseItem).delete()
    db.commit()


@router.delete("/expired", status_code=204)
def delete_expired_csp_data(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    db.query(CspLicenseItem).filter(
        CspLicenseItem.contract_end_date.is_not(None),
        CspLicenseItem.contract_end_date < date.today(),
    ).delete(synchronize_session=False)
    db.commit()


@router.get("/uploads", response_model=list[CspUploadBatchRead])
def list_uploads(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    rows = (
        db.query(
            CspLicenseItem.upload_name,
            func.max(CspLicenseItem.updated_at).label("uploaded_at"),
            func.count(CspLicenseItem.id).label("item_count"),
        )
        .group_by(CspLicenseItem.upload_name)
        .order_by(func.max(CspLicenseItem.updated_at).desc())
        .all()
    )
    return [
        CspUploadBatchRead(upload_name=row.upload_name, uploaded_at=row.uploaded_at, item_count=row.item_count)
        for row in rows
    ]


@router.delete("/uploads", status_code=204)
def delete_uploads(
    payload: CspDeleteUploadsRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    if not payload.upload_names:
        return
    db.query(CspLicenseItem).filter(CspLicenseItem.upload_name.in_(payload.upload_names)).delete(
        synchronize_session=False
    )
    db.commit()


@router.get("", response_model=list[CspLicenseItemRead])
def list_csp_data(
    unassigned_only: bool = False,
    assignable_for_project: int | None = None,
    assigned_to_project: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(CspLicenseItem)
    if not current_user.is_admin:
        project_ids = [p.id for p in current_user.projects]
        if not project_ids:
            return []
        return query.filter(CspLicenseItem.project_id.in_(project_ids)).order_by(
            CspLicenseItem.id
        ).all()
    if assigned_to_project is not None:
        query = query.filter(CspLicenseItem.project_id == assigned_to_project)
    elif assignable_for_project is not None:
        query = query.filter(
            (CspLicenseItem.project_id.is_(None)) | (CspLicenseItem.project_id == assignable_for_project)
        )
    elif unassigned_only:
        query = query.filter(CspLicenseItem.project_id.is_(None))
    return query.order_by(CspLicenseItem.id).all()


@router.get("/search", response_model=CspLicenseItemPage)
def search_csp_data(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    filters: str | None = None,
    sort_field: str | None = None,
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    # This tab only ever manages vSphere CSP entitlements - other CSP
    # products (vSAN, NSX, etc.) are out of scope for this list by default.
    query = db.query(CspLicenseItem).filter(
        or_(
            CspLicenseItem.product_name.ilike("vsphere%"),
            CspLicenseItem.product_name.ilike("vmware vsphere%"),
        )
    )
    query = apply_filters(query, filters, SEARCHABLE_FIELDS)

    total = query.count()

    order_column = SORTABLE_FIELDS.get(sort_field) if sort_field else None
    if order_column is not None:
        order_by = order_column.desc() if sort_order == "desc" else order_column.asc()
    else:
        order_by = CspLicenseItem.id.asc()

    items = query.order_by(order_by).offset((page - 1) * page_size).limit(page_size).all()
    total_pages = max(1, math.ceil(total / page_size))

    return CspLicenseItemPage(
        items=items, total=total, page=page, page_size=page_size, total_pages=total_pages
    )
