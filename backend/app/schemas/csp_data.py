from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class CspLicenseItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    upload_name: str
    license_key: str | None
    product_name: str | None
    quantity: int
    unit: str | None
    folder_name: str | None
    contract_end_date: date | None
    project_id: int | None


class CspUploadResult(BaseModel):
    inserted: int
    updated: int
    skipped: int
    errors: list[str] = []


class CspLicenseItemPage(BaseModel):
    items: list[CspLicenseItemRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class CspUploadBatchRead(BaseModel):
    upload_name: str
    uploaded_at: datetime
    item_count: int


class CspDeleteUploadsRequest(BaseModel):
    upload_names: list[str]
