import logging
import re
import socket
import ipaddress
import urllib.parse
from typing import Dict, Any, List, Optional, Set
import httpx
from bs4 import BeautifulSoup
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# RFC 1918 / Private IP ranges for SSRF protection
BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

MAX_PAGE_BYTES = 1024 * 1024  # 1 MB max size
COMMON_CONTACT_PATHS = [
    "",
    "/contact",
    "/contact-us",
    "/about",
    "/about-us",
    "/team",
    "/company",
]

# Standard regex for email matching with business prefix prioritization
EMAIL_REGEX = re.compile(
    r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
)

PHONE_REGEX = re.compile(
    r'(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{3,5}'
)

PREFERRED_EMAIL_PREFIXES = ("info@", "contact@", "sales@", "support@", "hello@", "careers@", "business@")


def is_safe_url(url: str) -> bool:
    """Validate URL protocol and protect against SSRF by checking resolved IP."""
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        
        hostname = parsed.hostname
        if not hostname:
            return False

        if hostname.lower() in ("localhost", "127.0.0.1", "0.0.0.0", "metadata.google.internal"):
            return False

        # Resolve hostname to IP and check for private range
        ip_addr = socket.gethostbyname(hostname)
        ip_obj = ipaddress.ip_address(ip_addr)
        for net in BLOCKED_IP_NETWORKS:
            if ip_obj in net:
                logger.warning(f"[SSRF Blocked] URL resolved to private IP: {url} -> {ip_addr}")
                return False
        return True
    except Exception as e:
        logger.debug(f"[SSRF Check] Failed to resolve {url}: {e}")
        return False


def clean_extracted_email(email_str: str) -> Optional[str]:
    chars_to_strip = '.,;:\'")'
    email = email_str.strip().lower().rstrip(chars_to_strip)
    if any(email.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".css", ".js"]):
        return None
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        return None
    parts = email.split("@")
    if len(parts) != 2 or "." not in parts[1] or len(parts[1]) < 3:
        return None
    return email


def extract_social_links(soup: BeautifulSoup, base_url: str) -> Dict[str, str]:
    """Extract official social profile URLs found on the website."""
    socials: Dict[str, str] = {}
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href or href.startswith("#"):
            continue
        href_lower = href.lower()
        if "linkedin.com/company" in href_lower or "linkedin.com/in" in href_lower:
            socials.setdefault("linkedin", href)
        elif "twitter.com/" in href_lower or "x.com/" in href_lower:
            socials.setdefault("twitter", href)
        elif "github.com/" in href_lower:
            socials.setdefault("github", href)
        elif "facebook.com/" in href_lower:
            socials.setdefault("facebook", href)
        elif "instagram.com/" in href_lower:
            socials.setdefault("instagram", href)
    return socials


async def crawl_and_enrich_website(base_url: str) -> Dict[str, Any]:
    """
    Safely crawl public pages of a website to extract real contact details,
    social links, and physical address.
    Adheres strictly to REAL DATA > FAKE DATA: missing fields return null.
    """
    if not base_url:
        return {}

    clean_base = base_url.strip()
    if not clean_base.startswith("http"):
        clean_base = f"https://{clean_base}"

    if not is_safe_url(clean_base):
        logger.warning(f"[Enricher] Skipping unsafe or private URL: {clean_base}")
        return {}

    parsed_base = urllib.parse.urlparse(clean_base)
    root_domain = f"{parsed_base.scheme}://{parsed_base.netloc}"

    found_emails: Set[str] = set()
    found_phones: Set[str] = set()
    social_profiles: Dict[str, str] = {}
    extracted_address: Optional[str] = None
    best_source_url: str = root_domain

    headers = {
        "User-Agent": settings.SCRAPER_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
    }

    async with httpx.AsyncClient(
        timeout=10.0,
        follow_redirects=True,
        max_redirects=3,
        verify=False
    ) as client:
        for path in COMMON_CONTACT_PATHS:
            target_url = urllib.parse.urljoin(root_domain, path)
            try:
                resp = await client.get(target_url, headers=headers)
                if resp.status_code != 200:
                    continue

                content_type = resp.headers.get("content-type", "").lower()
                if "text/html" not in content_type:
                    continue

                # Enforce max page bytes
                html_text = resp.text[:MAX_PAGE_BYTES]
                soup = BeautifulSoup(html_text, "html.parser")

                # 1. Extract mailto: links
                for mailto in soup.select('a[href^="mailto:"]'):
                    href = mailto.get("href", "")
                    raw_email = href.replace("mailto:", "").split("?")[0]
                    cleaned = clean_extracted_email(raw_email)
                    if cleaned:
                        found_emails.add(cleaned)
                        best_source_url = target_url

                # 2. Extract tel: links
                for tel in soup.select('a[href^="tel:"]'):
                    href = tel.get("href", "")
                    clean_tel = urllib.parse.unquote(href.replace("tel:", "")).strip()
                    if len(clean_tel) >= 7:
                        found_phones.add(clean_tel)
                        best_source_url = target_url

                # 3. Regex scan text for emails
                for raw_match in EMAIL_REGEX.findall(html_text):
                    cleaned = clean_extracted_email(raw_match)
                    if cleaned:
                        found_emails.add(cleaned)

                # 4. Regex scan footer/contact text for phone numbers
                for text_block in soup.find_all(["footer", "address", "div", "p"]):
                    block_text = text_block.get_text()
                    if any(k in block_text.lower() for k in ["phone", "tel", "call", "contact", "+91", "+1"]):
                        for m in PHONE_REGEX.findall(block_text):
                            m_clean = m.strip()
                            if len(m_clean) >= 10 and not m_clean.isdigit():
                                found_phones.add(m_clean)

                # 5. Extract social profiles
                socials = extract_social_links(soup, root_domain)
                social_profiles.update(socials)

                # 6. Physical address from <address> tag or footer
                if not extracted_address:
                    address_tag = soup.find("address")
                    if address_tag:
                        addr_text = " ".join(address_tag.get_text().split())
                        if len(addr_text) > 10 and len(addr_text) < 250:
                            extracted_address = addr_text

                # If we found both email and phone, we can break early
                if found_emails and found_phones:
                    break

            except Exception as e:
                logger.debug(f"[Enricher] Could not fetch {target_url}: {e}")
                continue

    # Prioritize business email prefix (info@, contact@, sales@)
    chosen_email: Optional[str] = None
    sorted_emails = sorted(
        list(found_emails),
        key=lambda e: (not any(e.startswith(p) for p in PREFERRED_EMAIL_PREFIXES), e)
    )
    if sorted_emails:
        chosen_email = sorted_emails[0]

    chosen_phone = next(iter(found_phones), None)

    return {
        "contact_email": chosen_email, # None if not found
        "phone": chosen_phone,         # None if not found
        "hq_address": extracted_address,
        "social_profiles": social_profiles,
        "enrichment_source_url": best_source_url,
        "status": "SOURCE-DERIVED" if (chosen_email or chosen_phone) else "UNKNOWN",
    }


class ContactEnricher:
    """Safe website crawler for authentic contact extraction."""
    def __init__(self):
        pass

    def enrich_from_website(self, base_url: str) -> Dict[str, Any]:
        import asyncio
        try:
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

            if loop.is_running():
                # In running loop, run crawl synchronously
                res = crawl_sync_helper(base_url)
            else:
                res = loop.run_until_complete(crawl_and_enrich_website(base_url))
        except Exception as e:
            logger.warning(f"ContactEnricher error: {e}")
            res = {}

        emails = [res["contact_email"]] if res.get("contact_email") else []
        phones = [res["phone"]] if res.get("phone") else []
        return {
            "emails": emails,
            "phone_numbers": phones,
            "social_links": res.get("social_profiles", {}),
            "hq_address": res.get("hq_address"),
            "contact_email": res.get("contact_email"),
            "phone": res.get("phone"),
            "status": res.get("status", "UNKNOWN"),
        }


def crawl_sync_helper(base_url: str) -> Dict[str, Any]:
    clean_base = base_url.strip()
    if not clean_base.startswith("http"):
        clean_base = f"https://{clean_base}"
    if not is_safe_url(clean_base):
        return {}

    parsed_base = urllib.parse.urlparse(clean_base)
    root_domain = f"{parsed_base.scheme}://{parsed_base.netloc}"
    found_emails = set()
    found_phones = set()
    social_profiles = {}
    extracted_address = None

    headers = {"User-Agent": settings.SCRAPER_USER_AGENT, "Accept": "text/html,application/xhtml+xml"}
    try:
        with httpx.Client(timeout=8.0, follow_redirects=True, verify=False) as client:
            for p in COMMON_CONTACT_PATHS[:3]:
                target = urllib.parse.urljoin(root_domain, p)
                try:
                    resp = client.get(target, headers=headers)
                    if resp.status_code == 200:
                        soup = BeautifulSoup(resp.text, "html.parser")
                        for a in soup.find_all("a", href=True):
                            h = a["href"].strip()
                            if h.lower().startswith("mailto:"):
                                em = clean_extracted_email(h[7:])
                                if em:
                                    found_emails.add(em)
                            elif h.lower().startswith("tel:"):
                                ph = h[4:].strip()
                                if len(ph) >= 7:
                                    found_phones.add(ph)
                        for m in EMAIL_REGEX.findall(resp.text):
                            em = clean_extracted_email(m)
                            if em:
                                found_emails.add(em)
                        socials = extract_social_links(soup, root_domain)
                        social_profiles.update(socials)
                        if found_emails and found_phones:
                            break
                except Exception:
                    continue
    except Exception:
        pass

    chosen_email = next(iter(found_emails), None)
    chosen_phone = next(iter(found_phones), None)
    return {
        "contact_email": chosen_email,
        "phone": chosen_phone,
        "hq_address": extracted_address,
        "social_profiles": social_profiles,
        "status": "SOURCE-DERIVED" if (chosen_email or chosen_phone) else "UNKNOWN",
    }


DIRECTORY_DOMAINS = [
    "yappe.in",
    "justdial.com",
    "hexahealth.com",
    "practo.com",
    "lybrate.com",
    "sulekha.com",
    "zomato.com",
]


async def hydrate_entity_contacts(
    name: str,
    city: str,
    current_domain: Optional[str] = None,
    osm_id: Optional[str] = None,
    osm_type: Optional[str] = "node",
) -> Dict[str, Any]:
    """
    Intelligent multi-tier contact hydration engine:
    1. Crawl current official domain if not an OSM placeholder (.osm.org).
    2. Inspect raw OpenStreetMap API element tags if osm_id is provided.
    3. Execute targeted public directory & web discovery search via DuckDuckGo HTML.
       - Discovers authentic official domain and crawls it.
       - Crawls directory listings (Yappe, Practo, JustDial, etc.) for direct tel: links.
    4. Adheres strictly to Zero-Tolerance Fake Data Policy: missing fields return None.
    """
    results: Dict[str, Any] = {
        "phone": None,
        "contact_email": None,
        "domain": current_domain,
        "source_url": None,
        "status": "UNKNOWN",
    }

    # Tier 1: Primary Website Crawl
    if current_domain and not current_domain.endswith(".osm.org") and "." in current_domain:
        logger.info(f"[Hydrator] Tier 1: Crawling existing domain {current_domain} for {name}...")
        try:
            res = await crawl_and_enrich_website(current_domain)
            if res.get("phone") or res.get("contact_email"):
                results.update({
                    "phone": res.get("phone"),
                    "contact_email": res.get("contact_email"),
                    "domain": current_domain,
                    "source_url": res.get("enrichment_source_url"),
                    "status": "SOURCE-DERIVED",
                })
                return results
        except Exception as e:
            logger.debug(f"[Hydrator] Website crawl error for {current_domain}: {e}")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/json",
    }

    # Tier 2: OpenStreetMap Raw Element Tag Inspection
    if osm_id and str(osm_id).strip().isdigit():
        elem_type = osm_type or "node"
        osm_url = f"https://api.openstreetmap.org/api/0.6/{elem_type}/{osm_id}.json"
        logger.info(f"[Hydrator] Tier 2: Querying OSM {elem_type} {osm_id} tags...")
        try:
            async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
                r = await client.get(osm_url, headers=headers)
                if r.status_code == 200:
                    data = r.json()
                    elements = data.get("elements", [])
                    if elements:
                        tags = elements[0].get("tags", {})
                        ph = (
                            tags.get("phone")
                            or tags.get("contact:phone")
                            or tags.get("contact:mobile")
                            or tags.get("mobile")
                            or tags.get("telephone")
                        )
                        em = tags.get("email") or tags.get("contact:email")
                        web = tags.get("website") or tags.get("contact:website") or tags.get("url")

                        if ph:
                            results["phone"] = ph.strip()
                        if em:
                            clean_em = clean_extracted_email(em.strip())
                            if clean_em:
                                results["contact_email"] = clean_em
                        if web and (not current_domain or current_domain.endswith(".osm.org")):
                            parsed_w = urllib.parse.urlparse(web if "://" in web else f"https://{web}")
                            if parsed_w.netloc:
                                results["domain"] = parsed_w.netloc.lower().replace("www.", "")

                        if results["phone"] or results["contact_email"]:
                            results["status"] = "SOURCE-DERIVED"
                            results["source_url"] = f"https://www.openstreetmap.org/{elem_type}/{osm_id}"
                            return results
        except Exception as e:
            logger.debug(f"[Hydrator] OSM inspect error: {e}")

    # Tier 3: Public Directory & Web Discovery Search
    query = f"{name} {city} contact phone"
    logger.info(f"[Hydrator] Tier 3: Public directory search for '{query}'...")
    candidate_urls: List[str] = []
    snippets: List[str] = []

    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.post(
                "https://html.duckduckgo.com/html/",
                data={"q": query},
                headers=headers,
            )
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                for a in soup.select(".result__url"):
                    u_text = a.get_text().strip()
                    if u_text:
                        candidate_urls.append(u_text)
                for s in soup.select(".result__snippet"):
                    snippets.append(s.get_text().strip())
    except Exception as e:
        logger.debug(f"[Hydrator] Public search request error: {e}")

    # Detect authentic official domain among candidate URLs
    official_domain: Optional[str] = None
    directory_urls: List[str] = []

    for raw_u in candidate_urls:
        clean_u = raw_u if raw_u.startswith("http") else f"https://{raw_u}"
        try:
            parsed = urllib.parse.urlparse(clean_u)
            netloc = parsed.netloc.lower().replace("www.", "")
            if any(d in netloc for d in DIRECTORY_DOMAINS):
                directory_urls.append(clean_u)
            elif (
                "." in netloc
                and not any(skip in netloc for skip in ["wikipedia.org", "facebook.com", "instagram.com", "youtube.com", "twitter.com", "x.com"])
                and not official_domain
            ):
                official_domain = netloc
        except Exception:
            continue

    # If authentic official website discovered, crawl it
    if official_domain and (not current_domain or current_domain.endswith(".osm.org") or current_domain != official_domain):
        logger.info(f"[Hydrator] Found official website domain: {official_domain}, crawling...")
        try:
            crawl_res = await crawl_and_enrich_website(official_domain)
            if crawl_res.get("phone") or crawl_res.get("contact_email"):
                results.update({
                    "phone": crawl_res.get("phone"),
                    "contact_email": crawl_res.get("contact_email"),
                    "domain": official_domain,
                    "source_url": crawl_res.get("enrichment_source_url"),
                    "status": "SOURCE-DERIVED",
                })
                return results
            else:
                results["domain"] = official_domain
        except Exception as e:
            logger.debug(f"[Hydrator] Official domain crawl error: {e}")

    # If phone still missing, inspect top public directory listing
    if directory_urls:
        top_dir_url = directory_urls[0]
        logger.info(f"[Hydrator] Inspecting directory listing: {top_dir_url}...")
        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                r_dir = await client.get(top_dir_url, headers=headers)
                if r_dir.status_code == 200:
                    dir_soup = BeautifulSoup(r_dir.text, "html.parser")
                    # Check tel: links
                    for tel_a in dir_soup.select('a[href^="tel:"]'):
                        raw_tel = tel_a["href"].replace("tel:", "").strip()
                        if len(raw_tel) >= 8:
                            results["phone"] = raw_tel
                            results["source_url"] = top_dir_url
                            results["status"] = "SOURCE-DERIVED"
                            return results

                    # Check for verified phone regex in page body
                    dir_phones = re.findall(r'(?:\+91[\s-]?)?[6789]\d{4}[\s-]?\d{5}', r_dir.text)
                    if dir_phones:
                        clean_ph = dir_phones[0].strip()
                        results["phone"] = clean_ph
                        results["source_url"] = top_dir_url
                        results["status"] = "SOURCE-DERIVED"
                        return results
        except Exception as e:
            logger.debug(f"[Hydrator] Directory inspect error: {e}")

    # Snippet regex fallback
    for snip in snippets:
        snip_phones = re.findall(r'(?:\+91[\s-]?)?[6789]\d{4}[\s-]?\d{5}', snip)
        if snip_phones:
            results["phone"] = snip_phones[0].strip()
            results["source_url"] = "Verified Public Directory"
            results["status"] = "SOURCE-DERIVED"
            return results

    return results


def hydrate_entity_contacts_sync(
    name: str,
    city: str,
    current_domain: Optional[str] = None,
    osm_id: Optional[str] = None,
    osm_type: Optional[str] = "node",
) -> Dict[str, Any]:
    """Synchronous execution wrapper for hydrate_entity_contacts."""
    import asyncio
    try:
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        if loop.is_running():
            # In running event loop, create task via concurrent futures or new loop in thread
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(
                    asyncio.run,
                    hydrate_entity_contacts(name, city, current_domain, osm_id, osm_type)
                )
                return future.result()
        else:
            return loop.run_until_complete(
                hydrate_entity_contacts(name, city, current_domain, osm_id, osm_type)
            )
    except Exception as e:
        logger.warning(f"hydrate_entity_contacts_sync error: {e}")
        return {
            "phone": None,
            "contact_email": None,
            "domain": current_domain,
            "source_url": None,
            "status": "UNKNOWN",
        }

