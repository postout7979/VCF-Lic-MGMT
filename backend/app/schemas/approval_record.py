from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ApprovalRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    approved_at: datetime
