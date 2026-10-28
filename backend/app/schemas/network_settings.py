from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NetworkSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dns_server: str
    ntp_server: str
    updated_at: datetime


class NetworkSettingsUpdate(BaseModel):
    dns_server: str
    ntp_server: str
