import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey, JSON, Integer, Boolean, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Technology(Base):
    __tablename__ = "technologies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String(36), ForeignKey("company_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(128), nullable=False, index=True)
    category = Column(String(64), nullable=True)
    evidence = Column(Text, nullable=True)
    confidence = Column(Float, default=0.85)
    source = Column(String(128), nullable=True)
    source_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("CompanyNode", back_populates="technologies_rel")


class SecurityHeader(Base):
    __tablename__ = "security_headers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String(36), ForeignKey("company_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    header_name = Column(String(128), nullable=False)
    header_value = Column(Text, nullable=True)
    present = Column(Boolean, default=False)
    status_level = Column(String(32), default="OBSERVATION")  # OBSERVATION, POTENTIAL_RISK
    recommendation = Column(Text, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("CompanyNode", back_populates="security_headers_rel")


class NewsSignal(Base):
    __tablename__ = "news_signals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String(36), ForeignKey("company_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(Text, nullable=False)
    headline = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    source = Column(String(128), nullable=True)
    source_name = Column(String(128), nullable=True)
    source_url = Column(Text, nullable=True)
    signal_type = Column(String(64), default="EXPANSION", index=True)
    sentiment = Column(Float, default=0.0)
    relevance_score = Column(Float, default=0.8)
    published_date = Column(String(64), nullable=True)
    published_at = Column(DateTime, nullable=True)
    detected_at = Column(DateTime, default=datetime.utcnow)
    confidence = Column(Float, default=0.9)

    company = relationship("CompanyNode", back_populates="news_signals_rel")


class OSINTFinding(Base):
    __tablename__ = "osint_findings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String(36), ForeignKey("company_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_name = Column(String(64), nullable=False)
    target = Column(String(255), nullable=False)
    finding_type = Column(String(64), nullable=False)
    raw_data = Column(JSON, default=dict)
    status = Column(String(32), default="SUCCESS")
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("CompanyNode", back_populates="osint_findings_rel")


class SourceProvenance(Base):
    __tablename__ = "source_provenances"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String(36), ForeignKey("company_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name = Column(String(64), nullable=True)
    source_name = Column(String(128), nullable=False)
    source_url = Column(Text, nullable=True)
    confidence_score = Column(Float, default=0.8)
    confidence = Column(Float, default=0.8)
    is_authoritative = Column(Boolean, default=True)
    fields_populated = Column(JSON, default=list)
    verification_status = Column(String(32), default="SOURCE-DERIVED")
    timestamp = Column(DateTime, default=datetime.utcnow)

    company = relationship("CompanyNode", back_populates="sources_rel")


class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(64), nullable=True)
    company_id = Column(String(36), nullable=True)
    scan_type = Column(String(64), default="FULL_ENRICHMENT")
    city = Column(String(128), nullable=True, index=True)
    category = Column(String(128), nullable=True, index=True)
    status = Column(String(32), default="QUEUED", index=True)
    results_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
