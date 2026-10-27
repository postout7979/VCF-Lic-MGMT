from datetime import date

from pydantic import BaseModel, ConfigDict


class LicenseBase(BaseModel):
    key: str
    product: str
    description: str | None = None
    expires_on: date | None = None


class LicenseCreate(LicenseBase):
    pass


class LicenseRead(LicenseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
