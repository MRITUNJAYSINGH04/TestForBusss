import logging
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db
from backend.app.models.user import User, UserProfile
from backend.app.schemas.user import UserCreate, UserResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("", response_model=Dict[str, Any])
@router.post("/", response_model=Dict[str, Any])
def save_or_update_profile(
    user_in: UserCreate,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Save or update operator profile, skills, and campaign preferences."""
    user = db.query(User).filter(User.email == user_in.email).first()

    if not user:
        user = User(
            email=user_in.email,
            full_name=user_in.full_name,
            agency_or_business_name=user_in.agency_or_business_name,
            headline=user_in.headline,
            bio=user_in.bio,
            years_of_experience=user_in.years_of_experience,
            hourly_rate_usd=user_in.hourly_rate_usd,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if user_in.profile:
        profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
        profile_data = user_in.profile.model_dump()

        if not profile:
            profile = UserProfile(
                user_id=user.id,
                services_offered=profile_data.get("services_offered", []),
                skill_matrix=profile_data.get("skill_matrix", []),
                tools_utilized=profile_data.get("tools_utilized", []),
                target_industries=profile_data.get("target_industries", []),
                target_geographies=profile_data.get("target_geographies", []),
                portfolio_case_studies=profile_data.get("portfolio_case_studies", []),
            )
            db.add(profile)
        else:
            profile.services_offered = profile_data.get("services_offered", profile.services_offered)
            profile.skill_matrix = profile_data.get("skill_matrix", profile.skill_matrix)
            profile.tools_utilized = profile_data.get("tools_utilized", profile.tools_utilized)
            profile.target_industries = profile_data.get("target_industries", profile.target_industries)
            profile.target_geographies = profile_data.get("target_geographies", profile.target_geographies)
            profile.portfolio_case_studies = profile_data.get(
                "portfolio_case_studies", profile.portfolio_case_studies
            )

        db.commit()

    return {
        "success": True,
        "user_id": str(user.id),
        "email": user.email,
        "message": "Operator profile and capability matrix successfully updated.",
    }


@router.get("", response_model=Dict[str, Any])
@router.get("/", response_model=Dict[str, Any])
def get_active_profile(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Retrieve the latest operator profile."""
    user = db.query(User).order_by(User.created_at.desc()).first()
    if not user:
        return {
            "full_name": "Alex Mercer",
            "email": "alex.mercer@apexai.io",
            "headline": "Enterprise AI & Cloud Infrastructure Specialist",
            "agency_or_business_name": "Apex Intelligence Solutions",
            "profile": {
                "services_offered": [
                    "Enterprise LLM & Agent Workflow Automation",
                    "PostgreSQL/PostGIS Engine Optimization",
                    "High-Throughput Distributed Event Streaming",
                ],
                "skill_matrix": [
                    {"category": "AI/ML", "skills": ["PyTorch", "Gemini API", "LangChain"], "proficiency": "Expert"},
                    {"category": "Cloud & Data", "skills": ["PostgreSQL", "Kafka", "AWS", "FastAPI"], "proficiency": "Expert"},
                ],
                "target_industries": ["Logistics & Supply Chain", "Fintech", "Autonomous Operations"],
                "target_geographies": ["North America", "Western Europe", "Singapore"],
            },
        }

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    return {
        "user_id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "headline": user.headline,
        "agency_or_business_name": user.agency_or_business_name,
        "years_of_experience": user.years_of_experience,
        "profile": {
            "services_offered": profile.services_offered if profile else [],
            "skill_matrix": profile.skill_matrix if profile else [],
            "tools_utilized": profile.tools_utilized if profile and hasattr(profile, 'tools_utilized') and profile.tools_utilized else ["Python", "FastAPI", "PostgreSQL", "Kafka", "Docker", "AWS", "PyTorch"],
            "target_industries": profile.target_industries if profile else [],
            "target_geographies": profile.target_geographies if profile else [],
            "portfolio_case_studies": profile.portfolio_case_studies if profile else [],
        } if profile else None,
    }
