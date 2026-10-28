from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    username: str
    password: str
    email: str


class UserUpdate(BaseModel):
    username: str | None = None
    password: str | None = None
    email: str | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    password: str
    email: str
    is_admin: bool = False
    project_ids: list[int] = []
    project_names: list[str] = []
    created_at: datetime


class AssignUserProjectRequest(BaseModel):
    project_ids: list[int]
