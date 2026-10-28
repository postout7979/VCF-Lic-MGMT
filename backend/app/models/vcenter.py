from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class VCenterConnection(Base):
    """A registered vCenter adapter (Legacy Infra tab)."""

    __tablename__ = "vcenter_connections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    host: Mapped[str] = mapped_column(String, nullable=False)
    username: Mapped[str] = mapped_column(String, nullable=False)
    # NOTE: stored in plain text for this internal tool; use a secrets
    # manager / encrypted column before exposing this beyond a trusted network.
    password: Mapped[str] = mapped_column(String, nullable=False)
    version_hint: Mapped[str] = mapped_column(String, nullable=False)  # "7.x" or "8.x" as selected
    # Internal vCenters are commonly self-signed; defaults to true so
    # certificate validation is skipped unless explicitly turned off.
    tls_skip: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    detected_version: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending|connected|failed
    last_error: Mapped[str | None] = mapped_column(String, nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sync_interval_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    inventory_items = relationship(
        "VCenterInventoryItem", back_populates="connection", cascade="all, delete-orphan"
    )


class VCenterInventoryItem(Base):
    """One collected host record from a vCenter adapter sync."""

    __tablename__ = "vcenter_inventory_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    connection_id: Mapped[int] = mapped_column(
        ForeignKey("vcenter_connections.id"), nullable=False, index=True
    )
    vcenter_name: Mapped[str | None] = mapped_column(String, nullable=True)
    cluster_name: Mapped[str | None] = mapped_column(String, nullable=True)
    host_name: Mapped[str | None] = mapped_column(String, nullable=True)
    cpu_sockets: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cores_per_socket: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_cores: Mapped[int | None] = mapped_column(Integer, nullable=True)
    license_key: Mapped[str | None] = mapped_column(String, nullable=True)
    license_category: Mapped[str | None] = mapped_column(String, nullable=True)  # PERPETUAL|SUBSCRIPTION
    collected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id"), nullable=True, index=True
    )

    connection = relationship("VCenterConnection", back_populates="inventory_items")
    project = relationship("Project", back_populates="vcenter_items")
