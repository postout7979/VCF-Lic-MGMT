from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    name: str
    password: str
    email: str
    security_answer_1: str
    security_answer_2: str
    security_answer_3: str


class UserUpdate(BaseModel):
    name: str | None = None
    password: str | None = None
    email: str | None = None
    security_answer_1: str | None = None
    security_answer_2: str | None = None
    security_answer_3: str | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    name: str | None = None
    password: str
    email: str
    is_admin: bool = False
    project_ids: list[int] = []
    project_names: list[str] = []
    security_answer_1: str | None = None
    security_answer_2: str | None = None
    security_answer_3: str | None = None
    created_at: datetime


class AssignUserProjectRequest(BaseModel):
    project_ids: list[int]
