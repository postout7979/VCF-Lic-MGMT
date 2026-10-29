import secrets
from datetime import datetime, timedelta

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User

# Sliding idle timeout: a session is valid for this long after its last
# authenticated request, not a fixed time since login.
SESSION_IDLE_TIMEOUT = timedelta(minutes=10)


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def get_current_user(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    token = authorization.removeprefix("Bearer ").strip()
    user = db.query(User).filter(User.session_token == token).first() if token else None
    if user is None:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    now = datetime.utcnow()
    if (
        user.session_last_active_at is not None
        and now - user.session_last_active_at > SESSION_IDLE_TIMEOUT
    ):
        user.session_token = None
        user.session_last_active_at = None
        db.commit()
        raise HTTPException(status_code=401, detail="세션이 만료되었습니다. 다시 로그인해주세요.")

    user.session_last_active_at = now
    db.commit()
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    return user
