from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SmtpSettings(Base):
    """Singleton row (id=1) holding the outbound SMTP relay configuration
    used to send password-reset emails, configured from Settings > SMTP."""

    __tablename__ = "smtp_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    host: Mapped[str] = mapped_column(String, nullable=False, default="")
    port: Mapped[int] = mapped_column(Integer, nullable=False, default=587)
    username: Mapped[str] = mapped_column(String, nullable=False, default="")
    # NOTE: plain text, consistent with other credential storage in this app.
    password: Mapped[str] = mapped_column(String, nullable=False, default="")
    use_tls: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    from_address: Mapped[str] = mapped_column(String, nullable=False, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
