import time
import random
import logging
import re
import urllib.parse
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import httpx
import xml.etree.ElementTree as ET
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

SIGNAL_KEYWORDS = {
    "FUNDING": ["raise", "funding", "seed", "series a", "series b", "series c", "investment", "valuation", "invests", "backed"],
    "EXPANSION": ["expand", "expansion", "new office", "enters", "opens office", "growth", "global footprint"],
    "HIRING": ["hiring", "hire", "headcount", "jobs", "recruiting", "talent", "appoints", "chief", "cto", "vp"],
    "ACQUISITION": ["acquire", "acquisition", "buys", "merger", "takes over"],
    "PRODUCT": ["launches", "unveils", "releases", "announces platform", "debuts"],
    "LEADERSHIP": ["appoints", "joins as", "ceo", "cto", "cfo", "resigns", "promoted"],
}


def classify_signal_type(text: str) -> str:
    """Classify a headline or summary into a specific business intent signal."""
    text_lower = text.lower()
    for sig_type, kws in SIGNAL_KEYWORDS.items():
        if any(kw in text_lower for kw in kws):
            return sig_type
    return "EXPANSION"


def extract_funding_amount(text: str) -> str:
    """Extract verified funding amount if explicitly stated, otherwise return Unknown."""
    match = re.search(r'(\$\d+(?:\.\d+)?\s*(?:M|B|million|billion|K)?|₹\d+(?:\.\d+)?\s*(?:cr|crore|lakh)?)', text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return "Unknown"


async def fetch_live_news_signals(company_name: str, city: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch authentic real-time news and intent signals for a company
    using Google News RSS feeds.
    Strictly follows REAL DATA > FAKE DATA: returns [] if no authentic news is found.
    """
    if not company_name or len(company_name.strip()) < 2:
        return []

    clean_name = company_name.strip()
    query = f'"{clean_name}"'
    if city and len(city) > 2:
        query += f' {city}'

    encoded_query = urllib.parse.quote(query)
    rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"

    headers = {
        "User-Agent": settings.SCRAPER_USER_AGENT,
        "Accept": "application/rss+xml, application/xml, text/xml",
    }

    signals: List[Dict[str, Any]] = []

    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(rss_url, headers=headers)
            if resp.status_code != 200:
                logger.warning(f"[News] Google RSS returned status {resp.status_code}")
                return []

            root = ET.fromstring(resp.text)
            items = root.findall(".//item")
            for item in items[:6]:
                title = item.findtext("title", "").strip()
                link = item.findtext("link", "").strip()
                pub_date = item.findtext("pubDate", "").strip()
                source_elem = item.find("source")
                source_name = source_elem.text.strip() if source_elem is not None and source_elem.text else "News Source"

                if not title:
                    continue

                signal_type = classify_signal_type(title)
                amount = extract_funding_amount(title) if signal_type == "FUNDING" else None

                signal_entry: Dict[str, Any] = {
                    "headline": title,
                    "summary": f"Detected {signal_type} intent signal for {clean_name}.",
                    "source": source_name,
                    "source_url": link,
                    "published_at": pub_date,
                    "detected_at": datetime.utcnow().isoformat(),
                    "signal_type": signal_type,
                    "confidence": 0.90,
                }
                if amount:
                    signal_entry["funding_amount"] = amount

                signals.append(signal_entry)

    except Exception as e:
        logger.warning(f"[News] Failed to fetch news for {company_name}: {e}")

    return signals


class NewsIntelligenceCrawler:
    """Crawler for real-time authentic company news signals."""
    def __init__(self):
        pass

    def fetch_company_signals(self, company_name: str, domain: Optional[str] = None) -> List[Dict[str, Any]]:
        import asyncio
        try:
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

            if loop.is_running():
                return self._fetch_sync(company_name)
            else:
                signals = loop.run_until_complete(fetch_live_news_signals(company_name))
                for s in signals:
                    s["title"] = s.get("headline", "")
                    s["source_name"] = s.get("source", "")
                    s["published_date"] = s.get("published_at", "")
                    s["relevance_score"] = s.get("confidence", 0.85)
                return signals
        except Exception as e:
            logger.warning(f"NewsIntelligenceCrawler error: {e}")
            return []

    def _fetch_sync(self, company_name: str) -> List[Dict[str, Any]]:
        if not company_name or len(company_name.strip()) < 2:
            return []
        clean_name = company_name.strip()
        encoded_query = urllib.parse.quote(f'"{clean_name}"')
        rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"
        headers = {"User-Agent": settings.SCRAPER_USER_AGENT, "Accept": "application/rss+xml, application/xml, text/xml"}
        try:
            with httpx.Client(timeout=6.0, follow_redirects=True) as client:
                resp = client.get(rss_url, headers=headers)
                if resp.status_code == 200:
                    root = ET.fromstring(resp.text)
                    items = []
                    for item in root.findall(".//item")[:5]:
                        title = item.findtext("title", "")
                        link = item.findtext("link", "")
                        pub_date = item.findtext("pubDate", "")
                        source_elem = item.find("source")
                        source_name = source_elem.text if source_elem is not None else "Google News"
                        signal = classify_signal_type(title)
                        items.append({
                            "title": title,
                            "source_url": link,
                            "source_name": source_name,
                            "published_date": pub_date,
                            "signal_type": signal,
                            "sentiment": 0.1,
                            "relevance_score": 0.85,
                            "summary": f"Detected {signal} intent signal for {clean_name}.",
                        })
                    return items
        except Exception as e:
            logger.warning(f"Sync news fetch error: {e}")
        return []


PULSE_CITIES_COORDS = {
    "pune": (18.5204, 73.8567),
    "mumbai": (19.0760, 72.8777),
    "bangalore": (12.9716, 77.5946),
    "bengaluru": (12.9716, 77.5946),
    "hyderabad": (17.3850, 78.4867),
    "delhi": (28.6139, 77.2090),
    "noida": (28.5355, 77.3910),
    "gurugram": (28.4595, 77.0266),
    "chennai": (13.0827, 80.2707),
    "san francisco": (37.7749, -122.4194),
    "new york": (40.7128, -74.0060),
    "london": (51.5074, -0.1278),
    "singapore": (1.3521, 103.8198),
}

_NEWS_PULSE_CACHE: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}


def fetch_live_business_pulse(
    city: Optional[str] = None,
    topic: Optional[str] = None,
    limit: int = 25,
    db: Any = None,
) -> List[Dict[str, Any]]:
    """
    Fetch authentic real-time business news and regional intent signals.
    Provides GPS beacon coordinates so signals pulsate directly on the CesiumJS 3D globe.
    """
    cache_key = f"{city or 'all'}_{topic or 'all'}_{limit}"
    now = time.time()
    if cache_key in _NEWS_PULSE_CACHE:
        cached_time, cached_items = _NEWS_PULSE_CACHE[cache_key]
        if now - cached_time < 300:  # 5 minute cache
            return cached_items

    query_parts = []
    if topic:
        query_parts.append(topic)
    else:
        query_parts.append('startup funding OR "raises" OR expansion OR acquisition OR hiring')

    if city:
        query_parts.append(city)
    else:
        query_parts.append('Pune OR Mumbai OR Bangalore OR India')

    raw_query = " ".join(query_parts)
    encoded = urllib.parse.quote(raw_query)
    rss_url = f"https://news.google.com/rss/search?q={encoded}&hl=en-IN&gl=IN&ceid=IN:en"

    headers = {
        "User-Agent": settings.SCRAPER_USER_AGENT,
        "Accept": "application/rss+xml, application/xml, text/xml",
    }

    news_items: List[Dict[str, Any]] = []
    try:
        with httpx.Client(timeout=8.0, follow_redirects=True) as client:
            resp = client.get(rss_url, headers=headers)
            if resp.status_code == 200:
                root = ET.fromstring(resp.text)
                for item in root.findall(".//item")[:limit]:
                    title = item.findtext("title", "").strip()
                    link = item.findtext("link", "").strip()
                    pub_date = item.findtext("pubDate", "").strip()
                    source_elem = item.find("source")
                    source_name = source_elem.text.strip() if source_elem is not None and source_elem.text else "Business Wire"

                    if not title:
                        continue

                    sig_type = classify_signal_type(title)
                    amount = extract_funding_amount(title)

                    # Extract city & coordinates
                    item_city = city.title() if city else "Global"
                    lat = 18.5204
                    lon = 73.8567
                    found_city = False

                    title_lower = title.lower()
                    for c_name, (c_lat, c_lon) in PULSE_CITIES_COORDS.items():
                        if c_name in title_lower:
                            item_city = c_name.title()
                            lat = c_lat
                            lon = c_lon
                            found_city = True
                            break

                    if not found_city and city:
                        key = city.lower()
                        for c_name, (c_lat, c_lon) in PULSE_CITIES_COORDS.items():
                            if c_name in key:
                                lat = c_lat
                                lon = c_lon
                                break

                    # Jitter so multiple pins in the same city don't completely overlap on 3D globe
                    jitter_lat = lat + (random.uniform(-0.03, 0.03))
                    jitter_lon = lon + (random.uniform(-0.03, 0.03))

                    news_items.append({
                        "id": f"pulse_{abs(hash(link)) & 0xffffffff:x}",
                        "title": title,
                        "headline": title,
                        "source": source_name,
                        "source_name": source_name,
                        "source_url": link,
                        "published_at": pub_date,
                        "published_date": pub_date,
                        "signal_type": sig_type,
                        "funding_amount": amount,
                        "city": item_city,
                        "latitude": round(jitter_lat, 4),
                        "longitude": round(jitter_lon, 4),
                        "beacon_color": (
                            "#10b981" if sig_type == "FUNDING" else
                            "#3b82f6" if sig_type == "EXPANSION" else
                            "#f59e0b" if sig_type == "HIRING" else
                            "#8b5cf6" if sig_type == "ACQUISITION" else
                            "#06b6d4"
                        ),
                        "summary": f"Detected {sig_type} telemetry signal in {item_city}.",
                    })

    except Exception as e:
        logger.warning(f"[NewsPulse] Error fetching business pulse: {e}")

    _NEWS_PULSE_CACHE[cache_key] = (now, news_items)
    return news_items

