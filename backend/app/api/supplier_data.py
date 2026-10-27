import io

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.license_item import LicenseItem
from app.schemas.license_item import LicenseItemRead, UploadResult
from app.services.excel_import import import_excel

router = APIRouter(prefix="/supplier-data", tags=["supplier-data"])


@router.post("/upload", response_model=UploadResult)
def upload_supplier_data(file: UploadFile, db: Session = Depends(get_db)):
    if not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="엑셀 파일(.xlsx)만 업로드할 수 있습니다.")

    content = file.file.read()
    try:
        return import_excel(db, io.BytesIO(content))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("", response_model=list[LicenseItemRead])
def list_supplier_data(unassigned_only: bool = False, db: Session = Depends(get_db)):
    query = db.query(LicenseItem)
    if unassigned_only:
        query = query.filter(LicenseItem.project_id.is_(None))
    return query.order_by(LicenseItem.id).all()
