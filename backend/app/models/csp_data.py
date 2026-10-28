from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CspLicenseItem(Base):
    """One row of CSP (Broadcom CSP portal "AllLicenseKeys" export) license
    data, as uploaded via the Settings > CSP 현황 tab."""

    __tablename__ = "csp_license_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    upload_name: Mapped[str] = mapped_column(String, index=True, nullable=False)
    license_key: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    product_name: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    # The source "Quantity" column is a combined "<number> <unit>" string
    # (eg. "1432 Core", "48 Instance", "32 TiB") - split on import.
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    unit: Mapped[str | None] = mapped_column(String, nullable=True)
    folder_name: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    contract_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id"), nullable=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
