from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class CurrentUser(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool
    project_ids: list[int] = []
    project_names: list[str] = []


class LoginResponse(CurrentUser):
    token: str
