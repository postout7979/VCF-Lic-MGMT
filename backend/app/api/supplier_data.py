import io
import math

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.license_item import LicenseItem
from app.schemas.license_item import LicenseItemPage, LicenseItemRead, UploadResult
from app.services.excel_import import import_excel

router = APIRouter(prefix="/supplier-data", tags=["supplier-data"])

SEARCHABLE_FIELDS = {
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


@router.post("/upload", response_model=UploadResult)
def upload_supplier_data(file: UploadFile, db: Session = Depends(get_db)):
    if not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="엑셀 파일(.xlsx)만 업로드할 수 있습니다.")

    content = file.file.read()
    try:
        return import_excel(db, io.BytesIO(content))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("", status_code=204)
def delete_all_supplier_data(db: Session = Depends(get_db)):
    db.query(LicenseItem).delete()
    db.commit()


@router.get("", response_model=list[LicenseItemRead])
def list_supplier_data(
    unassigned_only: bool = False,
    assignable_for_project: int | None = None,
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
):
    query = db.query(LicenseItem)

    if search_field and search_query:
        column = SEARCHABLE_FIELDS.get(search_field)
        if column is None:
            raise HTTPException(status_code=400, detail=f"검색할 수 없는 항목입니다: {search_field}")
        query = query.filter(column.ilike(f"%{search_query}%"))

    total = query.count()
    items = (
        query.order_by(LicenseItem.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total_pages = max(1, math.ceil(total / page_size))

    return LicenseItemPage(
        items=items, total=total, page=page, page_size=page_size, total_pages=total_pages
    )
