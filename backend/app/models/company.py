import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class CompanyNode(Base):
    __tablename__ = "company_nodes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    domain = Column(String(255), nullable=True, index=True)
    hq_city = Column(String(128), nullable=False, index=True)
    hq_country = Column(String(128), nullable=False, index=True)
    hq_address = Column(Text, nullable=True)
    google_maps_url = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    industry = Column(String(128), nullable=False, index=True)
    sub_industry = Column(String(128), nullable=True)
    employee_count_range = Column(String(64), nullable=True)
    estimated_revenue_usd = Column(String(64), nullable=True)
    tech_stack = Column(JSON, default=list)
    phone = Column(String(64), nullable=True)
    contact_email = Column(String(128), nullable=True)
    social_profiles = Column(JSON, default=dict)
    key_people = Column(JSON, default=list)
    rating = Column(Float, nullable=True)
    reviews_count = Column(Float, nullable=True)
    operating_hours = Column(String(128), nullable=True)
    business_type = Column(String(128), nullable=True)
    scraped_metadata = Column(JSON, default=dict)
    ai_gap_analysis = Column(JSON, default=dict)
    pitch_strategy = Column(JSON, default=dict)
    status = Column(String(32), default="DISCOVERED", index=True)
    lead_match_score = Column(Float, default=85.0)
    outreach_status = Column(String(32), default="NEW", index=True)
    recent_news = Column(JSON, default=list)
    osint_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    osm_id = Column(String(64), nullable=True, index=True)
    osm_type = Column(String(32), nullable=True)
    category = Column(String(128), nullable=True, index=True)
    source = Column(String(64), default="OpenStreetMap")
    source_url = Column(Text, nullable=True)

    campaigns = relationship("UserTargetCampaign", back_populates="company", cascade="all, delete-orphan")
    locations_rel = relationship("Location", back_populates="company", cascade="all, delete-orphan")
    contacts_rel = relationship("Contact", back_populates="company", cascade="all, delete-orphan")
    technologies_rel = relationship("Technology", back_populates="company", cascade="all, delete-orphan")
    security_headers_rel = relationship("SecurityHeader", back_populates="company", cascade="all, delete-orphan")
    news_signals_rel = relationship("NewsSignal", back_populates="company", cascade="all, delete-orphan")
    osint_findings_rel = relationship("OSINTFinding", back_populates="company", cascade="all, delete-orphan")
    sources_rel = relationship("SourceProvenance", back_populates="company", cascade="all, delete-orphan")
