from datetime import datetime

from sqlalchemy import DateTime, Integer, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class BrandSettings(Base):
    """Singleton row (id=1) holding the login page's optional custom
    branding: a translucent background image and a logo shown above the
    login box, both configured from Settings > 브랜드."""

    __tablename__ = "brand_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    background_image: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    background_image_mimetype: Mapped[str | None] = mapped_column(String, nullable=True)
    logo_image: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    logo_image_mimetype: Mapped[str | None] = mapped_column(String, nullable=True)

    # The permanent baseline that "배경화면 및 기업 로고 초기화" restores to -
    # captured once (the first background/logo ever set) and left alone by
    # later uploads, which only replace the live image above.
    default_background_image: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    default_background_image_mimetype: Mapped[str | None] = mapped_column(String, nullable=True)
    default_logo_image: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    default_logo_image_mimetype: Mapped[str | None] = mapped_column(String, nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
