from datetime import datetime

from pydantic import BaseModel, ConfigDict


class VcfOpsConnectionCreate(BaseModel):
    name: str
    host: str
    username: str
    password: str
    tls_skip: bool = True
    sync_interval_minutes: int = 60


class VcfOpsSyncIntervalUpdate(BaseModel):
    minutes: int


class VcfOpsCoreLicenseItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    connection_name: str | None = None
    connection_host: str | None = None
    license_key: str | None
    license_type: str | None
    license_status: str | None
    domain_name: str | None
    core_capacity: int | None
    core_used: int | None
    verified_core_used: int | None
    collected_at: datetime
    project_id: int | None


class VcfOpsConnectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    host: str
    username: str
    tls_skip: bool = True
    sync_interval_minutes: int = 60
    detected_version: str | None
    status: str
    last_error: str | None
    last_synced_at: datetime | None
    created_at: datetime
    license_count: int = 0
