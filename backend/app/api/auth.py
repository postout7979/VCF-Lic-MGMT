from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import generate_session_token, get_current_user
from app.core.database import get_db
from app.models.project import Project
from app.models.user import User
from app.schemas.auth import CurrentUser, LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _project_name(db: Session, user: User) -> str | None:
    if user.project_id is None:
        return None
    project = db.get(Project, user.project_id)
    return project.name if project else None


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username.strip()).first()
    if user is None or user.password != payload.password:
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
    user.session_token = generate_session_token()
    db.commit()
    db.refresh(user)
    return LoginResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_admin=user.is_admin,
        project_id=user.project_id,
        project_name=_project_name(db, user),
        token=user.session_token,
    )


@router.post("/logout", status_code=204)
def logout(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.session_token = None
    db.commit()


@router.get("/me", response_model=CurrentUser)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return CurrentUser(
        id=user.id,
        username=user.username,
        email=user.email,
        is_admin=user.is_admin,
        project_id=user.project_id,
        project_name=_project_name(db, user),
    )
