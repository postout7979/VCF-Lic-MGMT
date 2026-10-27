from sqlalchemy import Column, Date, Integer, String

from app.core.database import Base


class License(Base):
    __tablename__ = "licenses"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    product = Column(String, nullable=False)
    description = Column(String, nullable=True)
    expires_on = Column(Date, nullable=True)
