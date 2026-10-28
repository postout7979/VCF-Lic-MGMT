from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.approval_record import ApprovalRecord
from app.models.user import User
from app.models.user_application import UserApplication
from app.schemas.approval_record import ApprovalRecordRead
from app.schemas.user import UserRead
from app.schemas.user_application import UserApplicationRead

router = APIRouter(
    prefix="/user-applications",
    tags=["user-applications"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=list[UserApplicationRead])
def list_applications(db: Session = Depends(get_db)):
    return db.query(UserApplication).order_by(UserApplication.created_at.desc()).all()


@router.get("/approval-records", response_model=list[ApprovalRecordRead])
def list_approval_records(db: Session = Depends(get_db)):
    return db.query(ApprovalRecord).order_by(ApprovalRecord.approved_at.desc()).all()


@router.post("/{application_id}/approve", response_model=UserRead)
def approve_application(application_id: int, db: Session = Depends(get_db)):
    application = db.get(UserApplication, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="신청 내역을 찾을 수 없습니다.")
    if db.query(User).filter(User.username == application.email).first():
        raise HTTPException(status_code=409, detail="이미 등록된 이메일입니다.")

    user = User(
        username=application.email,
        name=application.name,
        password=application.password,
        email=application.email,
        security_answer_1=application.security_answer_1,
        security_answer_2=application.security_answer_2,
        security_answer_3=application.security_answer_3,
    )
    db.add(user)
    db.add(ApprovalRecord(name=application.name, email=application.email))
    db.delete(application)
    db.commit()
    db.refresh(user)
    return UserRead(
        id=user.id,
        username=user.username,
        name=user.name,
        password=user.password,
        email=user.email,
        is_admin=False,
        show_supplier_menu=user.show_supplier_menu,
        project_ids=[],
        project_names=[],
        security_answer_1=user.security_answer_1,
        security_answer_2=user.security_answer_2,
        security_answer_3=user.security_answer_3,
        created_at=user.created_at,
    )


@router.delete("/{application_id}", status_code=204)
def reject_application(application_id: int, db: Session = Depends(get_db)):
    application = db.get(UserApplication, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="신청 내역을 찾을 수 없습니다.")
    db.delete(application)
    db.commit()
