import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.services.news_intelligence import fetch_live_business_pulse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/pulse", response_model=Dict[str, Any])
@router.get("", response_model=Dict[str, Any])
@router.get("/", response_model=Dict[str, Any])
def get_live_news_pulse(
    city: Optional[str] = Query(None, description="Filter by city name"),
    topic: Optional[str] = Query(None, description="Topic, company or industry query"),
    limit: int = Query(25, ge=1, le=100, description="Max news signals to return"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Retrieve real-time business intelligence news pulse with authentic
    coordinates for 3D CesiumJS globe pulsating beacons and tactical news ticker.
    """
    items = fetch_live_business_pulse(city=city, topic=topic, limit=limit, db=db)
    return {
        "status": "LIVE",
        "count": len(items),
        "city": city or "Global",
        "results": items,
        "pulse": items,
    }
