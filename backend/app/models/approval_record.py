from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ApprovalRecord(Base):
    """A log entry created each time Settings > 사용자 승인 approves a
    signup request, shown most-recent-first below the pending list."""

    __tablename__ = "approval_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    approved_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
