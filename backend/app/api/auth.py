from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import generate_session_token, get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import CurrentUser, LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _current_user_fields(user: User) -> dict:
    projects = sorted(user.projects, key=lambda p: p.name)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_admin": user.is_admin,
        "project_ids": [p.id for p in projects],
        "project_names": [p.name for p in projects],
    }


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username.strip()).first()
    if user is None or user.password != payload.password:
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
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
