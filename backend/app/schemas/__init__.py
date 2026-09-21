"""Pydantic schemas for God's Eye for Business API contracts."""
from .user import (
    SkillItem,
    CaseStudyItem,
    UserProfileCreate,
    UserProfileResponse,
    UserCreate,
    UserResponse,
)
from .company import (
    CompanyBase,
    CompanyCreate,
    CompanyResponse,
    CompanyListItem,
    CompanyListResponse,
    CompanyFilter,
)
from .intelligence import (
    DiscoveryRequest,
    DiscoveryResponse,
    GapAnalysisOutput,
    PitchStrategyOutput,
    DeepAnalysisRequest,
    DeepAnalysisResponse,
)

__all__ = [
    "SkillItem",
    "CaseStudyItem",
    "UserProfileCreate",
    "UserProfileResponse",
    "UserCreate",
    "UserResponse",
    "CompanyBase",
    "CompanyCreate",
    "CompanyResponse",
    "CompanyListItem",
    "CompanyListResponse",
    "CompanyFilter",
    "DiscoveryRequest",
    "DiscoveryResponse",
    "GapAnalysisOutput",
    "PitchStrategyOutput",
    "DeepAnalysisRequest",
    "DeepAnalysisResponse",
]
