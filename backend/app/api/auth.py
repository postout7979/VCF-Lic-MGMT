import hashlib
import random
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import generate_session_token, get_current_user, require_admin
from app.core.database import get_db
from app.core.security_questions import SECURITY_QUESTIONS
from app.core.validation import is_valid_email_format
from app.models.user import User
from app.models.user_application import UserApplication
from app.schemas.auth import (
    AdminResetPasswordRequest,
    CurrentUser,
    ForgotPasswordInitRequest,
    ForgotPasswordInitResponse,
    LoginRequest,
    LoginResponse,
    RecoveryKeyResponse,
    RequestOtpRequest,
    UpdateMeRequest,
    VerifyOtpRequest,
    VerifySecurityAnswersRequest,
)
from app.schemas.user_application import UserApplicationCreate
from app.services.email_service import EmailNotConfiguredError, send_email

router = APIRouter(prefix="/auth", tags=["auth"])

OTP_TTL_SECONDS = 120


def _current_user_fields(user: User) -> dict:
    projects = sorted(user.projects, key=lambda p: p.name)
    return {
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "email": user.email,
        "is_admin": user.is_admin,
        "show_supplier_menu": user.show_supplier_menu,
        "project_ids": [p.id for p in projects],
        "project_names": [p.name for p in projects],
    }


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    username = payload.username.strip()
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        if is_valid_email_format(username):
            raise HTTPException(status_code=401, detail="존재하지 않는 이메일입니다.")
        raise HTTPException(status_code=401, detail="이메일 형식이 올바르지 않습니다.")
    if user.password != payload.password:
        raise HTTPException(status_code=401, detail="비밀번호가 올바르지 않습니다.")
    user.session_token = generate_session_token()
    db.commit()
    db.refresh(user)
    return LoginResponse(**_current_user_fields(user), token=user.session_token)


@router.post("/logout", status_code=204)
def logout(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.session_token = None
    db.commit()


@router.get("/me", response_model=CurrentUser)
def me(user: User = Depends(get_current_user)):
    return CurrentUser(**_current_user_fields(user))


@router.patch("/me", response_model=CurrentUser)
def update_me(
    payload: UpdateMeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.name is not None:
        if user.is_admin:
            raise HTTPException(
                status_code=400, detail="admin 계정은 이메일과 비밀번호만 수정할 수 있습니다."
            )
        if not payload.name.strip():
            raise HTTPException(status_code=400, detail="이름을 입력해주세요.")
        user.name = payload.name.strip()
    if payload.password is not None:
        if not payload.password:
            raise HTTPException(status_code=400, detail="비밀번호를 입력해주세요.")
        user.password = payload.password
    if payload.email is not None:
        if not user.is_admin:
            raise HTTPException(
                status_code=400, detail="이메일은 관리자만 변경할 수 있습니다."
            )
        email = payload.email.strip()
        if not email:
            raise HTTPException(status_code=400, detail="이메일을 입력해주세요.")
        if not is_valid_email_format(email):
            raise HTTPException(status_code=400, detail="이메일 형식이 올바르지 않습니다.")
        user.email = email
    db.commit()
    db.refresh(user)
    return CurrentUser(**_current_user_fields(user))


@router.post("/signup-request", status_code=201)
def signup_request(payload: UserApplicationCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    email = payload.email.strip()
    if not name:
        raise HTTPException(status_code=400, detail="이름을 입력해주세요.")
    if not payload.password:
        raise HTTPException(status_code=400, detail="Password를 입력해주세요.")
    if not email:
        raise HTTPException(status_code=400, detail="Email을 입력해주세요.")
    if not is_valid_email_format(email):
        raise HTTPException(status_code=400, detail="이메일 형식이 올바르지 않습니다.")
    if (
        not payload.security_answer_1.strip()
        or not payload.security_answer_2.strip()
        or not payload.security_answer_3.strip()
    ):
        raise HTTPException(status_code=400, detail="비밀번호 초기화 질문 3개에 모두 답변해주세요.")
    if db.query(User).filter(User.username == email).first():
        raise HTTPException(status_code=409, detail="이미 등록된 이메일입니다.")
    if db.query(UserApplication).filter(UserApplication.email == email).first():
        raise HTTPException(status_code=409, detail="이미 동일한 이메일로 신청이 접수되어 있습니다.")

    application = UserApplication(
        name=name,
        password=payload.password,
        email=email,
        security_answer_1=payload.security_answer_1.strip(),
        security_answer_2=payload.security_answer_2.strip(),
        security_answer_3=payload.security_answer_3.strip(),
    )
    db.add(application)
    db.commit()


@router.post("/admin/recovery-key", response_model=RecoveryKeyResponse)
def generate_recovery_key(
    user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    raw_key = secrets.token_hex(16)  # 128-bit
    user.recovery_key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    user.recovery_key_created_at = datetime.utcnow()
    db.commit()
    return RecoveryKeyResponse(recovery_key=raw_key)


@router.post("/forgot-password/init", response_model=ForgotPasswordInitResponse)
def forgot_password_init(payload: ForgotPasswordInitRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username.strip()).first()
    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return ForgotPasswordInitResponse(
        is_admin=user.is_admin,
        has_email=bool(user.email),
        security_questions=SECURITY_QUESTIONS,
    )


@router.post("/forgot-password/admin-reset", status_code=204)
def admin_reset_password(payload: AdminResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username.strip()).first()
    if user is None or not user.is_admin:
        raise HTTPException(status_code=404, detail="관리자 계정을 찾을 수 없습니다.")
    if not user.recovery_key_hash:
        raise HTTPException(
            status_code=400,
            detail="발급된 복구 키가 없습니다. 설정 > 사용자 메뉴에서 복구 키를 먼저 생성해주세요.",
        )
    if not payload.new_password:
        raise HTTPException(status_code=400, detail="새 비밀번호를 입력해주세요.")
    key_hash = hashlib.sha256(payload.recovery_key.strip().encode()).hexdigest()
    if not secrets.compare_digest(key_hash, user.recovery_key_hash):
        raise HTTPException(status_code=401, detail="복구 키가 올바르지 않습니다.")
    user.password = payload.new_password
    # Single-use: the key is invalidated once it resets a password.
    user.recovery_key_hash = None
    user.session_token = None
    db.commit()


@router.post("/forgot-password/request-otp", status_code=204)
def request_otp(payload: RequestOtpRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username.strip()).first()
    if user is None or user.is_admin:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if not user.email:
        raise HTTPException(status_code=400, detail="등록된 이메일이 없습니다.")
    code = f"{random.randint(0, 999999):06d}"
    user.reset_otp_code = code
    user.reset_otp_expires_at = datetime.utcnow() + timedelta(seconds=OTP_TTL_SECONDS)
    db.commit()
    try:
        send_email(
            db,
            user.email,
            "VCF License Management 비밀번호 초기화 인증코드",
            f"인증코드: {code}\n이 코드는 {OTP_TTL_SECONDS}초 동안 유효합니다.",
        )
    except EmailNotConfiguredError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(status_code=502, detail=f"메일 발송에 실패했습니다: {err}") from err


@router.post("/forgot-password/verify-otp", status_code=204)
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username.strip()).first()
    if user is None or user.is_admin:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if not payload.new_password:
        raise HTTPException(status_code=400, detail="새 비밀번호를 입력해주세요.")
    if (
        not user.reset_otp_code
        or user.reset_otp_expires_at is None
        or datetime.utcnow() > user.reset_otp_expires_at
        or payload.code.strip() != user.reset_otp_code
    ):
        raise HTTPException(status_code=401, detail="인증코드가 올바르지 않거나 만료되었습니다.")
    user.password = payload.new_password
    user.reset_otp_code = None
    user.reset_otp_expires_at = None
    user.session_token = None
    db.commit()


@router.post("/forgot-password/verify-security-answers", status_code=204)
def verify_security_answers(payload: VerifySecurityAnswersRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username.strip()).first()
    if user is None or user.is_admin:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if not payload.new_password:
        raise HTTPException(status_code=400, detail="새 비밀번호를 입력해주세요.")
    matches = (
        (user.security_answer_1 or "").strip() == payload.answer_1.strip()
        and (user.security_answer_2 or "").strip() == payload.answer_2.strip()
        and (user.security_answer_3 or "").strip() == payload.answer_3.strip()
    )
    if not matches:
        raise HTTPException(status_code=401, detail="답변이 올바르지 않습니다.")
    user.password = payload.new_password
    user.session_token = None
    db.commit()
