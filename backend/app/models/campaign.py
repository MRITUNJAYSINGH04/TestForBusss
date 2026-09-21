import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class UserTargetCampaign(Base):
    __tablename__ = "user_target_campaigns"
    __table_args__ = (UniqueConstraint("user_id", "company_id", name="uq_user_company"),)

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(String(36), ForeignKey("company_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    outreach_status = Column(String(64), default="NEW")
    custom_notes = Column(Text, nullable=True)
    last_contacted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="campaigns")
    company = relationship("CompanyNode", back_populates="campaigns")
