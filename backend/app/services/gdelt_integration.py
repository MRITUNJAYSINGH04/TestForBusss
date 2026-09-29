"""
gdelt_integration.py — GDELT Project 2.0 Live News & Media Intelligence Integration.
Queries the global GDELT 2.0 DOC API for enterprise media signals, funding announcements,
and real-time executive movements.
"""

import re
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger(__name__)

GDELT_DOC_API_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
USER_AGENT = "GodsEyeBusinessOSINT/2.0 (research@godseye.internal; contact: admin@thefullcircle.in)"

SIGNAL_PATTERNS = {
    "FUNDING": re.compile(r"\b(funding|seed|series [a-e]|raised|investment|venture|capital|valuation)\b", re.I),
    "ACQUISITION": re.compile(r"\b(acquires|acquisition|merger|bought|takeover)\b", re.I),
    "PARTNERSHIP": re.compile(r"\b(partner|partnership|collaborat|alliance|joint venture)\b", re.I),
    "EXPANSION": re.compile(r"\b(expands|expansion|new office|launch|launches|hiring|headquarters)\b", re.I),
    "LEADERSHIP": re.compile(r"\b(appoints|appoint|hires|ceo|cto|founder|cfo|executive|board)\b", re.I),
    "PRODUCT": re.compile(r"\b(3d print|additive manufacturing|prototype|patent|release|announces)\b", re.I),
}


def _classify_signal(title: str, snippet: str = "") -> str:
    content = f"{title} {snippet}".lower()
    for signal_type, pattern in SIGNAL_PATTERNS.items():
        if pattern.search(content):
            return signal_type
    return "BUSINESS_UPDATE"


def _parse_gdelt_date(date_str: str) -> str:
    """Formats GDELT date format '20231015T120000Z' or '20231015120000' into ISO format."""
    if not date_str:
        return datetime.now(timezone.utc).isoformat()
    clean = re.sub(r"[^\d]", "", str(date_str))
    if len(clean) >= 14:
        try:
            dt = datetime.strptime(clean[:14], "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
            return dt.isoformat()
        except ValueError:
            pass
    elif len(clean) >= 8:
        try:
            dt = datetime.strptime(clean[:8], "%Y%m%d").replace(tzinfo=timezone.utc)
            return dt.isoformat()
        except ValueError:
            pass
    return datetime.now(timezone.utc).isoformat()


async def fetch_gdelt_news_signals(
    query: str,
    max_records: int = 10,
    timespan: str = "3m",
    timeout: float = 12.0
) -> List[Dict[str, Any]]:
    """
    Fetches live news signals from GDELT 2.0 DOC API.
    Handles JSON responses and protects against rate-limits or invalid payloads.
    """
    clean_q = query.strip()
    if not clean_q:
        return []

    # Format query for GDELT
    # If phrase has spaces, wrap in quotes for exact match unless already quoted
    gdelt_query = f'"{clean_q}"' if " " in clean_q and not clean_q.startswith('"') else clean_q

    params = {
        "query": gdelt_query,
        "mode": "artlist",
        "maxrecords": min(max(1, max_records), 50),
        "format": "json",
        "sort": "datedesc",
        "timespan": timespan,
    }
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    }

    signals: List[Dict[str, Any]] = []

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(GDELT_DOC_API_URL, params=params, headers=headers)
            if resp.status_code == 200:
                # GDELT occasionally returns HTML or plain text even with format=json
                content_type = resp.headers.get("content-type", "")
                if "json" in content_type or resp.text.strip().startswith("{"):
                    try:
                        data = resp.json()
                        articles = data.get("articles", [])
                        for art in articles:
                            title = art.get("title", "")
                            url = art.get("url", "")
                            seendate = art.get("seendate", "")
                            domain = art.get("domain", "")
                            lang = art.get("language", "English")
                            country = art.get("sourcecountry", "")

                            if not title or not url:
                                continue

                            signals.append({
                                "title": title,
                                "url": url,
                                "seendate": _parse_gdelt_date(seendate),
                                "domain": domain,
                                "language": lang,
                                "source_country": country,
                                "signal_type": _classify_signal(title),
                                "source": "GDELT Project 2.0 Global Media",
                            })
                        return signals
                    except Exception as json_err:
                        logger.warning(f"[GDELT] JSON parse failed: {json_err}")
                else:
                    logger.info(f"[GDELT] Non-JSON payload returned for '{query}' (length {len(resp.text)})")
            else:
                logger.warning(f"[GDELT] HTTP {resp.status_code} for query '{query}'")
    except Exception as e:
        logger.warning(f"[GDELT] Error querying GDELT API for '{query}': {e}")

    # Fallback to authentic Google News RSS query if GDELT returned 0 or timed out
    if not signals:
        try:
            import urllib.parse
            import xml.etree.ElementTree as ET
            rss_url = f"https://news.google.com/rss/search?q={urllib.parse.quote(clean_q)}&hl=en-IN&gl=IN&ceid=IN:en"
            async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
                rss_resp = await client.get(rss_url, headers=headers)
                if rss_resp.status_code == 200:
                    root = ET.fromstring(rss_resp.text)
                    for item in root.findall(".//item")[:max_records]:
                        t_node = item.find("title")
                        l_node = item.find("link")
                        d_node = item.find("pubDate")
                        if t_node is not None and l_node is not None:
                            t_text = t_node.text or ""
                            signals.append({
                                "title": t_text,
                                "url": l_node.text or "",
                                "seendate": d_node.text if d_node is not None else datetime.now(timezone.utc).isoformat(),
                                "domain": "news.google.com",
                                "language": "English",
                                "source_country": "India/Global",
                                "signal_type": _classify_signal(t_text),
                                "source": "Verified Business RSS Stream",
                            })
        except Exception as rss_err:
            logger.debug(f"[GDELT RSS Fallback] Error: {rss_err}")

    return signals
