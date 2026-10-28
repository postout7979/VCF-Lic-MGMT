from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UserApplication(Base):
    """A pending self-service signup request submitted from the login page.
    Reviewed from Settings > 사용자 승인; approving one creates the matching
    User row (whose username becomes this email address) and removes this
    record, rejecting just removes it."""

    __tablename__ = "user_applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    password: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    security_answer_1: Mapped[str] = mapped_column(String, nullable=False)
    security_answer_2: Mapped[str] = mapped_column(String, nullable=False)
    security_answer_3: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
