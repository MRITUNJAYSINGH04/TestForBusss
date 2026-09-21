import pytest
from uuid import uuid4
from pydantic import ValidationError
from backend.app.schemas import (
    UserCreate,
    UserProfileCreate,
    SkillItem,
    CompanyCreate,
    CompanyListItem,
    GapAnalysisOutput,
    PitchStrategyOutput,
    DiscoveryRequest,
)


def test_user_and_profile_validation():
    user_data = {
        "email": "consultant@apexai.io",
        "full_name": "Alex Mercer",
        "agency_or_business_name": "Apex Intelligence Solutions",
        "headline": "Enterprise AI & Geospatial Systems Architect",
        "bio": "Ex-AWS Solutions Architect with 8+ years scaling systems.",
        "years_of_experience": 8,
        "hourly_rate_usd": 250.0,
        "profile": {
            "services_offered": ["Cloud Modernization", "Custom AI Agents"],
            "skill_matrix": [
                {"category": "AI/ML", "skills": ["PyTorch", "LangChain"], "proficiency": "Expert"}
            ],
            "target_industries": ["Logistics & Supply Chain", "Fintech"],
            "target_geographies": ["North America", "Western Europe"],
            "portfolio_case_studies": [
                {
                    "client_type": "Logistics SaaS",
                    "result": "Cut customs lag by 70%",
                    "services_used": ["AI Pipeline"],
                }
            ],
        },
    }
    user = UserCreate(**user_data)
    assert user.email == "consultant@apexai.io"
    assert user.profile.services_offered[0] == "Cloud Modernization"
    assert user.profile.skill_matrix[0].skills == ["PyTorch", "LangChain"]


def test_invalid_email_validation():
    with pytest.raises(ValidationError):
        UserCreate(
            email="not-an-email",
            full_name="Invalid User",
        )


def test_company_and_geo_validation():
    company_data = {
        "name": "FlexPort Logistics Corp",
        "domain": "flexport.com",
        "hq_city": "San Francisco",
        "hq_country": "United States",
        "hq_address": "760 Market St, San Francisco, CA 94102",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "industry": "Logistics & Supply Chain",
        "sub_industry": "Freight Forwarding",
        "employee_count_range": "1000-5000",
        "estimated_revenue_usd": "$1B+",
        "tech_stack": ["React", "PostgreSQL", "AWS ECS"],
        "scraped_metadata": {"news": [{"title": "Series E", "date": "2026-01-01"}]},
        "ai_gap_analysis": {
            "operational_issues": [
                "Customs classification bottlenecks across European maritime ports.",
                "Manual multi-carrier tracking reconciliation between sea and air cargo segments.",
                "Support ticket backlog during seasonal capacity surges.",
            ],
            "bottlenecks": ["Fragmented EDI feeds."],
            "technology_gaps": ["Absence of real-time predictive ETA models."],
            "confidence_score": 0.94,
        },
        "pitch_strategy": {
            "tailored_angle": "Automate EDI feeds using resilient event streaming.",
            "value_proposition": "Cut demurrage fines by 80%.",
            "cold_outreach_subject": "Automating FlexPort Customs Reconciliation",
            "email_body_template": "Hi team...",
            "call_opening_hook": "We recently built...",
        },
        "status": "ANALYZED",
    }
    company = CompanyCreate(**company_data)
    assert company.latitude == 37.7749
    assert company.longitude == -122.4194
    assert len(company.ai_gap_analysis.operational_issues) == 3

    # Cesium list item transformation
    list_item = CompanyListItem(
        id=uuid4(),
        name=company.name,
        domain=company.domain,
        hq_city=company.hq_city,
        hq_country=company.hq_country,
        latitude=company.latitude,
        longitude=company.longitude,
        industry=company.industry,
        employee_count_range=company.employee_count_range,
        status=company.status,
        gaps_count=len(company.ai_gap_analysis.operational_issues),
        top_gap=company.ai_gap_analysis.operational_issues[0],
        created_at="2026-09-16T10:00:00Z",
    )
    assert list_item.gaps_count == 3
    assert "Customs classification" in list_item.top_gap


def test_invalid_coordinates():
    with pytest.raises(ValidationError):
        CompanyCreate(
            name="Invalid Geo Co",
            domain="invalid.com",
            hq_city="Nowhere",
            hq_country="Nowhere",
            latitude=195.0,  # Invalid latitude (> 90)
            longitude=0.0,
            industry="Tech",
        )
