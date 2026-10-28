from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

user_project_assignments = Table(
    "user_project_assignments",
    Base.metadata,
    Column("user_id", ForeignKey("users.id"), primary_key=True),
    Column("project_id", ForeignKey("projects.id"), primary_key=True),
)


class User(Base):
    """A user record managed from Settings > 사용자, and also a login account.
    The seeded "admin" user (is_admin=True) has access to every menu;
    everyone else is restricted to their assigned project(s) (zero or more,
    via user_project_assignments) and cannot see Settings."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # For the admin account this is the literal "admin". For every other
    # account it's kept in sync with `email` - non-admin users log in with
    # their email address.
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    # NOTE: stored in plain text for this internal tool, consistent with the
    # other credential storage here (vCenter/VCF Operations connections);
    # revisit before this is used for real authentication.
    password: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    # Display name. Collected instead of a username on signup/creation for
    # non-admin accounts (whose login id is their email instead).
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Opaque bearer token issued at login; cleared on logout. A single active
    # session per user is enough for this internal tool.
    session_token: Mapped[str | None] = mapped_column(String, nullable=True, unique=True, index=True)

    # Password-reset fallback answers (set at account creation/edit), used
    # when email delivery isn't available. Not applicable to the admin
    # account, which resets via a downloadable recovery key instead.
    security_answer_1: Mapped[str | None] = mapped_column(String, nullable=True)
    security_answer_2: Mapped[str | None] = mapped_column(String, nullable=True)
    security_answer_3: Mapped[str | None] = mapped_column(String, nullable=True)

    # Admin-only: sha256 of a 128-bit recovery key, downloaded once from
    # Settings > 사용자 and used on the login page's password-reset flow.
    # Cleared after use (single-use) so a leaked key can't be reused.
    recovery_key_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    recovery_key_created_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Non-admin: a short-lived one-time code emailed for password reset.
    reset_otp_code: Mapped[str | None] = mapped_column(String, nullable=True)
    reset_otp_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    projects = relationship("Project", secondary=user_project_assignments)
