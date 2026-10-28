from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.project import Project
from app.models.user import User
from app.schemas.user import AssignUserProjectRequest, UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


def _to_read(user: User, db: Session) -> UserRead:
    project_name = None
    if user.project_id is not None:
        project = db.get(Project, user.project_id)
        project_name = project.name if project else None
    return UserRead(
        id=user.id,
        username=user.username,
        password=user.password,
        email=user.email,
        project_id=user.project_id,
        project_name=project_name,
        created_at=user.created_at,
    )


@router.get("", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [_to_read(u, db) for u in users]


@router.post("", response_model=UserRead, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    if not payload.username.strip():
        raise HTTPException(status_code=400, detail="Username을 입력해주세요.")
    if not payload.password:
        raise HTTPException(status_code=400, detail="Password를 입력해주세요.")
    if not payload.email.strip():
        raise HTTPException(status_code=400, detail="Email을 입력해주세요.")
    if db.query(User).filter(User.username == payload.username.strip()).first():
        raise HTTPException(status_code=409, detail="같은 Username이 이미 존재합니다.")

    user = User(
        username=payload.username.strip(),
        password=payload.password,
        email=payload.email.strip(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _to_read(user, db)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    if payload.username is not None:
        username = payload.username.strip()
        if not username:
            raise HTTPException(status_code=400, detail="Username을 입력해주세요.")
        if (
            db.query(User)
            .filter(User.username == username, User.id != user_id)
            .first()
        ):
            raise HTTPException(status_code=409, detail="같은 Username이 이미 존재합니다.")
        user.username = username

    if payload.password is not None:
        if not payload.password:
            raise HTTPException(status_code=400, detail="Password를 입력해주세요.")
        user.password = payload.password

    if payload.email is not None:
        email = payload.email.strip()
        if not email:
            raise HTTPException(status_code=400, detail="Email을 입력해주세요.")
        user.email = email

    db.commit()
    db.refresh(user)
    return _to_read(user, db)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    db.delete(user)
    db.commit()


@router.post("/{user_id}/assign-project", response_model=UserRead)
def assign_user_project(
    user_id: int, payload: AssignUserProjectRequest, db: Session = Depends(get_db)
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    if payload.project_id is not None and db.get(Project, payload.project_id) is None:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

    user.project_id = payload.project_id
    db.commit()
    db.refresh(user)
    return _to_read(user, db)
