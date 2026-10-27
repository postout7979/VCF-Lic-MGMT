from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.license import License
from app.schemas.license import LicenseCreate, LicenseRead

router = APIRouter(prefix="/licenses", tags=["licenses"])


@router.get("", response_model=list[LicenseRead])
def list_licenses(db: Session = Depends(get_db)):
    return db.query(License).all()


@router.post("", response_model=LicenseRead, status_code=201)
def create_license(payload: LicenseCreate, db: Session = Depends(get_db)):
    license_ = License(**payload.model_dump())
    db.add(license_)
    db.commit()
    db.refresh(license_)
    return license_


@router.get("/{license_id}", response_model=LicenseRead)
def get_license(license_id: int, db: Session = Depends(get_db)):
    license_ = db.get(License, license_id)
    if license_ is None:
        raise HTTPException(status_code=404, detail="License not found")
    return license_


@router.delete("/{license_id}", status_code=204)
def delete_license(license_id: int, db: Session = Depends(get_db)):
    license_ = db.get(License, license_id)
    if license_ is None:
        raise HTTPException(status_code=404, detail="License not found")
    db.delete(license_)
    db.commit()
