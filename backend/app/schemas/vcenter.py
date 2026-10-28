from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class VCenterConnectionCreate(BaseModel):
    name: str
    host: str
    username: str
    password: str
    version_hint: Literal["7.x", "8.x"]
    tls_skip: bool = True


class VCenterInventoryItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vcenter_name: str | None
    cluster_name: str | None
    host_name: str | None
    cpu_sockets: int | None
    cores_per_socket: int | None
    total_cores: int | None
    license_key: str | None
    license_category: str | None = None
    collected_at: datetime
    project_id: int | None = None


class VCenterConnectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    host: str
    username: str
    version_hint: str
    tls_skip: bool = True
    detected_version: str | None
    status: str
    last_error: str | None
    last_synced_at: datetime | None
    created_at: datetime
    host_count: int = 0
