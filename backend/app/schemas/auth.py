from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class CurrentUser(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool
    project_id: int | None
    project_name: str | None


class LoginResponse(CurrentUser):
    token: str
