from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class LicenseItem(Base):
    """One row of supplier license data, as uploaded via the Supplier Data tab."""

    __tablename__ = "license_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    upload_name: Mapped[str] = mapped_column(String, index=True, nullable=False)
    serial_number: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    parent_customer: Mapped[str | None] = mapped_column(String, nullable=True)
    customer_name: Mapped[str | None] = mapped_column(String, nullable=True)
    license_key: Mapped[str | None] = mapped_column(String, nullable=True)
    license_type: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    product_name: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    quantity_ent: Mapped[int] = mapped_column(Integer, default=0)
    contract_status: Mapped[str | None] = mapped_column(String, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    erp_site_id: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    enduser_account_name: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    part_number: Mapped[str | None] = mapped_column(String, nullable=True)
    division: Mapped[str | None] = mapped_column(String, nullable=True)

    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id"), nullable=True, index=True
    )
    project = relationship("Project", back_populates="license_items")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
