from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class VcfOpsConnection(Base):
    """A registered VCF 9 Operations connection (Settings > VCF tab)."""

    __tablename__ = "vcf_ops_connections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    host: Mapped[str] = mapped_column(String, nullable=False)
    username: Mapped[str] = mapped_column(String, nullable=False)
    # NOTE: stored in plain text for this internal tool; use a secrets
    # manager / encrypted column before exposing this beyond a trusted network.
    password: Mapped[str] = mapped_column(String, nullable=False)
    detected_version: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending|connected|failed
    last_error: Mapped[str | None] = mapped_column(String, nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    core_license_items = relationship(
        "VcfOpsCoreLicenseItem", back_populates="connection", cascade="all, delete-orphan"
    )


class VcfOpsCoreLicenseItem(Base):
    """One collected core-license allocation/usage record from a VCF Operations sync."""

    __tablename__ = "vcf_ops_core_license_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    connection_id: Mapped[int] = mapped_column(
        ForeignKey("vcf_ops_connections.id"), nullable=False, index=True
    )
    license_key: Mapped[str | None] = mapped_column(String, nullable=True)
    license_type: Mapped[str | None] = mapped_column(String, nullable=True)
    license_status: Mapped[str | None] = mapped_column(String, nullable=True)
    domain_name: Mapped[str | None] = mapped_column(String, nullable=True)
    core_capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    core_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    collected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    connection = relationship("VcfOpsConnection", back_populates="core_license_items")
