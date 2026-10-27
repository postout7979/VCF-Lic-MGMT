from datetime import datetime

from pydantic import BaseModel, ConfigDict


class VcfOpsConnectionCreate(BaseModel):
    name: str
    host: str
    username: str
    password: str


class VcfOpsCoreLicenseItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    license_key: str | None
    license_type: str | None
    license_status: str | None
    domain_name: str | None
    core_capacity: int | None
    core_used: int | None
    collected_at: datetime


class VcfOpsConnectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    host: str
    username: str
    detected_version: str | None
    status: str
    last_error: str | None
    last_synced_at: datetime | None
    created_at: datetime
    license_count: int = 0
