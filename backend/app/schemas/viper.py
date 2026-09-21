"""
viper.py — Pydantic models for VIPER OSINT, Claude-style MCP Connector, and B2B Prospecting.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class ViperProspectRequest(BaseModel):
    prompt: str = Field(
        ...,
        description="Natural language prospecting query, e.g. 'Find 10 AI startups in Pune with founder contact numbers'",
        json_schema_extra={"example": "Find 10 AI startups in Pune with founder contact numbers"}
    )
    location: Optional[str] = Field(None, description="Explicit city or region override")
    industry: Optional[str] = Field(None, description="Explicit industry override")
    limit: Optional[int] = Field(10, ge=1, le=50, description="Target number of leads")


class ViperReconRequest(BaseModel):
    company_name: str = Field(..., description="Target company name")
    domain: Optional[str] = Field(None, description="Company official domain if known")
    city: Optional[str] = Field(None, description="Company headquarters city")


class ViperExecutive(BaseModel):
    name: str
    role: str
    linkedin: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    verification_status: str = Field(
        default="SOURCE-DERIVED",
        description="VERIFIED, SOURCE-DERIVED, INFERRED, UNKNOWN"
    )
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)


class ViperLead(BaseModel):
    id: str
    name: str
    domain: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    facility_image_url: Optional[str] = None
    industry: str
    hq_city: str
    hq_country: str
    hq_address: Optional[str] = None
    latitude: float
    longitude: float
    lead_match_score: float = 90.0
    confidence_level: str = "SOURCE-DERIVED"
    phone: Optional[str] = None
    contact_email: Optional[str] = None
    rating: float = 4.7
    reviews_count: int = 150
    operating_hours: Optional[str] = "09:00 - 18:30"
    summary: Optional[str] = None
    key_executives: List[ViperExecutive] = Field(default_factory=list)
    tech_stack: List[str] = Field(default_factory=list)
    operational_gaps: List[str] = Field(default_factory=list)
    outreach_status: str = "NEW"


class ViperTelemetryStep(BaseModel):
    step: str
    message: str
    timestamp: str
    status: str = "SUCCESS"  # SUCCESS, INFO, WARNING, ERROR


class ViperProspectResponse(BaseModel):
    status: str = "COMPLETED"
    prompt: str
    parsed_intent: Dict[str, Any]
    total_found: int
    leads: List[ViperLead]
    telemetry_logs: List[ViperTelemetryStep]
    generated_at: str


class ViperReconResponse(BaseModel):
    status: str = "COMPLETED"
    company_name: str
    domain: Optional[str] = None
    lead: Optional[ViperLead] = None
    telemetry_logs: List[ViperTelemetryStep]
    generated_at: str
