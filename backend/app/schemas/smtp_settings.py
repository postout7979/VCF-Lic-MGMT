from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SmtpSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    host: str
    port: int
    username: str
    password: str
    use_tls: bool
    from_address: str
    updated_at: datetime


class SmtpSettingsUpdate(BaseModel):
    host: str
    port: int
    username: str
    password: str
    use_tls: bool
    from_address: str


class SmtpTestRequest(BaseModel):
    to_address: str
