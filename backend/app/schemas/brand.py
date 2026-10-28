from datetime import datetime

from pydantic import BaseModel


class BrandInfoResponse(BaseModel):
    has_background_image: bool
    has_logo_image: bool
    updated_at: datetime
