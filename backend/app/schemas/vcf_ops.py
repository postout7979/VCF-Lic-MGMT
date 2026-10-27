from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator


class VcfOpsConnectionCreate(BaseModel):
    name: str
    host: str
    auth_method: Literal["credentials", "token"]
    username: str | None = None
    password: str | None = None
    api_token: str | None = None

    @model_validator(mode="after")
    def _validate_auth_fields(self) -> "VcfOpsConnectionCreate":
        if self.auth_method == "credentials":
            if not self.username or not self.password:
                raise ValueError("아이디/비밀번호 인증에는 사용자 이름과 비밀번호가 필요합니다.")
        else:
            if not self.api_token:
                raise ValueError("토큰 인증에는 API 토큰이 필요합니다.")
        return self


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
    auth_method: str
    username: str | None
    detected_version: str | None
    status: str
    last_error: str | None
    last_synced_at: datetime | None
    created_at: datetime
    license_count: int = 0
