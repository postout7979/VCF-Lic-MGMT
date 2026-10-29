from pydantic import BaseModel


class StorageInfo(BaseModel):
    volume_total_bytes: int
    volume_used_bytes: int
    volume_available_bytes: int
    volume_used_percent: float
    db_size_bytes: int
