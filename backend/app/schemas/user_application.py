from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserApplicationCreate(BaseModel):
    name: str
    password: str
    email: str
    security_answer_1: str
    security_answer_2: str
    security_answer_3: str


class UserApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    password: str
    email: str
    security_answer_1: str
    security_answer_2: str
    security_answer_3: str
    created_at: datetime
