"""
wikidata_integration.py — Wikidata Search & SPARQL API Integration for God's Eye for Business.
Enables high-provenance enterprise enrichment using the global open knowledge graph:
- Search Wikidata entities via Action API (action=wbsearchentities)
- Extract corporate properties via SPARQL endpoint (query.wikidata.org/sparql):
  - Official website (wdt:P856)
  - Coordinate location (wdt:P625)
  - Headquarters location / city (wdt:P159)
  - Founded by / founder (wdt:P112)
  - Chief Executive Officer (wdt:P169)
  - Inception / founding date (wdt:P571)
  - Industry / sector (wdt:P452)
  - Country of origin (wdt:P17)
  - Stock exchange / ticker (wdt:P414)
  - Number of employees (wdt:P1128)
- Zero-tolerance fake data enforcement with strict provenance badges.
"""

import re
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger(__name__)

WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php"
WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql"
USER_AGENT = "GodsEyeBusinessOSINT/2.0 (research@godseye.internal; contact: admin@thefullcircle.in)"

PROP_MAP = {
    "http://www.wikidata.org/prop/direct/P856": "website",
    "http://www.wikidata.org/prop/direct/P625": "coordinate",
    "http://www.wikidata.org/prop/direct/P159": "headquarters",
    "http://www.wikidata.org/prop/direct/P112": "founder",
    "http://www.wikidata.org/prop/direct/P169": "ceo",
    "http://www.wikidata.org/prop/direct/P571": "inception",
    "http://www.wikidata.org/prop/direct/P452": "industry",
    "http://www.wikidata.org/prop/direct/P17": "country",
    "http://www.wikidata.org/prop/direct/P414": "stock_exchange",
    "http://www.wikidata.org/prop/direct/P1128": "employees",
    "http://www.wikidata.org/prop/direct/P1448": "official_name",
}


def parse_wikidata_point(wkt_point: str) -> Optional[Dict[str, float]]:
    """
    Parses a WKT coordinate string like 'Point(73.8567 18.5204)' into {'latitude': 18.5204, 'longitude': 73.8567}.
    Note: In WKT, coordinates are formatted as Point(longitude latitude).
    """
    if not wkt_point:
        return None
    match = re.search(r"Point\(\s*([-\d\.]+)\s+([-\d\.]+)\s*\)", wkt_point, re.IGNORECASE)
    if match:
        try:
            lon = float(match.group(1))
            lat = float(match.group(2))
            return {"latitude": lat, "longitude": lon}
        except ValueError:
            return None
    return None


async def search_wikidata_company(
    query: str,
    limit: int = 15,
    timeout: float = 12.0
) -> List[Dict[str, Any]]:
    """
    Searches Wikidata entities using action=wbsearchentities.
    Returns clean candidate list with id, label, description, and URL.
    """
    clean_query = query.strip()
    if not clean_query:
        return []

    params = {
        "action": "wbsearchentities",
        "search": clean_query,
        "language": "en",
        "format": "json",
        "type": "item",
        "limit": min(max(1, limit), 50),
    }
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(WIKIDATA_API_URL, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                results = []
                for item in data.get("search", []):
                    entity_id = item.get("id")
                    if not entity_id or not entity_id.startswith("Q"):
                        continue
                    results.append({
                        "id": entity_id,
                        "label": item.get("label", ""),
                        "description": item.get("description", ""),
                        "concepturi": item.get("concepturi", f"http://www.wikidata.org/entity/{entity_id}"),
                        "url": f"https://www.wikidata.org/wiki/{entity_id}",
                    })
                return results
            else:
                logger.warning(f"[Wikidata Search] HTTP {resp.status_code} for query '{query}'")
    except Exception as e:
        logger.warning(f"[Wikidata Search] Error searching Wikidata for '{query}': {e}")

    return []


async def fetch_wikidata_sparql_details(
    wikidata_id: str,
    timeout: float = 15.0
) -> Dict[str, Any]:
    """
    Executes SPARQL query against query.wikidata.org to extract deep enterprise facts:
    website, coordinates, headquarters, founders, CEO, inception, industry, country, employees.
    """
    clean_id = wikidata_id.strip().upper()
    if not re.match(r"^Q\d+$", clean_id):
        raise ValueError(f"Invalid Wikidata entity ID format: '{wikidata_id}' (expected Q followed by digits)")

    sparql_query = f"""
    SELECT ?p ?val ?valLabel WHERE {{
      VALUES (?p) {{
        (wdt:P856)
        (wdt:P625)
        (wdt:P159)
        (wdt:P112)
        (wdt:P169)
        (wdt:P571)
        (wdt:P452)
        (wdt:P17)
        (wdt:P414)
        (wdt:P1128)
        (wdt:P1448)
      }}
      wd:{clean_id} ?p ?val .
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}
    """

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/sparql-results+json",
    }

    result: Dict[str, Any] = {
        "wikidata_id": clean_id,
        "wikidata_url": f"https://www.wikidata.org/wiki/{clean_id}",
        "website": None,
        "coordinates": None,
        "latitude": None,
        "longitude": None,
        "hq_location": None,
        "founders": [],
        "ceo": [],
        "inception": None,
        "industry": [],
        "country": None,
        "stock_exchange": [],
        "employees": None,
        "official_name": None,
        "provenance": "Wikidata Open Knowledge Graph (SPARQL)",
    }

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(
                WIKIDATA_SPARQL_URL,
                params={"query": sparql_query, "format": "json"},
                headers=headers,
            )
            if resp.status_code == 200:
                data = resp.json()
                bindings = data.get("results", {}).get("bindings", [])
                for b in bindings:
                    prop_uri = b.get("p", {}).get("value", "")
                    prop_name = PROP_MAP.get(prop_uri)
                    if not prop_name:
                        continue

                    val_raw = b.get("val", {}).get("value", "")
                    val_label = b.get("valLabel", {}).get("value", val_raw)

                    if prop_name == "website" and not result["website"]:
                        result["website"] = val_raw
                    elif prop_name == "coordinate" and not result["coordinates"]:
                        coords = parse_wikidata_point(val_raw)
                        if coords:
                            result["coordinates"] = coords
                            result["latitude"] = coords["latitude"]
                            result["longitude"] = coords["longitude"]
                    elif prop_name == "headquarters" and not result["hq_location"]:
                        result["hq_location"] = val_label
                    elif prop_name == "founder":
                        if val_label and val_label not in result["founders"]:
                            result["founders"].append(val_label)
                    elif prop_name == "ceo":
                        if val_label and val_label not in result["ceo"]:
                            result["ceo"].append(val_label)
                    elif prop_name == "inception" and not result["inception"]:
                        # Extract YYYY-MM-DD from ISO string e.g. 1975-04-04T00:00:00Z
                        result["inception"] = val_raw.split("T")[0]
                    elif prop_name == "industry":
                        if val_label and val_label not in result["industry"]:
                            result["industry"].append(val_label)
                    elif prop_name == "country" and not result["country"]:
                        result["country"] = val_label
                    elif prop_name == "stock_exchange":
                        if val_label and val_label not in result["stock_exchange"]:
                            result["stock_exchange"].append(val_label)
                    elif prop_name == "employees" and not result["employees"]:
                        result["employees"] = val_raw
                    elif prop_name == "official_name" and not result["official_name"]:
                        result["official_name"] = val_label

            else:
                logger.warning(f"[Wikidata SPARQL] HTTP {resp.status_code} for entity {clean_id}: {resp.text[:120]}")
    except Exception as e:
        logger.warning(f"[Wikidata SPARQL] Query failed for entity {clean_id}: {e}")

    return result


async def enrich_company_with_wikidata(query: str) -> Optional[Dict[str, Any]]:
    """
    High-level enrichment pipeline: searches for company name, selects the
    best enterprise entity, and queries SPARQL details.
    """
    candidates = await search_wikidata_company(query, limit=8)
    if not candidates:
        return None

    # Priority ranking: match description containing enterprise keywords
    company_keywords = [
        "company", "corporation", "business", "firm", "enterprise",
        "startup", "provider", "software", "conglomerate", "manufacturer",
        "organization", "retailer", "service"
    ]

    selected_candidate = candidates[0]
    for c in candidates:
        desc = (c.get("description") or "").lower()
        if any(kw in desc for kw in company_keywords):
            selected_candidate = c
            break

    details = await fetch_wikidata_sparql_details(selected_candidate["id"])
    return {
        "entity_id": selected_candidate["id"],
        "label": selected_candidate["label"],
        "description": selected_candidate["description"],
        "url": selected_candidate["url"],
        **details,
    }
