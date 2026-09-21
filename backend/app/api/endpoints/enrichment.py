import uuid
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.models.company import CompanyNode
from backend.app.models.contact import Contact
from backend.app.models.intelligence import Technology, SecurityHeader, NewsSignal, OSINTFinding, ScanJob
from backend.app.models.user import User, UserProfile
from backend.app.services.contact_enricher import ContactEnricher
from backend.app.services.osint_providers import PassiveDnsTechProvider
from backend.app.services.news_intelligence import NewsIntelligenceCrawler
from backend.app.services.gap_analyzer import analyze_company_gaps

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/{company_id}", response_model=Dict[str, Any])
def enrich_company(company_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Enriches a target company using real data sources:
    1. Safe contact crawler with SSRF protection
    2. Passive DNS, SSL & security headers inspection
    3. Live news & business intent signals
    4. Evidence-grounded Gemini AI gap analysis
    """
    company = db.query(CompanyNode).filter(CompanyNode.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    job_id = str(uuid.uuid4())
    scan_job = ScanJob(
        job_id=job_id,
        company_id=company.id,
        scan_type="FULL_ENRICHMENT",
        status="RUNNING",
    )
    db.add(scan_job)
    db.commit()

    enriched_contacts = []
    enriched_tech = []
    enriched_headers = []
    enriched_news = []

    # 1. Contact Enrichment
    domain = company.domain
    if domain:
        url = f"https://{domain}" if not domain.startswith("http") else domain
        try:
            enricher = ContactEnricher()
            contact_res = enricher.enrich_from_website(url)
            
            # Save extracted emails & phones
            for email in contact_res.get("emails", []):
                existing = db.query(Contact).filter(Contact.company_id == company.id, Contact.email == email).first()
                if not existing:
                    c = Contact(
                        company_id=company.id,
                        email=email,
                        role="Direct Contact",
                        verification_status="SOURCE-DERIVED",
                        source_url=url,
                    )
                    db.add(c)
                    enriched_contacts.append({"email": email, "type": "email", "status": "SOURCE-DERIVED"})
                    if not company.contact_email:
                        company.contact_email = email

            for phone in contact_res.get("phone_numbers", []):
                existing = db.query(Contact).filter(Contact.company_id == company.id, Contact.phone == phone).first()
                if not existing:
                    c = Contact(
                        company_id=company.id,
                        phone=phone,
                        role="Direct Line",
                        verification_status="SOURCE-DERIVED",
                        source_url=url,
                    )
                    db.add(c)
                    enriched_contacts.append({"phone": phone, "type": "phone", "status": "SOURCE-DERIVED"})
                    if not company.phone:
                        company.phone = phone

            if contact_res.get("social_links"):
                profiles = company.social_profiles or {}
                profiles.update(contact_res["social_links"])
                company.social_profiles = profiles
        except Exception as e:
            logger.warning(f"Contact enrichment error for {company.name}: {e}")

    # Fallback to public directory and OSM tag hydration if contacts still missing
    if not company.phone or not company.contact_email:
        try:
            from backend.app.services.contact_enricher import hydrate_entity_contacts_sync
            hydrated = hydrate_entity_contacts_sync(
                name=company.name,
                city=company.hq_city or "Pune",
                current_domain=company.domain,
                osm_id=company.osm_id,
                osm_type=company.osm_type or "node",
            )
            if hydrated.get("phone") and not company.phone:
                company.phone = hydrated["phone"]
                c = Contact(
                    company_id=company.id,
                    phone=hydrated["phone"],
                    role="Direct Line",
                    verification_status="SOURCE-DERIVED",
                    source_url=hydrated.get("source_url") or company.domain,
                )
                db.add(c)
                enriched_contacts.append({"phone": hydrated["phone"], "type": "phone", "status": "SOURCE-DERIVED"})
            if hydrated.get("contact_email") and not company.contact_email:
                company.contact_email = hydrated["contact_email"]
                c = Contact(
                    company_id=company.id,
                    email=hydrated["contact_email"],
                    role="Direct Contact",
                    verification_status="SOURCE-DERIVED",
                    source_url=hydrated.get("source_url") or company.domain,
                )
                db.add(c)
                enriched_contacts.append({"email": hydrated["contact_email"], "type": "email", "status": "SOURCE-DERIVED"})
            if hydrated.get("domain") and (not company.domain or company.domain.endswith(".osm.org")):
                company.domain = hydrated["domain"]
        except Exception as e:
            logger.warning(f"Hydration fallback error for {company.name}: {e}")

    # 2. OSINT & Passive DNS / Security Headers
    try:
        osint_provider = PassiveDnsTechProvider()
        osint_res = osint_provider.gather(company.name, domain=company.domain)

        # Save technologies
        tech_list = list(company.tech_stack or [])
        for tech in osint_res.get("technologies", []):
            name = tech.get("name")
            if name and name not in tech_list:
                tech_list.append(name)
            existing_t = db.query(Technology).filter(Technology.company_id == company.id, Technology.name == name).first()
            if not existing_t:
                db.add(Technology(
                    company_id=company.id,
                    name=name,
                    category=tech.get("category", "Infrastructure"),
                    confidence=tech.get("confidence", 0.9),
                    source="PassiveDNS/Headers",
                ))
            enriched_tech.append(tech)
        company.tech_stack = tech_list

        # Save security headers
        for h in osint_res.get("security_headers", []):
            existing_h = db.query(SecurityHeader).filter(SecurityHeader.company_id == company.id, SecurityHeader.header_name == h.get("header_name")).first()
            if not existing_h:
                db.add(SecurityHeader(
                    company_id=company.id,
                    header_name=h.get("header_name"),
                    present=h.get("present", False),
                    header_value=h.get("value"),
                    recommendation=h.get("recommendation"),
                ))
            enriched_headers.append(h)

        company.osint_data = osint_res
    except Exception as e:
        logger.warning(f"OSINT provider error for {company.name}: {e}")

    # 3. Live News Signals
    try:
        news_crawler = NewsIntelligenceCrawler()
        news_items = news_crawler.fetch_company_signals(company.name, company.domain)
        for item in news_items:
            existing_n = db.query(NewsSignal).filter(NewsSignal.company_id == company.id, NewsSignal.source_url == item.get("source_url")).first()
            if not existing_n:
                db.add(NewsSignal(
                    company_id=company.id,
                    title=item.get("title"),
                    source_url=item.get("source_url"),
                    source_name=item.get("source_name", "RSS"),
                    published_date=item.get("published_date"),
                    signal_type=item.get("signal_type", "GENERAL"),
                    sentiment=item.get("sentiment", 0.0),
                    relevance_score=item.get("relevance_score", 0.8),
                    summary=item.get("summary"),
                ))
            enriched_news.append(item)
        if enriched_news:
            company.recent_news = enriched_news
    except Exception as e:
        logger.warning(f"News signal error for {company.name}: {e}")

    # 4. Evidence-Grounded AI Gap Analysis
    try:
        user = db.query(User).first()
        profile_dict = {}
        if user and user.profile:
            profile_dict = {
                "services_offered": user.profile.services_offered,
                "skill_matrix": user.profile.skill_matrix,
                "tools_utilized": user.profile.tools_utilized,
            }

        company_dict = {
            "name": company.name,
            "domain": company.domain,
            "industry": company.industry,
            "category": company.category,
            "hq_city": company.hq_city,
            "tech_stack": company.tech_stack,
            "osint_data": company.osint_data,
            "recent_news": company.recent_news,
        }

        gap_result = analyze_company_gaps(company_dict, profile_dict)
        company.ai_gap_analysis = gap_result.get("ai_gap_analysis", {})
        company.pitch_strategy = gap_result.get("pitch_strategy", {})
        company.status = "ANALYZED"
    except Exception as e:
        logger.warning(f"AI gap analysis error for {company.name}: {e}")

    scan_job.status = "COMPLETED"
    company.status = "ANALYZED" if company.status == "DISCOVERED" else company.status

    try:
        db.commit()
        db.refresh(company)
    except Exception as e:
        db.rollback()
        logger.error(f"Commit error during enrichment: {e}")
        raise HTTPException(status_code=500, detail="Database commit failed")

    return {
        "status": "SUCCESS",
        "job_id": job_id,
        "company_id": str(company.id),
        "name": company.name,
        "contacts_found": len(enriched_contacts),
        "tech_detected": len(enriched_tech),
        "headers_inspected": len(enriched_headers),
        "news_signals_found": len(enriched_news),
        "ai_gap_analysis": company.ai_gap_analysis,
        "pitch_strategy": company.pitch_strategy,
    }
