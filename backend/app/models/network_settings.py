from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class NetworkSettings(Base):
    """Singleton row (id=1) holding the DNS/NTP server addresses used when
    sending SMTP mail: DNS to resolve the relay host, NTP to timestamp the
    outgoing message's Date header, both configured from Settings > Network."""

    __tablename__ = "network_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dns_server: Mapped[str] = mapped_column(String, nullable=False, default="")
    ntp_server: Mapped[str] = mapped_column(String, nullable=False, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
