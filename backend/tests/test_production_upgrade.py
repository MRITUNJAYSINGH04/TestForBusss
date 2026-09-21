import pytest
import asyncio
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.overpass_discovery import (
    OverpassDiscoveryEngine,
    build_overpass_query,
    parse_osm_element,
    get_hub_coordinates,
)
from backend.app.services.contact_enricher import is_safe_url, clean_extracted_email, ContactEnricher
from backend.app.services.osint_providers import (
    PassiveDnsTechProvider,
    SpiderFootProvider,
    HarvesterProvider,
    SherlockProvider,
)
from backend.app.services.news_intelligence import classify_signal_type, extract_funding_amount, NewsIntelligenceCrawler
from backend.app.services.gap_analyzer import analyze_company_gaps, LLMGapAnalyzer

client = TestClient(app)


# ------------------------------------------------------------------------------
# 1. Overpass Discovery Engine Tests
# ------------------------------------------------------------------------------

def test_overpass_query_builder():
    lat, lon = 18.5204, 73.8567
    query = build_overpass_query(lat, lon, "hospital", radius=5000, limit=10)
    assert "[out:json]" in query
    assert "nwr(around:5000,18.5204,73.8567)" in query
    assert "hospital" in query


def test_overpass_hub_coordinates():
    pune_lat, pune_lon = get_hub_coordinates("Pune")
    assert abs(pune_lat - 18.5204) < 0.01
    assert abs(pune_lon - 73.8567) < 0.01

    ny_lat, ny_lon = get_hub_coordinates("New York")
    assert abs(ny_lat - 40.7128) < 0.01


def test_overpass_element_parsing():
    raw_node = {
        "type": "node",
        "id": 12345678,
        "lat": 18.5312,
        "lon": 73.8445,
        "tags": {
            "name": "Ruby Hall Clinic",
            "amenity": "hospital",
            "addr:street": "Sasoon Road",
            "phone": "+91 20 6645 5100",
            "website": "https://www.rubyhall.com",
        }
    }
    parsed = parse_osm_element(raw_node, "Pune")
    assert parsed is not None
    assert parsed["name"] == "Ruby Hall Clinic"
    assert parsed["latitude"] == 18.5312
    assert parsed["longitude"] == 73.8445
    assert parsed["domain"] == "rubyhall.com"
    assert parsed["phone"] == "+91 20 6645 5100"
    assert "openstreetmap.org/node/12345678" in parsed["source_url"]


# ------------------------------------------------------------------------------
# 2. Contact Enricher & SSRF Protection Tests
# ------------------------------------------------------------------------------

def test_ssrf_protection_blocked_ips():
    # Loopback & Localhost
    assert is_safe_url("http://localhost:8000") is False
    assert is_safe_url("http://127.0.0.1") is False
    assert is_safe_url("http://127.0.0.2") is False

    # AWS Metadata endpoint
    assert is_safe_url("http://169.254.169.254/latest/meta-data/") is False

    # RFC 1918 Private Ranges
    assert is_safe_url("http://10.0.0.1") is False
    assert is_safe_url("http://172.16.0.1") is False
    assert is_safe_url("http://192.168.1.1") is False

    # Safe public domains
    assert is_safe_url("https://www.google.com") is True
    assert is_safe_url("https://persistent.com") is True


def test_email_normalization():
    assert clean_extracted_email("contact@example.com") == "contact@example.com"
    assert clean_extracted_email("info@test.co.in.") == "info@test.co.in"
    # Filter out common image extensions or garbage
    assert clean_extracted_email("user@example.com.png") is None


# ------------------------------------------------------------------------------
# 3. OSINT Provider Framework Tests
# ------------------------------------------------------------------------------

def test_osint_graceful_cli_fallback():
    # If tools are not installed in environment, they must return status="unavailable" without crashing
    spider = SpiderFootProvider()
    res_spider = asyncio.run(spider.scan("example.com"))
    assert res_spider["provider"] == "SpiderFoot"
    assert res_spider["provider_status"] in ("available", "unavailable")

    harvester = HarvesterProvider()
    res_harv = asyncio.run(harvester.scan("example.com"))
    assert res_harv["provider"] == "theHarvester"
    assert res_harv["provider_status"] in ("available", "unavailable")

    sherlock = SherlockProvider()
    res_sher = asyncio.run(sherlock.scan("target_handle"))
    assert res_sher["provider"] == "Sherlock"
    assert res_sher["provider_status"] in ("available", "unavailable")


def test_passive_dns_gather():
    provider = PassiveDnsTechProvider()
    res = provider.gather("Google", domain="google.com")
    assert "provider" in res
    assert "dns_records" in res
    assert "security_headers" in res


# ------------------------------------------------------------------------------
# 4. News Intelligence & Intent Signal Tests
# ------------------------------------------------------------------------------

def test_news_signal_classification():
    assert classify_signal_type("Startup raises $25M in Series B funding round") == "FUNDING"
    assert classify_signal_type("Tech giant opens new regional engineering hub") == "EXPANSION"
    assert classify_signal_type("Enterprise announces hiring surge for 500 AI engineers") == "HIRING"
    assert classify_signal_type("Conglomerate completes acquisition of logistics partner") == "ACQUISITION"


def test_funding_amount_extraction():
    assert extract_funding_amount("Company secures $50M investment") == "$50M"
    assert extract_funding_amount("Firm raises ₹150 cr in growth capital") == "₹150 cr"
    assert extract_funding_amount("Company announces new product update") == "Unknown"


# ------------------------------------------------------------------------------
# 5. Evidence-Grounded AI Gap Analysis Tests
# ------------------------------------------------------------------------------

def test_analyze_company_gaps_structure():
    company = {
        "name": "Test Logistics Corp",
        "domain": "testlogistics.com",
        "industry": "Supply Chain",
        "hq_city": "Pune",
        "tech_stack": ["PostgreSQL", "Kafka"],
    }
    profile = {
        "full_name": "Test Consultant",
        "tools_utilized": ["PostgreSQL", "Kafka", "Python"],
    }

    result = analyze_company_gaps(company, profile)
    assert "ai_gap_analysis" in result
    assert "pitch_strategy" in result
    
    # Must contain 3 operational bottlenecks
    issues = result["ai_gap_analysis"]["operational_issues"]
    assert len(issues) == 3
    assert all(isinstance(i, str) and len(i) > 5 for i in issues)

    # Must contain tailored pitch
    pitch = result["pitch_strategy"]
    assert "cold_outreach_subject" in pitch
    assert "email_body_template" in pitch
    assert "value_proposition" in pitch


# ------------------------------------------------------------------------------
# 6. Production Master Upgrade Endpoints Tests
# ------------------------------------------------------------------------------

def test_fast_search_endpoint():
    res = client.get("/api/search?q=Hospital")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "query" in data
    assert "results" in data
    assert isinstance(data["results"], list)


from unittest.mock import patch


def test_overpass_endpoint_mock_safe():
    payload = {
        "city": "Pune",
        "category": "hospital",
        "limit": 2,
    }
    mock_result = [
        {
            "osm_id": "11223344",
            "osm_type": "node",
            "name": "Ruby Hall Clinic Pune",
            "hq_city": "Pune",
            "hq_country": "India",
            "hq_address": "Sassoon Road, Pune",
            "latitude": 18.5308,
            "longitude": 73.8775,
            "industry": "Healthcare",
            "category": "Hospital",
            "source": "OpenStreetMap Overpass",
            "phone": "+91 20 6645 5100",
            "domain": "rubyhall.com",
            "lead_match_score": 88.0,
        }
    ]
    with patch("backend.app.api.endpoints.discovery.OverpassDiscoveryEngine.discover_businesses", return_value=mock_result):
        res = client.post("/api/discovery/overpass", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "SUCCESS"
        assert data["city"] == "Pune"
        assert len(data["companies"]) <= 2
        assert len(data["companies"]) == 1
        assert data["companies"][0]["name"] == "Ruby Hall Clinic Pune"



def test_company_sub_endpoints():
    res = client.get("/api/companies?limit=1")
    assert res.status_code == 200
    companies = res.json()["companies"]
    assert len(companies) > 0
    co_id = companies[0]["id"]

    # Contacts
    c_res = client.get(f"/api/companies/{co_id}/contacts")
    assert c_res.status_code == 200
    assert isinstance(c_res.json(), list)

    # Technology
    t_res = client.get(f"/api/companies/{co_id}/technology")
    assert t_res.status_code == 200
    assert "technologies" in t_res.json()
    assert "security_headers" in t_res.json()

    # Signals
    s_res = client.get(f"/api/companies/{co_id}/signals")
    assert s_res.status_code == 200
    assert isinstance(s_res.json(), list)

    # AI Gap Analysis
    g_res = client.post(f"/api/companies/{co_id}/gap-analysis")
    assert g_res.status_code == 200
    assert "ai_gap_analysis" in g_res.json()


def test_leads_and_crm_endpoints():
    res = client.get("/api/companies?limit=1")
    assert res.status_code == 200
    co_id = res.json()["companies"][0]["id"]

    # POST /api/leads
    lead_res = client.post("/api/leads", json={"company_id": co_id, "status": "CONTACTED"})
    assert lead_res.status_code == 200
    assert lead_res.json()["status"] == "SUCCESS"

    # PATCH /api/leads/{id}
    patch_res = client.patch(f"/api/leads/{co_id}", json={"status": "MEETING_BOOKED"})
    assert patch_res.status_code == 200
    assert patch_res.json()["outreach_status"] == "MEETING_BOOKED"

    # CSV Export
    csv_res = client.get("/api/export/csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")


def test_natural_language_query_parsing():
    from backend.app.services.overpass_discovery import parse_natural_language_query
    
    p1 = parse_natural_language_query("therapist near me")
    assert p1["category"] == "therapist"
    assert p1["is_near_me"] is True

    p2 = parse_natural_language_query("cafes in Pune")
    assert p2["category"] == "cafes"
    assert p2["location"] == "Pune"

    p3 = parse_natural_language_query("top AI startups in Bangalore")
    assert "startups" in p3["category"] or "AI" in p3["category"]
    assert p3["location"] == "Bangalore"


def test_haversine_distance_calculation():
    from backend.app.api.endpoints.search import haversine_distance_km

    # Pune city center to nearby location
    dist = haversine_distance_km(18.5204, 73.8567, 18.5308, 73.8290)
    assert 2.0 < dist < 5.0  # Approx 3.1 km


def test_news_pulse_endpoint():
    res = client.get("/api/news/pulse?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["LIVE", "SUCCESS"]
    assert "results" in data
    assert len(data["results"]) > 0
    first = data["results"][0]
    assert "title" in first
    assert "latitude" in first
    assert "longitude" in first
    assert "signal_type" in first

