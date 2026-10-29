from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.license_item import LicenseItemRead


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    location: str | None = None
    user_ids: list[int] = []


class ProjectUpdate(BaseModel):
    name: str | None = None
    location: str | None = None


class ProjectSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    location: str | None
    created_at: datetime
    perpetual_quantity: int
    subscription_quantity: int
    item_count: int
    vcenter_count: int = 0
    vcenter_perpetual_quantity: int = 0
    vcenter_term_quantity: int = 0
    vcf_license_count: int = 0
    vcf_core_capacity: int = 0
    vcf_core_used: int = 0
    csp_license_count: int = 0
    csp_core_quantity: int = 0
    csp_core_quantity_expired: int = 0
    csp_core_sum: int = 0
    csp_processor_sum: int = 0
    user_count: int = 0


class ProjectDetail(ProjectSummary):
    license_items: list[LicenseItemRead]
