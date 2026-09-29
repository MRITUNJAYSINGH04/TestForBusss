"""
gdelt.py — FastAPI Endpoint for GDELT 2.0 Live News & Wikidata Intelligence Feeds.
Provides REST endpoints for querying real-time enterprise media signals, funding events,
and Wikidata open knowledge graph entities.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException
from backend.app.services.gdelt_integration import fetch_gdelt_news_signals
from backend.app.services.wikidata_integration import (
    search_wikidata_company,
    fetch_wikidata_sparql_details,
    enrich_company_with_wikidata,
)
from backend.app.services.opencorporates import query_opencorporates
from backend.app.services.reddit_integration import query_reddit_discussions
from backend.app.services.common_crawl import query_common_crawl_archives

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/signals", summary="Fetch real-time enterprise news signals from GDELT 2.0")
async def get_gdelt_signals(
    q: str = Query(..., min_length=2, description="Target company name or intelligence keyword"),
    limit: int = Query(10, ge=1, le=50, description="Max news signals to return"),
    timespan: str = Query("3m", description="Timespan for articles, e.g., 24h, 7d, 3m"),
):
    """
    Retrieves global media mentions, funding events, acquisitions, and strategic announcements
    from the GDELT Project 2.0 DOC API with fallback to verified RSS streams.
    """
    try:
        signals = await fetch_gdelt_news_signals(query=q, max_records=limit, timespan=timespan)
        return {
            "status": "SUCCESS",
            "query": q,
            "count": len(signals),
            "signals": signals,
        }
    except Exception as e:
        logger.error(f"[GDELT Endpoint] Failed to retrieve signals for '{q}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch GDELT signals: {str(e)}")


@router.get("/wikidata/search", summary="Search corporate entities on Wikidata Action API")
async def search_wikidata_entities(
    q: str = Query(..., min_length=2, description="Company name or entity to search"),
    limit: int = Query(15, ge=1, le=50, description="Max candidate entities to retrieve"),
):
    """
    Searches the global open knowledge graph on Wikidata via action=wbsearchentities.
    Returns matched entity IDs (e.g., Q2283), labels, descriptions, and concept URIs.
    """
    try:
        results = await search_wikidata_company(query=q, limit=limit)
        return {
            "status": "SUCCESS",
            "query": q,
            "count": len(results),
            "results": results,
        }
    except Exception as e:
        logger.error(f"[Wikidata Search Endpoint] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Wikidata search error: {str(e)}")


@router.get("/wikidata/entity/{entity_id}", summary="Extract corporate SPARQL details for a Wikidata entity")
async def get_wikidata_entity_details(entity_id: str):
    """
    Executes deep SPARQL query on query.wikidata.org to extract verified corporate facts:
    website, coordinate location, headquarters city, founders, CEO, inception date, and industry.
    """
    try:
        details = await fetch_wikidata_sparql_details(wikidata_id=entity_id)
        return {
            "status": "SUCCESS",
            "entity_id": entity_id,
            "details": details,
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logger.error(f"[Wikidata SPARQL Endpoint] Error for {entity_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Wikidata SPARQL error: {str(e)}")


@router.get("/wikidata/enrich", summary="Automatically search and enrich company via Wikidata")
async def enrich_wikidata_company(
    company: str = Query(..., min_length=2, description="Company name to search and enrich")
):
    """
    End-to-end enrichment pipeline: searches for best matching company entity on Wikidata
    and extracts SPARQL attributes.
    """
    try:
        enrichment = await enrich_company_with_wikidata(company)
        if not enrichment:
            return {
                "status": "NOT_FOUND",
                "company": company,
                "message": "No matching corporate entity found on Wikidata.",
            }
        return {
            "status": "SUCCESS",
            "company": company,
            "data": enrichment,
        }
    except Exception as e:
        logger.error(f"[Wikidata Enrich Endpoint] Error for '{company}': {e}")
        raise HTTPException(status_code=500, detail=f"Wikidata enrichment error: {str(e)}")


@router.get("/opencorporates", summary="Query official corporate registry from OpenCorporates")
async def get_opencorporates_registry(
    q: str = Query(..., min_length=2, description="Registered legal company name"),
    jurisdiction: Optional[str] = Query(None, description="Jurisdiction code, e.g. in, us_wa, gb"),
):
    """
    Queries official corporate registry data, legal status, registration numbers,
    and registered office addresses via OpenCorporates.
    """
    try:
        registry = await query_opencorporates(company_name=q, jurisdiction_code=jurisdiction)
        return {
            "status": "SUCCESS",
            "query": q,
            "data": registry,
        }
    except Exception as e:
        logger.error(f"[OpenCorporates Endpoint] Error for '{q}': {e}")
        raise HTTPException(status_code=500, detail=f"OpenCorporates error: {str(e)}")


@router.get("/reddit", summary="Query community sentiment and discussions from Reddit")
async def get_reddit_discussions(
    q: str = Query(..., min_length=2, description="Company, brand, or executive to search"),
    limit: int = Query(10, ge=1, le=25, description="Max discussions to return"),
):
    """
    Queries Reddit public discussions, reviews, and sentiment regarding an enterprise or topic.
    """
    try:
        discussions = await query_reddit_discussions(query=q, limit=limit)
        return {
            "status": "SUCCESS",
            "query": q,
            "count": len(discussions),
            "discussions": discussions,
        }
    except Exception as e:
        logger.error(f"[Reddit Endpoint] Error for '{q}': {e}")
        raise HTTPException(status_code=500, detail=f"Reddit error: {str(e)}")


@router.get("/commoncrawl", summary="Query archived web snapshots from Common Crawl Index")
async def get_common_crawl_archives(
    domain: str = Query(..., min_length=3, description="Company domain to look up in Common Crawl index"),
    limit: int = Query(10, ge=1, le=25, description="Max historical snapshots to return"),
):
    """
    Queries Common Crawl Index Server for captured historical URLs and archive timestamps.
    """
    try:
        archives = await query_common_crawl_archives(domain=domain, limit=limit)
        return {
            "status": "SUCCESS",
            "domain": domain,
            "count": len(archives),
            "archives": archives,
        }
    except Exception as e:
        logger.error(f"[Common Crawl Endpoint] Error for '{domain}': {e}")
        raise HTTPException(status_code=500, detail=f"Common Crawl error: {str(e)}")

