from datetime import date

from pydantic import BaseModel, ConfigDict


class LicenseItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    serial_number: str
    parent_customer: str | None
    customer_name: str | None
    license_key: str | None
    license_type: str | None
    product_name: str | None
    quantity_ent: int
    contract_status: str | None
    start_date: date | None
    end_date: date | None
    erp_site_id: str | None
    enduser_account_name: str | None
    part_number: str | None
    division: str | None
    project_id: int | None


class AssignItemsRequest(BaseModel):
    item_ids: list[int]


class UploadResult(BaseModel):
    inserted: int
    updated: int
    skipped: int
    errors: list[str] = []


class LicenseItemPage(BaseModel):
    items: list[LicenseItemRead]
    total: int
    page: int
    page_size: int
    total_pages: int
