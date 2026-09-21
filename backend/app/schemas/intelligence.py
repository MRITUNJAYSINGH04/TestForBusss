from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class DiscoveryRequest(BaseModel):
    user_id: Optional[UUID] = None
    target_city_or_region: Optional[str] = Field(None, json_schema_extra={"example": "Pune"})
    company_size_filter: Optional[str] = Field(None, json_schema_extra={"example": "startups"})  # 'startups', '10-50', '50-200', '1000+'
    industry_override: Optional[str] = Field(None, json_schema_extra={"example": "Logistics & Supply Chain"})
    region_override: Optional[str] = Field(None, json_schema_extra={"example": "India"})
    max_companies: int = Field(default=8, ge=1, le=50, json_schema_extra={"example": 8})


class DiscoveryResponse(BaseModel):
    task_id: str
    status: str = Field(..., json_schema_extra={"example": "COMPLETED"})  # PROCESSING, COMPLETED, FAILED
    discovered_count: int
    message: str
    companies_sample: List[Dict[str, Any]] = Field(default_factory=list)


class GapAnalysisOutput(BaseModel):
    operational_issues: List[str] = Field(
        ...,
        min_length=1,
        max_length=5,
        description="Top 3 critical operational/business gaps the user can solve.",
        json_schema_extra={
            "example": [
                "Customs classification bottlenecks across European maritime ports creating demurrage penalties.",
                "Manual multi-carrier tracking reconciliation between sea and air cargo segments.",
                "Support ticket backlog during seasonal capacity surges.",
            ]
        },
    )
    bottlenecks: List[str] = Field(
        default_factory=list,
        json_schema_extra={"example": ["Fragmented EDI feeds requiring human intervention for exception handling."]},
    )
    technology_gaps: List[str] = Field(
        default_factory=list,
        json_schema_extra={
            "example": [
                "Absence of real-time predictive ETA correction models on maritime choke points.",
                "Legacy batch sync between tracking APIs and client-facing visibility portals.",
            ]
        },
    )
    confidence_score: float = Field(default=0.88, ge=0.0, le=1.0, json_schema_extra={"example": 0.92})
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)


class PitchStrategyOutput(BaseModel):
    tailored_angle: str = Field(
        ...,
        json_schema_extra={
            "example": "Position user's experience building sub-second event streaming architectures to eliminate manual carrier reconciliation."
        },
    )
    value_proposition: str = Field(
        ...,
        json_schema_extra={"example": "Cut customs clearance delay by 60% with automated multi-modal document validation."},
    )
    cold_outreach_subject: str = Field(
        ...,
        json_schema_extra={"example": "Automating FlexPort European customs reconciliation (Zero demurrage)"},
    )
    email_body_template: str = Field(
        ...,
        json_schema_extra={
            "example": (
                "Hi [First Name],\n\n"
                "Noticed FlexPort's recent expansion into direct European charter routes. "
                "Given the increased regulatory scrutiny on cross-border manifests, many freight teams "
                "see a 30% jump in customs clearance exceptions.\n\n"
                "We recently built an autonomous ingestion pipeline for a high-volume logistics provider "
                "that cut customs exceptions by 74% and eliminated demurrage fees. "
                "Would you be open to a 10-minute briefing on how this applies to your current European routes?\n\n"
                "Best,\nAlex Mercer"
            )
        },
    )
    call_opening_hook: str = Field(
        ...,
        json_schema_extra={
            "example": "We recently built an autonomous ingestion pipeline for a top-10 freight forwarder that eliminated 74% of their customs filing exceptions..."
        },
    )


class DeepAnalysisRequest(BaseModel):
    company_id: UUID
    user_id: Optional[UUID] = None
    force_refresh: bool = False


class DeepAnalysisResponse(BaseModel):
    company_id: UUID
    company_name: str
    gap_analysis: GapAnalysisOutput
    pitch_strategy: PitchStrategyOutput
    status: str = "ANALYZED"


# ------------------------------------------------------------------------------
# Production Master Upgrade Schemas (Overpass, Enrichment, OSINT, Intent, AI)
# ------------------------------------------------------------------------------

class OverpassDiscoveryRequest(BaseModel):
    city: str = Field(..., json_schema_extra={"example": "Pune"})
    category: str = Field(default="software", json_schema_extra={"example": "AI Companies"})
    country: Optional[str] = Field(default=None, json_schema_extra={"example": "India"})
    radius_meters: Optional[int] = Field(default=15000, ge=500, le=100000)
    limit: int = Field(default=250, ge=1, le=2500)


class EvidenceGap(BaseModel):
    title: str
    description: str
    evidence: List[str] = Field(default_factory=list)
    confidence: str = "High"


class ColdEmailSchema(BaseModel):
    subject: str
    body: str


class EvidenceGapAnalysis(BaseModel):
    gaps: List[EvidenceGap] = Field(..., min_length=1, max_length=3)
    lead_match_score: float = Field(default=85.0, ge=0.0, le=100.0)
    score_explanation: str
    pitch_angle: str
    cold_email: ColdEmailSchema
    phone_hook: str


class ContactItem(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source_url: Optional[str] = None
    verification_status: str = "SOURCE-DERIVED"
    confidence: float = 0.8


class TechItem(BaseModel):
    name: str
    category: Optional[str] = None
    evidence: Optional[str] = None
    confidence: float = 0.85
    source_url: Optional[str] = None


class SignalItem(BaseModel):
    headline: str
    summary: Optional[str] = None
    source: str
    source_url: Optional[str] = None
    signal_type: str
    published_at: Optional[datetime] = None
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    confidence: float = 0.9


class SearchResultItem(BaseModel):
    id: str
    name: str
    domain: Optional[str] = None
    category: Optional[str] = None
    industry: Optional[str] = None
    hq_city: str
    hq_country: str
    latitude: float
    longitude: float
    lead_match_score: Optional[float] = 85.0
    outreach_status: Optional[str] = "NEW"
    status: Optional[str] = None
    osm_id: Optional[str] = None
    source: Optional[str] = "OpenStreetMap"
    distance_km: Optional[float] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    contact_email: Optional[str] = None
    rating: Optional[float] = 4.6
    reviews_count: Optional[int] = 120
    operating_hours: Optional[str] = "09:00 - 20:00"


class FastSearchResponse(BaseModel):
    total: int
    query: str
    results: List[SearchResultItem]
    category: Optional[str] = None
    location: Optional[str] = None
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None


