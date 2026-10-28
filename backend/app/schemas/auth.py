from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class CurrentUser(BaseModel):
    id: int
    username: str
    name: str | None = None
    email: str
    is_admin: bool
    show_supplier_menu: bool = False
    project_ids: list[int] = []
    project_names: list[str] = []


class LoginResponse(CurrentUser):
    token: str


class RecoveryKeyResponse(BaseModel):
    recovery_key: str


class ForgotPasswordInitRequest(BaseModel):
    username: str


class ForgotPasswordInitResponse(BaseModel):
    is_admin: bool
    has_email: bool
    security_questions: list[str]


class AdminResetPasswordRequest(BaseModel):
    username: str
    recovery_key: str
    new_password: str


class RequestOtpRequest(BaseModel):
    username: str


class VerifyOtpRequest(BaseModel):
    username: str
    code: str
    new_password: str


class VerifySecurityAnswersRequest(BaseModel):
    username: str
    answer_1: str
    answer_2: str
    answer_3: str
    new_password: str


class UpdateMeRequest(BaseModel):
    name: str | None = None
    password: str | None = None
    email: str | None = None
