from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.project import Project
from app.models.user import User, user_project_assignments
from app.schemas.user import AssignUserProjectRequest, UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_admin)])


def _to_read(user: User, db: Session) -> UserRead:
    projects = sorted(user.projects, key=lambda p: p.name)
    return UserRead(
        id=user.id,
        username=user.username,
        name=user.name,
        password=user.password,
        email=user.email,
        is_admin=user.is_admin,
        project_ids=[p.id for p in projects],
        project_names=[p.name for p in projects],
        security_answer_1=user.security_answer_1,
        security_answer_2=user.security_answer_2,
        security_answer_3=user.security_answer_3,
        created_at=user.created_at,
    )


@router.get("", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [_to_read(u, db) for u in users]


@router.post("", response_model=UserRead, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="이름을 입력해주세요.")
    if not payload.password:
        raise HTTPException(status_code=400, detail="Password를 입력해주세요.")
    if not payload.email.strip():
        raise HTTPException(status_code=400, detail="Email을 입력해주세요.")
    if (
        not payload.security_answer_1.strip()
        or not payload.security_answer_2.strip()
        or not payload.security_answer_3.strip()
    ):
        raise HTTPException(status_code=400, detail="비밀번호 초기화 질문 3개에 모두 답변해주세요.")
    email = payload.email.strip()
    if db.query(User).filter(User.username == email).first():
        raise HTTPException(status_code=409, detail="이미 등록된 이메일입니다.")

    user = User(
        username=email,
        name=payload.name.strip(),
        password=payload.password,
        email=email,
        security_answer_1=payload.security_answer_1.strip(),
        security_answer_2=payload.security_answer_2.strip(),
        security_answer_3=payload.security_answer_3.strip(),
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
            raise HTTPException(status_code=400, detail="Password를 입력해주세요.")
        user.password = payload.password

    if payload.email is not None:
        email = payload.email.strip()
        if not email:
            raise HTTPException(status_code=400, detail="Email을 입력해주세요.")
        if not user.is_admin:
            # Non-admin accounts log in with their email; keep username in sync.
            if (
                db.query(User)
                .filter(User.username == email, User.id != user_id)
                .first()
            ):
                raise HTTPException(status_code=409, detail="이미 등록된 이메일입니다.")
            user.username = email
        user.email = email

    if payload.security_answer_1 is not None:
        if not payload.security_answer_1.strip():
            raise HTTPException(status_code=400, detail="질문1 답변을 입력해주세요.")
        user.security_answer_1 = payload.security_answer_1.strip()

    if payload.security_answer_2 is not None:
        if not payload.security_answer_2.strip():
            raise HTTPException(status_code=400, detail="질문2 답변을 입력해주세요.")
        user.security_answer_2 = payload.security_answer_2.strip()

    if payload.security_answer_3 is not None:
        if not payload.security_answer_3.strip():
            raise HTTPException(status_code=400, detail="질문3 답변을 입력해주세요.")
        user.security_answer_3 = payload.security_answer_3.strip()

    db.commit()
    db.refresh(user)
    return _to_read(user, db)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if user.is_admin:
        raise HTTPException(status_code=400, detail="admin 계정은 삭제할 수 없습니다.")
    db.execute(user_project_assignments.delete().where(user_project_assignments.c.user_id == user_id))
    db.delete(user)
    db.commit()


@router.post("/{user_id}/assign-project", response_model=UserRead)
def assign_user_project(
    user_id: int, payload: AssignUserProjectRequest, db: Session = Depends(get_db)
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    desired_ids = set(payload.project_ids)
    projects = db.query(Project).filter(Project.id.in_(desired_ids)).all() if desired_ids else []
    found_ids = {p.id for p in projects}
    missing_ids = desired_ids - found_ids
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"존재하지 않는 프로젝트: {sorted(missing_ids)}")

    user.projects = projects
    db.commit()
    db.refresh(user)
    return _to_read(user, db)
