from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class SkillItem(BaseModel):
    category: str = Field(..., json_schema_extra={"example": "AI/ML Engineering"})
    skills: List[str] = Field(..., json_schema_extra={"example": ["PyTorch", "LangChain", "Vector DBs", "RAG"]})
    proficiency: str = Field(..., json_schema_extra={"example": "Expert"})  # Beginner, Intermediate, Advanced, Expert


class CaseStudyItem(BaseModel):
    client_type: str = Field(..., json_schema_extra={"example": "Global Freight Forwarder"})
    result: str = Field(..., json_schema_extra={"example": "Cut customs classification exceptions by 74%"})
    services_used: List[str] = Field(
        default_factory=list,
        json_schema_extra={"example": ["Document Extraction Pipeline", "FastAPI"]},
    )


class UserProfileBase(BaseModel):
    services_offered: List[str] = Field(
        ...,
        json_schema_extra={
            "example": [
                "Enterprise LLM & Agent Workflow Automation",
                "PostgreSQL/PostGIS Geospatial Engine Optimization",
                "Cloud Infrastructure Migration (AWS/GCP)",
            ]
        },
    )
    skill_matrix: List[SkillItem] = Field(default_factory=list)
    tools_utilized: List[str] = Field(
        default_factory=list,
        json_schema_extra={"example": ["Python", "FastAPI", "Kafka", "PostgreSQL", "Docker", "AWS", "PyTorch"]},
    )
    target_industries: List[str] = Field(
        ...,
        json_schema_extra={"example": ["Logistics & Supply Chain", "Fintech", "Healthcare SaaS", "Defense Tech"]},
    )
    target_geographies: List[str] = Field(
        default_factory=lambda: ["North America", "Western Europe", "Singapore"],
        json_schema_extra={"example": ["North America", "Western Europe", "Singapore"]},
    )
    portfolio_case_studies: List[CaseStudyItem] = Field(default_factory=list)


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileResponse(UserProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserBase(BaseModel):
    email: EmailStr = Field(..., json_schema_extra={"example": "consultant@apexai.io"})
    full_name: str = Field(..., json_schema_extra={"example": "Alex Mercer"})
    agency_or_business_name: Optional[str] = Field(None, json_schema_extra={"example": "Apex Intelligence Solutions"})
    headline: Optional[str] = Field(None, json_schema_extra={"example": "Enterprise AI & Geospatial Systems Architect"})
    bio: Optional[str] = Field(
        None,
        json_schema_extra={"example": "Ex-AWS Solutions Architect with 8+ years scaling high-throughput distributed systems."},
    )
    years_of_experience: int = Field(default=0, ge=0, json_schema_extra={"example": 8})
    hourly_rate_usd: Optional[float] = Field(None, ge=0, json_schema_extra={"example": 250.0})


class UserCreate(UserBase):
    profile: Optional[UserProfileCreate] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    profile: Optional[UserProfileResponse] = None
    created_at: datetime
    updated_at: datetime
