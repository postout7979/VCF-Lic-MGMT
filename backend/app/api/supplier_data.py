import io
import math
from datetime import date

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.license_item import LicenseItem
from app.models.user import User
from app.schemas.license_item import (
    DeleteUploadsRequest,
    LicenseItemPage,
    LicenseItemRead,
    UploadBatchRead,
    UploadResult,
)
from app.services.excel_import import import_excel

router = APIRouter(prefix="/supplier-data", tags=["supplier-data"])

SEARCHABLE_FIELDS = {
    "upload_name": LicenseItem.upload_name,
    "serial_number": LicenseItem.serial_number,
    "parent_customer": LicenseItem.parent_customer,
    "customer_name": LicenseItem.customer_name,
    "license_key": LicenseItem.license_key,
    "license_type": LicenseItem.license_type,
    "product_name": LicenseItem.product_name,
    "contract_status": LicenseItem.contract_status,
    "erp_site_id": LicenseItem.erp_site_id,
    "enduser_account_name": LicenseItem.enduser_account_name,
    "part_number": LicenseItem.part_number,
    "division": LicenseItem.division,
}

SORTABLE_FIELDS = {
    **SEARCHABLE_FIELDS,
    "quantity_ent": LicenseItem.quantity_ent,
    "start_date": LicenseItem.start_date,
    "end_date": LicenseItem.end_date,
}


@router.post("/upload", response_model=UploadResult)
def upload_supplier_data(
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
        return import_excel(db, io.BytesIO(content), upload_name.strip())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("", status_code=204)
def delete_all_supplier_data(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    db.query(LicenseItem).delete()
    db.commit()


@router.delete("/expired", status_code=204)
def delete_expired_supplier_data(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    db.query(LicenseItem).filter(
        LicenseItem.end_date.is_not(None), LicenseItem.end_date < date.today()
    ).delete(synchronize_session=False)
    db.commit()


@router.get("/uploads", response_model=list[UploadBatchRead])
def list_uploads(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    rows = (
        db.query(
            LicenseItem.upload_name,
            func.max(LicenseItem.updated_at).label("uploaded_at"),
            func.count(LicenseItem.id).label("item_count"),
        )
        .group_by(LicenseItem.upload_name)
        .order_by(func.max(LicenseItem.updated_at).desc())
        .all()
    )
    return [
        UploadBatchRead(upload_name=row.upload_name, uploaded_at=row.uploaded_at, item_count=row.item_count)
        for row in rows
    ]


@router.delete("/uploads", status_code=204)
def delete_uploads(
    payload: DeleteUploadsRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    if not payload.upload_names:
        return
    db.query(LicenseItem).filter(LicenseItem.upload_name.in_(payload.upload_names)).delete(
        synchronize_session=False
    )
    db.commit()


@router.get("", response_model=list[LicenseItemRead])
def list_supplier_data(
    unassigned_only: bool = False,
    assignable_for_project: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(LicenseItem)
    if assignable_for_project is not None:
        query = query.filter(
            (LicenseItem.project_id.is_(None)) | (LicenseItem.project_id == assignable_for_project)
        )
    elif unassigned_only:
        query = query.filter(LicenseItem.project_id.is_(None))
    return query.order_by(LicenseItem.id).all()


@router.get("/search", response_model=LicenseItemPage)
def search_supplier_data(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    search_field: str | None = None,
    search_query: str | None = None,
    sort_field: str | None = None,
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(LicenseItem)

    if search_field and search_query:
        column = SEARCHABLE_FIELDS.get(search_field)
        if column is None:
            raise HTTPException(status_code=400, detail=f"검색할 수 없는 항목입니다: {search_field}")
        query = query.filter(column.ilike(f"%{search_query}%"))

    total = query.count()

    order_column = SORTABLE_FIELDS.get(sort_field) if sort_field else None
    if order_column is not None:
        order_by = order_column.desc() if sort_order == "desc" else order_column.asc()
    else:
        order_by = LicenseItem.id.asc()

    items = query.order_by(order_by).offset((page - 1) * page_size).limit(page_size).all()
    total_pages = max(1, math.ceil(total / page_size))

    return LicenseItemPage(
        items=items, total=total, page=page, page_size=page_size, total_pages=total_pages
    )
