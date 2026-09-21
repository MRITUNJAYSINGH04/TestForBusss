import uuid
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db
from backend.app.models.user import User, UserProfile
from backend.app.models.company import CompanyNode
from backend.app.schemas.intelligence import DiscoveryRequest, DiscoveryResponse
from backend.app.services.search_scraper import CorporateSearchScraper
from backend.app.services.gap_analyzer import LLMGapAnalyzer

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("", response_model=Dict[str, Any])
@router.post("/", response_model=Dict[str, Any])
async def trigger_live_scan(
    request: Optional[DiscoveryRequest] = None,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Trigger live enterprise discovery scan:
    SerpApi Search -> BeautifulSoup Scraper -> Gemini LLM Gap Analysis Pipeline.
    """
    req_industry = request.industry_override if request else None
    req_region = (request.target_city_or_region or request.region_override) if request else None
    req_size = request.company_size_filter if request else None
    max_co = request.max_companies if request and request.max_companies else 15

    # 1. Fetch active operator profile
    user = db.query(User).order_by(User.created_at.desc()).first()
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first() if user else None

    profile_dict = None
    if user and profile:
        profile_dict = {
            "full_name": user.full_name,
            "headline": user.headline,
            "bio": user.bio,
            "years_of_experience": user.years_of_experience,
            "services_offered": profile.services_offered,
            "skill_matrix": profile.skill_matrix,
            "tools_utilized": getattr(profile, "tools_utilized", []),
            "target_industries": profile.target_industries,
            "portfolio_case_studies": profile.portfolio_case_studies,
        }

    # 2. Execute SerpApi search worker with dynamic region, size, and industry filters
    scraper = CorporateSearchScraper()
    analyzer = LLMGapAnalyzer()

    discovered = await scraper.search_target_companies(
        industry=req_industry,
        region=req_region,
        company_size=req_size,
        max_results=max_co,
    )

    processed_companies: List[Dict[str, Any]] = []

    # 3. For each company, run web scraper + Gemini Gap Analysis pipeline
    for item in discovered:
        try:
            domain = item.get("domain")
            if not domain:
                continue

            scraped_content = await scraper.scrape_company_website(domain)

            company_context = {
                **item,
                **scraped_content,
            }

            # Run Gemini LLM Gap Analysis
            analysis_result = await analyzer.analyze_company_gaps(
                company_data=company_context,
                user_profile=profile_dict,
            )

            gap_analysis = analysis_result["ai_gap_analysis"].model_dump(mode="json")
            pitch_strategy = analysis_result["pitch_strategy"].model_dump(mode="json")
            tech_stack = analysis_result.get("tech_stack", [])
            lead_match_score = float(analysis_result.get("lead_match_score", 88.0))
            recent_news = item.get("recent_news") or scraped_content.get("recent_news", [])
            osint_data = item.get("osint_data") or {}

            # 4. Upsert into database
            existing = db.query(CompanyNode).filter(CompanyNode.domain == domain).first()
            gmaps_url = item.get("google_maps_url") or f"https://www.google.com/maps/search/?api=1&query={item['name'].replace(' ', '+')}+{item['hq_city'].replace(' ', '+')}"

            if not existing:
                company_record = CompanyNode(
                    id=str(uuid.uuid4()),
                    name=item["name"],
                    domain=domain,
                    hq_city=item["hq_city"],
                    hq_country=item["hq_country"],
                    hq_address=item.get("hq_address") or f"{item['hq_city']} City Center, {item['hq_country']}",
                    google_maps_url=gmaps_url,
                    latitude=item["latitude"],
                    longitude=item["longitude"],
                    industry=item["industry"],
                    sub_industry=item.get("sub_industry"),
                    employee_count_range=item.get("employee_count_range", "1,000 - 5,000"),
                    estimated_revenue_usd=item.get("estimated_revenue_usd", "$500M+"),
                    phone=item.get("phone") or scraped_content.get("phone") or None,
                    contact_email=item.get("contact_email") or scraped_content.get("contact_email") or None,
                    social_profiles=item.get("social_profiles") or scraped_content.get("social_profiles", {}),
                    key_people=item.get("key_people", []),
                    rating=item.get("rating", 4.7),
                    reviews_count=item.get("reviews_count", 250),
                    operating_hours=item.get("operating_hours", "Mon - Fri: 09:00 - 18:00 Local"),
                    business_type=item.get("business_type", item["industry"]),
                    tech_stack=tech_stack,
                    scraped_metadata=scraped_content,
                    ai_gap_analysis=gap_analysis,
                    pitch_strategy=pitch_strategy,
                    status="ANALYZED",
                    lead_match_score=lead_match_score,
                    outreach_status="NEW",
                    recent_news=recent_news,
                    osint_data=osint_data,
                )
                db.add(company_record)
            else:
                company_record = existing
                company_record.ai_gap_analysis = gap_analysis
                company_record.pitch_strategy = pitch_strategy
                company_record.tech_stack = tech_stack
                company_record.scraped_metadata = scraped_content
                company_record.lead_match_score = lead_match_score
                if not company_record.google_maps_url and gmaps_url:
                    company_record.google_maps_url = gmaps_url
                if not company_record.phone and item.get("phone"):
                    company_record.phone = item.get("phone")
                if not company_record.contact_email and item.get("contact_email"):
                    company_record.contact_email = item.get("contact_email")
                if not company_record.hq_address and item.get("hq_address"):
                    company_record.hq_address = item.get("hq_address")
                if recent_news:
                    company_record.recent_news = recent_news
                if osint_data:
                    company_record.osint_data = osint_data
                company_record.status = "ANALYZED"

            db.commit()
            db.refresh(company_record)

            processed_companies.append({
                "id": str(company_record.id),
                "name": company_record.name,
                "domain": company_record.domain,
                "hq_city": company_record.hq_city,
                "hq_country": company_record.hq_country,
                "hq_address": company_record.hq_address,
                "google_maps_url": company_record.google_maps_url,
                "latitude": company_record.latitude,
                "longitude": company_record.longitude,
                "industry": company_record.industry,
                "sub_industry": company_record.sub_industry,
                "employee_count_range": company_record.employee_count_range,
                "estimated_revenue_usd": company_record.estimated_revenue_usd,
                "phone": company_record.phone,
                "contact_email": company_record.contact_email,
                "social_profiles": company_record.social_profiles or {},
                "key_people": company_record.key_people or [],
                "rating": company_record.rating,
                "reviews_count": company_record.reviews_count,
                "business_type": company_record.business_type,
                "operating_hours": company_record.operating_hours,
                "tech_stack": company_record.tech_stack or [],
                "status": company_record.status,
                "lead_match_score": company_record.lead_match_score or lead_match_score,
                "outreach_status": company_record.outreach_status or "NEW",
                "ai_gap_analysis": gap_analysis,
                "pitch_strategy": pitch_strategy,
                "recent_news": recent_news,
                "osint_data": osint_data,
                "gaps_count": len(gap_analysis.get("operational_issues", [])),
                "top_gap": gap_analysis.get("operational_issues", [""])[0],
            })
        except Exception as comp_err:
            logger.warning(f"Error processing target company {item.get('name')}: {comp_err}. Skipping item.")
            db.rollback()

    return {
        "status": "COMPLETED",
        "task_id": f"scan_{uuid.uuid4().hex[:8]}",
        "scanned_count": len(processed_companies),
        "message": f"Successfully completed live scan and LLM Gap Analysis for {len(processed_companies)} companies.",
        "companies": processed_companies,
    }
