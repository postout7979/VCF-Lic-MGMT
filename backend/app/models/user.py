from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    """A user record managed from Settings > 사용자, and also a login account.
    The seeded "admin" user (is_admin=True) has access to every menu;
    everyone else is restricted to their assigned project and cannot see
    Settings."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    # NOTE: stored in plain text for this internal tool, consistent with the
    # other credential storage here (vCenter/VCF Operations connections);
    # revisit before this is used for real authentication.
    password: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Opaque bearer token issued at login; cleared on logout. A single active
    # session per user is enough for this internal tool.
    session_token: Mapped[str | None] = mapped_column(String, nullable=True, unique=True, index=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
