from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from .intelligence import GapAnalysisOutput, PitchStrategyOutput


class CompanyBase(BaseModel):
    name: str = Field(..., json_schema_extra={"example": "FlexPort Logistics Corp"})
    domain: str = Field(..., json_schema_extra={"example": "flexport.com"})
    hq_city: str = Field(..., json_schema_extra={"example": "San Francisco"})
    hq_country: str = Field(..., json_schema_extra={"example": "United States"})
    hq_address: Optional[str] = Field(None, json_schema_extra={"example": "760 Market St, San Francisco, CA 94102"})
    google_maps_url: Optional[str] = Field(
        None,
        json_schema_extra={"example": "https://maps.google.com/?q=FlexPort+San+Francisco"},
    )
    latitude: float = Field(..., ge=-90.0, le=90.0, json_schema_extra={"example": 37.7749})
    longitude: float = Field(..., ge=-180.0, le=180.0, json_schema_extra={"example": -122.4194})
    industry: str = Field(..., json_schema_extra={"example": "Logistics & Supply Chain"})
    sub_industry: Optional[str] = Field(None, json_schema_extra={"example": "Freight Forwarding & Customs Tech"})
    employee_count_range: Optional[str] = Field(None, json_schema_extra={"example": "1000-5000"})
    estimated_revenue_usd: Optional[str] = Field(None, json_schema_extra={"example": "$1B+"})
    tech_stack: List[str] = Field(
        default_factory=list,
        json_schema_extra={"example": ["React", "PostgreSQL", "AWS ECS", "Kafka", "Snowflake"]},
    )
    phone: Optional[str] = Field(None, json_schema_extra={"example": "+1 (415) 890-7000"})
    contact_email: Optional[str] = Field(None, json_schema_extra={"example": "contact@flexport.com"})
    social_profiles: Dict[str, str] = Field(
        default_factory=dict,
        json_schema_extra={"example": {"linkedin": "https://linkedin.com/company/flexport"}},
    )
    key_people: List[Dict[str, str]] = Field(
        default_factory=list,
        json_schema_extra={"example": [{"name": "Ryan Petersen", "role": "Founder & CEO"}]},
    )
    rating: Optional[float] = Field(None, ge=0.0, le=5.0, json_schema_extra={"example": 4.8})
    reviews_count: Optional[float] = Field(None, json_schema_extra={"example": 320})
    operating_hours: Optional[str] = Field(None, json_schema_extra={"example": "Mon - Fri: 09:00 - 18:00 Local"})
    business_type: Optional[str] = Field(None, json_schema_extra={"example": "Enterprise Tech & Logistics"})
    lead_match_score: Optional[float] = Field(default=85.0, ge=0.0, le=100.0, json_schema_extra={"example": 94.5})
    outreach_status: Optional[str] = Field(default="NEW", json_schema_extra={"example": "NEW"})
    recent_news: List[Dict[str, Any]] = Field(
        default_factory=list,
        json_schema_extra={"example": [{"title": "Series B Funding $45M", "date": "2024-03-12", "source": "TechCrunch"}]},
    )
    osint_data: Dict[str, Any] = Field(
        default_factory=dict,
        json_schema_extra={"example": {"cloud_provider": "AWS", "ssl_grade": "A+", "security_score": 92}},
    )
    osm_id: Optional[str] = None
    osm_type: Optional[str] = None
    category: Optional[str] = None
    source: Optional[str] = "OpenStreetMap"
    source_url: Optional[str] = None



class CompanyCreate(CompanyBase):
    scraped_metadata: Dict[str, Any] = Field(default_factory=dict)
    ai_gap_analysis: Optional[GapAnalysisOutput] = None
    pitch_strategy: Optional[PitchStrategyOutput] = None
    status: str = Field(default="DISCOVERED", json_schema_extra={"example": "DISCOVERED"})


class CompanyListItem(BaseModel):
    """Optimized payload for CesiumJS globe rendering."""
    id: UUID
    name: str
    domain: str
    hq_city: str
    hq_country: str
    latitude: float
    longitude: float
    industry: str
    employee_count_range: Optional[str] = None
    phone: Optional[str] = None
    contact_email: Optional[str] = None
    google_maps_url: Optional[str] = None
    rating: Optional[float] = None
    business_type: Optional[str] = None
    status: str
    lead_match_score: Optional[float] = 85.0
    outreach_status: Optional[str] = "NEW"
    osm_id: Optional[str] = None
    category: Optional[str] = None
    source: Optional[str] = "OpenStreetMap"
    gaps_count: int = 0
    top_gap: Optional[str] = None
    created_at: datetime


class CompanyResponse(CompanyBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    scraped_metadata: Dict[str, Any] = Field(default_factory=dict)
    ai_gap_analysis: Optional[GapAnalysisOutput] = None
    pitch_strategy: Optional[PitchStrategyOutput] = None
    status: str
    created_at: datetime
    updated_at: datetime


class CompanyListResponse(BaseModel):
    total: int
    companies: List[CompanyListItem]


class CompanyFilter(BaseModel):
    industry: Optional[str] = None
    country: Optional[str] = None
    status: Optional[str] = None
    min_lat: Optional[float] = None
    max_lat: Optional[float] = None
    min_lon: Optional[float] = None
    max_lon: Optional[float] = None
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)
