import uuid
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.models.company import CompanyNode
from backend.app.models.location import Location
from backend.app.models.contact import Contact
from backend.app.models.intelligence import SourceProvenance
from backend.app.schemas.intelligence import OverpassDiscoveryRequest
from backend.app.services.overpass_discovery import OverpassDiscoveryEngine

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/overpass", response_model=Dict[str, Any])
def discover_overpass(
    request: OverpassDiscoveryRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Discover real-world corporate & commercial entities using OpenStreetMap Overpass API.
    Zero fabrication - saves exact coordinates, addresses, and source provenance.
    """
    engine = OverpassDiscoveryEngine()
    results = engine.discover_businesses(
        city=request.city,
        category=request.category,
        country=request.country,
        limit=request.limit or 15,
    )

    saved_records = []
    for item in results:
        # Check if company already exists by osm_id or name+city
        existing = None
        if item.get("osm_id"):
            existing = db.query(CompanyNode).filter(CompanyNode.osm_id == str(item["osm_id"])).first()
        if not existing:
            existing = (
                db.query(CompanyNode)
                .filter(CompanyNode.name == item["name"], CompanyNode.hq_city == item["hq_city"])
                .first()
            )

        if existing:
            # Update fields if new data found
            if item.get("latitude") and not existing.latitude:
                existing.latitude = item["latitude"]
                existing.longitude = item["longitude"]
            if item.get("domain") and not existing.domain:
                existing.domain = item["domain"]
            if item.get("phone") and not existing.phone:
                existing.phone = item["phone"]
            if item.get("hq_address") and not existing.hq_address:
                existing.hq_address = item["hq_address"]
            co = existing
        else:
            co = CompanyNode(
                id=str(uuid.uuid4()),
                osm_id=str(item["osm_id"]) if item.get("osm_id") else None,
                osm_type=item.get("osm_type"),
                name=item["name"],
                domain=item.get("domain"),
                hq_city=item.get("hq_city"),
                hq_country=item.get("hq_country"),
                hq_address=item.get("hq_address"),
                latitude=item.get("latitude"),
                longitude=item.get("longitude"),
                industry=item.get("industry") or request.category,
                category=item.get("category") or request.category,
                source=item.get("source", "OpenStreetMap Overpass"),
                source_url=item.get("source_url"),
                phone=item.get("phone"),
                contact_email=item.get("contact_email"),
                operating_hours=item.get("operating_hours"),
                google_maps_url=item.get("google_maps_url"),
                rating=None,  # Do NOT fabricate ratings
                reviews_count=None,
                employee_count_range=None,
                estimated_revenue_usd=None,
                lead_match_score=80.0,
                status="DISCOVERED",
                outreach_status="NEW",
            )
            db.add(co)
            db.flush()

            # Create Location record
            loc = Location(
                company_id=co.id,
                address_line1=co.hq_address,
                city=co.hq_city,
                country=co.hq_country,
                latitude=co.latitude,
                longitude=co.longitude,
                source="OpenStreetMap",
                source_id=co.osm_id,
            )
            db.add(loc)

            # Create SourceProvenance record
            prov = SourceProvenance(
                company_id=co.id,
                source_name="OpenStreetMap Overpass",
                source_url=co.source_url,
                confidence_score=1.0,
                is_authoritative=True,
                fields_populated=["name", "latitude", "longitude", "hq_address", "category"],
            )
            db.add(prov)

            # If phone or email were provided by OSM, create Contact record
            if co.phone or co.contact_email:
                contact = Contact(
                    company_id=co.id,
                    email=co.contact_email,
                    phone=co.phone,
                    role="Primary Contact / Operator",
                    verification_status="SOURCE-DERIVED",
                    source_url=co.source_url,
                )
                db.add(contact)

        saved_records.append({
            "id": str(co.id),
            "osm_id": co.osm_id,
            "name": co.name,
            "domain": co.domain,
            "hq_city": co.hq_city,
            "hq_country": co.hq_country,
            "hq_address": co.hq_address,
            "google_maps_url": co.google_maps_url,
            "latitude": co.latitude,
            "longitude": co.longitude,
            "industry": co.industry,
            "category": co.category,
            "source": co.source,
            "source_url": co.source_url,
            "phone": co.phone,
            "contact_email": co.contact_email,
            "operating_hours": co.operating_hours,
            "lead_match_score": co.lead_match_score,
            "outreach_status": co.outreach_status,
            "status": co.status,
        })

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to commit discovered companies: {e}")
        raise HTTPException(status_code=500, detail=f"Database commit error: {e}")

    return {
        "status": "SUCCESS",
        "city": request.city,
        "category": request.category,
        "country": request.country,
        "count": len(saved_records),
        "companies": saved_records,
    }


@router.post("/search", response_model=Dict[str, Any])
def search_discovery(
    query: str = Query(..., min_length=1),
    city: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=50),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Search discovery database or trigger discovery query."""
    q = db.query(CompanyNode).filter(
        (CompanyNode.name.ilike(f"%{query}%")) |
        (CompanyNode.domain.ilike(f"%{query}%")) |
        (CompanyNode.category.ilike(f"%{query}%")) |
        (CompanyNode.industry.ilike(f"%{query}%"))
    )
    if city:
        q = q.filter(CompanyNode.hq_city.ilike(f"%{city}%"))

    items = q.limit(limit).all()
    return {
        "query": query,
        "city": city,
        "count": len(items),
        "results": [
            {
                "id": str(c.id),
                "name": c.name,
                "domain": c.domain,
                "hq_city": c.hq_city,
                "hq_country": c.hq_country,
                "industry": c.industry,
                "category": c.category,
                "latitude": c.latitude,
                "longitude": c.longitude,
                "lead_match_score": c.lead_match_score,
                "status": c.status,
            }
            for c in items
        ],
    }
