import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Location(Base):
    __tablename__ = "locations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String(36), ForeignKey("company_nodes.id", ondelete="CASCADE"), nullable=True, index=True)
    address_line1 = Column(Text, nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(128), nullable=False, index=True)
    state_province = Column(String(128), nullable=True)
    country = Column(String(128), nullable=False, index=True)
    postal_code = Column(String(32), nullable=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    source = Column(String(64), nullable=True)
    source_id = Column(String(64), nullable=True)
    google_maps_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("CompanyNode", back_populates="locations_rel")
