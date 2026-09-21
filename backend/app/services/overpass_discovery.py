import logging
import time
import re
import urllib.parse
from typing import List, Dict, Any, Optional, Tuple
import httpx
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

OVERPASS_ENDPOINTS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    settings.OVERPASS_ENDPOINT,
]


HUB_COORDINATES: Dict[str, Tuple[float, float]] = {
    "pune": (18.5204, 73.8567),
    "mumbai": (19.0760, 72.8777),
    "bangalore": (12.9716, 77.5946),
    "bengaluru": (12.9716, 77.5946),
    "hyderabad": (17.3850, 78.4867),
    "delhi": (28.6139, 77.2090),
    "new york": (40.7128, -74.0060),
    "san francisco": (37.7749, -122.4194),
    "london": (51.5074, -0.1278),
    "singapore": (1.3521, 103.8198),
    "tokyo": (35.6762, 139.6503),
    "berlin": (52.5200, 13.4050),
}

_OVERPASS_CACHE: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}

def get_hub_coordinates(city: str) -> Tuple[float, float]:
    key = city.strip().lower()
    for hub, coords in HUB_COORDINATES.items():
        if hub in key or key in hub:
            return coords
    return (18.5204, 73.8567)


def build_overpass_query(lat: float, lon: float, category: str, radius: int = 15000, limit: int = 500) -> str:
    cat_lower = category.strip().lower()
    clean_cat = re.sub(r'[^a-zA-Z0-9_]', '', cat_lower)

    if not clean_cat or clean_cat in ("all", "business", "company", "companies", "commercial", "enterprise"):
        tag_filters = [
            '["office"~"it|company|software|coworking|telecommunication|research|corporate|consulting|logistics|employment_agency|advertising_agency|financial|insurance|estate_agent",i]',
            '["amenity"~"college|university|hospital|clinic|bank|pharmacy",i]',
            '["shop"~"mall|department_store|electronics|computer|supermarket",i]',
            '["commercial"]',
            '["industrial"~"technology_park|office",i]',
            '["building"~"commercial|office",i]',
        ]
    elif any(k in clean_cat for k in ("therapist", "counsel", "psych", "mental", "therapy")):
        tag_filters = [
            '["amenity"~"clinic|doctors|hospital",i]',
            '["healthcare"~"psychotherapist|counselling|clinic|doctor|alternative|physiotherapist|occupational_therapist",i]',
            '["office"~"therapist|psychologist|counselling",i]',
        ]
    elif any(k in clean_cat for k in ("cafe", "coffee", "restaurant", "bakery", "food", "dining", "bar", "pub")):
        tag_filters = [
            '["amenity"~"cafe|restaurant|fast_food|bar|pub|ice_cream",i]',
            '["shop"~"bakery|coffee|tea|pastry",i]',
        ]
    elif any(k in clean_cat for k in ("hospital", "clinic", "health", "doctor", "medical", "pharmacy")):
        tag_filters = [
            '["amenity"~"hospital|clinic|doctors|pharmacy",i]',
            '["healthcare"]',
        ]
    elif any(k in clean_cat for k in ("college", "univ", "school", "education", "institute", "academy")):
        tag_filters = [
            '["amenity"~"college|university|school|research_institute",i]',
            '["building"~"university|college|school",i]',
        ]
    elif any(k in clean_cat for k in ("mall", "shop", "retail", "supermarket", "store", "market")):
        tag_filters = [
            '["shop"~"mall|department_store|supermarket|electronics|computer|convenience|clothes",i]',
            '["amenity"~"marketplace",i]',
            '["building"~"retail|commercial",i]',
        ]
    elif any(k in clean_cat for k in ("startup", "ai", "tech", "software", "it", "corporate", "mnc", "developer")):
        tag_filters = [
            '["office"~"it|company|software|coworking|telecommunication|research|corporate|consulting",i]',
            '["industrial"~"technology_park|office",i]',
            '["commercial"]',
        ]
    elif any(k in clean_cat for k in ("bank", "fintech", "finance", "atm", "insurance")):
        tag_filters = [
            '["amenity"~"bank|atm",i]',
            '["office"~"financial|insurance",i]',
        ]
    else:
        tag_filters = [
            f'["office"~"{clean_cat}|it|company|software|coworking|telecommunication|research",i]',
            f'["amenity"~"{clean_cat}|college|university|hospital|clinic",i]',
            f'["shop"~"{clean_cat}|electronics|computer",i]',
            f'["commercial"~"{clean_cat}",i]',
        ]

    query_parts = []
    for tag in tag_filters:
        query_parts.append(f'  nwr(around:{radius},{lat},{lon}){tag}["name"];')

    inner_query = "\n".join(query_parts)
    return f"""[out:json][timeout:{settings.OVERPASS_TIMEOUT}];
(
{inner_query}
);
out center {limit};
"""


async def query_overpass_api(query_ql: str) -> Optional[List[Dict[str, Any]]]:
    headers = {
        "User-Agent": "GodsEyeBusiness/2.0 (geospatial-recon; https://godseye.ai)",
        "Accept": "application/json",
    }
    
    async with httpx.AsyncClient(timeout=float(settings.OVERPASS_TIMEOUT), follow_redirects=True) as client:
        for endpoint in OVERPASS_ENDPOINTS:
            try:
                logger.info(f"[Overpass] Querying endpoint: {endpoint}")
                response = await client.post(
                    endpoint,
                    data={"data": query_ql},
                    headers=headers
                )
                if response.status_code == 200:
                    data = response.json()
                    elements = data.get("elements", [])
                    logger.info(f"[Overpass] Received {len(elements)} elements from {endpoint}")
                    return elements
                else:
                    logger.warning(f"[Overpass] HTTP {response.status_code} from {endpoint}")
            except Exception as e:
                logger.warning(f"[Overpass] Error querying {endpoint}: {e}")
                continue
    return None


def parse_osm_element(element: Dict[str, Any], city: str) -> Optional[Dict[str, Any]]:
    tags = element.get("tags", {})
    name = tags.get("name") or tags.get("name:en")
    if not name or len(name.strip()) < 2:
        return None

    name = name.strip()
    osm_type = element.get("type", "node")
    osm_id = str(element.get("id"))

    if osm_type == "node":
        lat = element.get("lat")
        lon = element.get("lon")
    else:
        center = element.get("center", {})
        lat = center.get("lat", element.get("lat"))
        lon = center.get("lon", element.get("lon"))

    if lat is None or lon is None:
        return None

    category = (
        tags.get("office") or
        tags.get("amenity") or
        tags.get("shop") or
        tags.get("craft") or
        tags.get("commercial") or
        "Technology & Business"
    ).title()

    street = tags.get("addr:street")
    housenumber = tags.get("addr:housenumber")
    postcode = tags.get("addr:postcode")
    addr_full = tags.get("addr:full")

    if addr_full:
        address = addr_full
    elif street:
        parts = [p for p in [housenumber, street, city, postcode] if p]
        address = ", ".join(parts)
    else:
        address = f"{name}, {city}"

    raw_website = tags.get("website") or tags.get("contact:website") or tags.get("url")
    phone = tags.get("phone") or tags.get("contact:phone")
    email = tags.get("email") or tags.get("contact:email")
    opening_hours = tags.get("opening_hours")

    domain = None
    if raw_website:
        try:
            parsed_url = urllib.parse.urlparse(raw_website if "://" in raw_website else f"https://{raw_website}")
            domain = parsed_url.netloc.lower().replace("www.", "")
        except Exception:
            domain = None
    if not domain:
        # Strictly authentic OSM provenance domain without synthetic commercial domain fabrication
        domain = f"{osm_type}.{osm_id}.osm.org"

    return {
        "osm_id": osm_id,
        "osm_type": osm_type,
        "name": name,
        "domain": domain,
        "category": category,
        "industry": category,
        "hq_city": city.title(),
        "hq_country": "India" if any(c in city.lower() for c in ["pune", "mumbai", "bangalore", "delhi", "hyderabad"]) else "United States",
        "hq_address": address,
        "latitude": float(lat),
        "longitude": float(lon),
        "website": raw_website,
        "phone": phone,
        "contact_email": email,
        "opening_hours": opening_hours,
        "source": "OpenStreetMap",
        "source_url": f"https://www.openstreetmap.org/{osm_type}/{osm_id}",
        "tags": tags,
    }


async def discover_via_overpass(
    city: str,
    category: str = "software",
    radius_meters: int = 15000,
    limit: int = 250
) -> List[Dict[str, Any]]:
    cache_key = f"{city.strip().lower()}:{category.strip().lower()}:{radius_meters}:{limit}"
    now = time.time()
    if cache_key in _OVERPASS_CACHE:
        cached_time, cached_results = _OVERPASS_CACHE[cache_key]
        if now - cached_time < settings.CACHE_TTL:
            logger.info(f"[Overpass] Returning {len(cached_results)} cached items for {cache_key}")
            return cached_results

    lat, lon = get_hub_coordinates(city)
    query_ql = build_overpass_query(lat, lon, category, radius_meters, limit * 2)
    elements = await query_overpass_api(query_ql)

    results: List[Dict[str, Any]] = []
    seen_domains = set()
    seen_names = set()

    if elements:
        for el in elements:
            parsed = parse_osm_element(el, city)
            if not parsed:
                continue

            norm_name = re.sub(r'[^a-zA-Z0-9]', '', parsed["name"].lower())
            if norm_name in seen_names or (parsed["domain"] and parsed["domain"] in seen_domains):
                continue

            seen_names.add(norm_name)
            if parsed["domain"]:
                seen_domains.add(parsed["domain"])

            results.append(parsed)
            if len(results) >= limit:
                break

    logger.info(f"[Overpass] Found {len(results)} authentic entities for {city} / {category}")
    return results


class OverpassDiscoveryEngine:
    def __init__(self, endpoint: Optional[str] = None, timeout: Optional[int] = None):
        self.endpoint = endpoint or settings.OVERPASS_ENDPOINT
        self.timeout = timeout or settings.OVERPASS_TIMEOUT

    def discover_businesses(
        self,
        city: str,
        category: str = "software",
        country: Optional[str] = None,
        radius: int = 15000,
        limit: int = 25,
    ) -> List[Dict[str, Any]]:
        import asyncio
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        if loop.is_running():
            # Synchronous execution within running event loop
            headers = {
                "User-Agent": "GodsEyeBusiness/2.0 (geospatial-recon; https://godseye.ai)",
                "Accept": "application/json",
            }
            lat, lon = get_hub_coordinates(city)
            query_ql = build_overpass_query(lat, lon, category, radius, limit * 2)
            for ep in OVERPASS_ENDPOINTS:
                try:
                    with httpx.Client(timeout=float(self.timeout), follow_redirects=True) as client:
                        resp = client.post(ep, data={"data": query_ql}, headers=headers)
                        if resp.status_code == 200:
                            elements = resp.json().get("elements", [])
                            results = []
                            seen = set()
                            for el in elements:
                                parsed = parse_osm_element(el, city)
                                if not parsed:
                                    continue
                                norm = re.sub(r'[^a-zA-Z0-9]', '', parsed["name"].lower())
                                if norm in seen:
                                    continue
                                seen.add(norm)
                                if country:
                                    parsed["hq_country"] = country
                                results.append(parsed)
                                if len(results) >= limit:
                                    break
                            return results
                except Exception as e:
                    logger.warning(f"[OverpassEngine] Error with {ep}: {e}")
                    continue
            return []
        else:
            return loop.run_until_complete(discover_via_overpass(city, category, radius, limit))


def search_entity_osm(query: str, city: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Search OpenStreetMap in real time for a specific company, institution, or commercial place.
    Uses Nominatim API and targeted Overpass matching to resolve exact GPS coordinates.
    Strictly authentic source data.
    """
    if not query or len(query.strip()) < 2:
        return []

    clean_q = query.strip()
    full_q = f"{clean_q}, {city}" if city and city.lower() not in clean_q.lower() else clean_q

    headers = {
        "User-Agent": "GodsEyeBusiness/2.0 (geospatial-recon; https://godseye.ai)",
        "Accept": "application/json",
    }

    results: List[Dict[str, Any]] = []
    seen: set = set()

    # 1. First try Nominatim Search API
    try:
        encoded = urllib.parse.quote(full_q)
        nom_url = f"https://nominatim.openstreetmap.org/search?q={encoded}&format=json&addressdetails=1&limit={limit}"
        with httpx.Client(timeout=8.0, follow_redirects=True) as client:
            resp = client.get(nom_url, headers=headers)
            if resp.status_code == 200:
                items = resp.json()
                for it in items:
                    name = it.get("name") or it.get("display_name", "").split(",")[0].strip()
                    lat = float(it["lat"])
                    lon = float(it["lon"])
                    osm_id = str(it.get("osm_id", ""))
                    osm_type = it.get("osm_type", "node")

                    norm_key = re.sub(r'[^a-zA-Z0-9]', '', name.lower())
                    if norm_key in seen:
                        continue
                    seen.add(norm_key)

                    addr = it.get("address", {})
                    hq_city = addr.get("city") or addr.get("town") or addr.get("suburb") or addr.get("state_district") or (city or "Pune")
                    hq_country = addr.get("country") or "India"
                    category = str(it.get("type", "Commercial")).replace("_", " ").title()

                    domain = f"{osm_type}.{osm_id}.osm.org"

                    results.append({
                        "osm_id": osm_id,
                        "osm_type": osm_type,
                        "name": name,
                        "domain": domain,
                        "category": category,
                        "industry": category,
                        "hq_city": str(hq_city).title(),
                        "hq_country": hq_country,
                        "hq_address": it.get("display_name", f"{name}, {hq_city}"),
                        "latitude": lat,
                        "longitude": lon,
                        "phone": None,
                        "contact_email": None,
                        "source": "OpenStreetMap Nominatim",
                        "source_url": f"https://www.openstreetmap.org/{osm_type}/{osm_id}",
                    })
    except Exception as e:
        logger.warning(f"[OSM Search] Nominatim error: {e}")

    # 2. If Nominatim found results, return them
    if results:
        return results

    # 3. Fallback: targeted Overpass name regex query around hub
    if city:
        lat, lon = get_hub_coordinates(city)
        clean_regex = re.sub(r'[^a-zA-Z0-9]', '', clean_q.lower())
        overpass_q = f"""[out:json][timeout:3];
nwr(around:35000,{lat},{lon})["name"~"{clean_regex}",i];
out center {limit};"""
        try:
            with httpx.Client(timeout=3.0, follow_redirects=True) as client:
                for ep in OVERPASS_ENDPOINTS:
                    try:
                        r = client.post(ep, data={"data": overpass_q}, headers=headers)
                        if r.status_code == 200:
                            elements = r.json().get("elements", [])
                            for el in elements:
                                parsed = parse_osm_element(el, city)
                                if parsed:
                                    results.append(parsed)
                            if results:
                                break
                    except Exception:
                        continue
        except Exception as e:
            logger.warning(f"[OSM Search] Overpass fallback error: {e}")

    return results


def parse_natural_language_query(query: str, default_city: Optional[str] = None) -> Dict[str, Any]:
    """
    Parse natural language queries like 'therapist near me', 'cafes in Pune', 'AI startups'.
    Extracts category/concept, location string, and detects 'near me' intent.
    """
    if not query:
        return {"category": "all", "location": default_city or "Pune", "is_near_me": False, "clean_query": ""}

    q = query.strip()
    is_near_me = False
    location = None
    category = q

    # Check for "near me", "around me", "nearby", "close to me"
    near_me_pattern = r'\b(near\s+me|around\s+me|nearby|close\s+to\s+me)\b'
    if re.search(near_me_pattern, q, re.IGNORECASE):
        is_near_me = True
        category = re.sub(near_me_pattern, '', q, flags=re.IGNORECASE).strip()

    # Check for "in <city/location>", "at <city/location>", "around <city/location>"
    loc_pattern = r'\b(?:in|at|around)\s+([a-zA-Z\s]{2,30})$'
    loc_match = re.search(loc_pattern, category, re.IGNORECASE)
    if loc_match and not is_near_me:
        location = loc_match.group(1).strip()
        category = category[:loc_match.start()].strip()

    # Check if a known city hub is mentioned in the query
    if not location and not is_near_me:
        q_lower = q.lower()
        for hub in HUB_COORDINATES.keys():
            if hub in q_lower:
                location = hub.title()
                category = re.sub(rf'\b{re.escape(hub)}\b', '', category, flags=re.IGNORECASE).strip()
                break

    clean_category = re.sub(r'\s+', ' ', category).strip()
    if not clean_category:
        clean_category = "all"

    return {
        "category": clean_category,
        "location": location or (None if is_near_me else (default_city or "Pune")),
        "is_near_me": is_near_me,
        "clean_query": q,
    }


def geocode_location_nominatim(location_str: str) -> Optional[Dict[str, Any]]:
    """
    Geocode a location or landmark using OpenStreetMap Nominatim API.
    Returns latitude, longitude, and bounding box with authentic provenance.
    """
    if not location_str or len(location_str.strip()) < 2:
        return None

    clean_loc = location_str.strip()
    headers = {
        "User-Agent": "GodsEyeBusiness/2.0 (geospatial-recon; https://godseye.ai)",
        "Accept": "application/json",
    }

    try:
        encoded = urllib.parse.quote(clean_loc)
        url = f"https://nominatim.openstreetmap.org/search?q={encoded}&format=json&addressdetails=1&limit=1"
        with httpx.Client(timeout=8.0, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                if data and len(data) > 0:
                    first = data[0]
                    lat = float(first["lat"])
                    lon = float(first["lon"])
                    addr = first.get("address", {})
                    city = addr.get("city") or addr.get("town") or addr.get("suburb") or addr.get("state_district") or clean_loc
                    country = addr.get("country") or "India"
                    return {
                        "lat": lat,
                        "lon": lon,
                        "display_name": first.get("display_name", clean_loc),
                        "city": str(city).title(),
                        "country": country,
                        "boundingbox": [float(x) for x in first.get("boundingbox", [lat - 0.05, lat + 0.05, lon - 0.05, lon + 0.05])],
                    }
    except Exception as e:
        logger.warning(f"[Nominatim Geocode] Failed to geocode '{clean_loc}': {e}")

    # Fallback to hub coordinates if available
    lat, lon = get_hub_coordinates(clean_loc)
    return {
        "lat": lat,
        "lon": lon,
        "display_name": f"{clean_loc.title()} Hub Center",
        "city": clean_loc.title(),
        "country": "India",
        "boundingbox": [lat - 0.05, lat + 0.05, lon - 0.05, lon + 0.05],
    }


def search_nearby_osm(
    query_or_category: str,
    lat: float,
    lon: float,
    radius: int = 15000,
    limit: int = 50,
    city_name: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Search OpenStreetMap nearby a specific GPS coordinate for matching entities.
    Executes targeted Overpass QL query without artificial caps (supports 100-2500).
    """
    headers = {
        "User-Agent": "GodsEyeBusiness/2.0 (geospatial-recon; https://godseye.ai)",
        "Accept": "application/json",
    }
    query_ql = build_overpass_query(lat, lon, query_or_category, radius, limit)
    results = []
    seen = set()
    city_label = city_name or "Local Area"

    # 1. First query fast Nominatim category search with mapped terms
    city_label = city_name or "Pune"
    cat_lower = query_or_category.lower()
    if any(k in cat_lower for k in ("therapist", "counsel", "psych", "therapy")):
        nom_search_term = f"clinic in {city_label}"
    elif any(k in cat_lower for k in ("cafe", "coffee", "bakery", "restaurant")):
        nom_search_term = f"cafe in {city_label}"
    elif any(k in cat_lower for k in ("startup", "software", "tech", "ai", "it")):
        nom_search_term = f"software technology in {city_label}"
    elif any(k in cat_lower for k in ("hospital", "health", "medical", "doctor")):
        nom_search_term = f"hospital in {city_label}"
    elif any(k in cat_lower for k in ("college", "univ", "school", "education")):
        nom_search_term = f"college in {city_label}"
    elif any(k in cat_lower for k in ("mall", "shop", "retail", "store")):
        nom_search_term = f"mall in {city_label}"
    else:
        nom_search_term = f"{query_or_category} in {city_label}"

    nom_results = search_entity_osm(query=nom_search_term, city=city_label, limit=limit)
    for r in nom_results:
        norm = re.sub(r'[^a-zA-Z0-9]', '', r["name"].lower())
        if norm not in seen:
            seen.add(norm)
            results.append(r)

    if len(results) >= min(limit, 10):
        return results

    # 2. Overpass QL execution with fast failover
    try:
        with httpx.Client(timeout=3.5, follow_redirects=True) as client:
            for ep in OVERPASS_ENDPOINTS:
                try:
                    resp = client.post(ep, data={"data": query_ql}, headers=headers)
                    if resp.status_code == 200:
                        elements = resp.json().get("elements", [])
                        for el in elements:
                            parsed = parse_osm_element(el, city_label)
                            if not parsed:
                                continue
                            norm = re.sub(r'[^a-zA-Z0-9]', '', parsed["name"].lower())
                            if norm in seen:
                                continue
                            seen.add(norm)
                            results.append(parsed)
                            if len(results) >= limit:
                                break
                        if results:
                            break
                except Exception as ex:
                    logger.warning(f"[Nearby OSM] Error with {ep}: {ex}")
                    continue
    except Exception as e:
        logger.warning(f"[Nearby OSM] Failed to execute nearby query: {e}")

    return results
