import pytest
import asyncio
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.search_scraper import CorporateSearchScraper
from backend.app.services.gap_analyzer import LLMGapAnalyzer

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ONLINE"
    assert "God's Eye for Business" in data["system"]


def test_profile_endpoints():
    profile_payload = {
        "email": "test.consultant@apexai.io",
        "full_name": "Marcus Vance",
        "agency_or_business_name": "Vance Distributed Systems",
        "headline": "Principal Architect - High-Throughput Event Streaming",
        "years_of_experience": 10,
        "profile": {
            "services_offered": [
                "Kafka Event Streaming Infrastructure",
                "PostgreSQL Query Optimization",
                "Sub-second AI Telemetry Pipelines",
            ],
            "skill_matrix": [
                {"category": "Streaming", "skills": ["Kafka", "Flink"], "proficiency": "Expert"},
                {"category": "Databases", "skills": ["PostgreSQL", "PostGIS"], "proficiency": "Expert"},
            ],
            "target_industries": ["Logistics & Supply Chain", "Autonomous Vehicles"],
            "target_geographies": ["North America", "Western Europe"],
        },
    }

    # Test POST /api/profile
    post_res = client.post("/api/profile", json=profile_payload)
    assert post_res.status_code == 200
    assert post_res.json()["success"] is True

    # Test GET /api/profile
    get_res = client.get("/api/profile")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["email"] == "test.consultant@apexai.io"
    assert get_data["full_name"] == "Marcus Vance"


def test_companies_endpoint():
    response = client.get("/api/companies")
    assert response.status_code == 200
    data = response.json()
    assert "companies" in data
    assert len(data["companies"]) > 0

    # Validate CesiumJS coordinates payload structure
    sample = data["companies"][0]
    assert "latitude" in sample
    assert "longitude" in sample
    assert isinstance(sample["latitude"], (int, float))
    assert isinstance(sample["longitude"], (int, float))
    assert "top_gap" in sample
    assert "industry" in sample

    # Test GET /api/companies/{id}
    detail_res = client.get(f"/api/companies/{sample['id']}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == sample["id"]
    assert "ai_gap_analysis" in detail_data
    assert "pitch_strategy" in detail_data


def test_scraper_geocoding_and_search():
    scraper = CorporateSearchScraper()
    geo_sf = scraper.resolve_geocoding("San Francisco")
    assert abs(geo_sf["lat"] - 37.7749) < 0.01
    assert abs(geo_sf["lon"] - (-122.4194)) < 0.01
    assert geo_sf["country"] == "United States"

    geo_ldn = scraper.resolve_geocoding("London")
    assert abs(geo_ldn["lat"] - 51.5074) < 0.01
    assert geo_ldn["country"] == "United Kingdom"

    # Test resilient search fallback
    companies = asyncio.run(scraper.search_target_companies(industry="Logistics", max_results=2))
    assert len(companies) >= 2
    assert "domain" in companies[0]
    assert "latitude" in companies[0]


def test_llm_gap_analysis_engine():
    analyzer = LLMGapAnalyzer()
    company_test_context = {
        "name": "FlexPort Logistics Corp",
        "domain": "flexport.com",
        "industry": "Logistics & Supply Chain",
        "hq_city": "San Francisco",
        "hq_country": "United States",
        "detected_tech": ["Kafka", "PostgreSQL", "React", "AWS"],
    }
    user_test_profile = {
        "full_name": "Marcus Vance",
        "headline": "Principal Architect",
        "services_offered": ["Kafka Streaming", "Sub-second Telemetry"],
    }

    result = asyncio.run(analyzer.analyze_company_gaps(company_test_context, user_test_profile))
    assert "ai_gap_analysis" in result
    assert "pitch_strategy" in result

    # Strictly verify 3 critical operational issues
    gaps = result["ai_gap_analysis"].operational_issues
    assert len(gaps) == 3
    assert all(isinstance(g, str) and len(g) > 10 for g in gaps)

    # Verify pitch strategy components
    pitch = result["pitch_strategy"]
    assert len(pitch.tailored_angle) > 10
    assert len(pitch.cold_outreach_subject) > 5
    assert len(pitch.email_body_template) > 20


def test_live_scan_endpoint():
    # Test POST /api/scan endpoint invoking the entire pipeline
    scan_req = {
        "industry_override": "Logistics",
        "region_override": "San Francisco",
        "max_companies": 2,
    }
    response = client.post("/api/scan", json=scan_req)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert "companies" in data
    assert len(data["companies"]) >= 1

    sample = data["companies"][0]
    assert "latitude" in sample
    assert "longitude" in sample
    assert "top_gap" in sample
    assert sample["gaps_count"] == 3


def test_campaign_and_export_endpoints():
    # 1. Fetch any company to test campaign save
    res = client.get("/api/companies")
    assert res.status_code == 200
    companies = res.json()["companies"]
    assert len(companies) > 0
    test_co_id = companies[0]["id"]

    # 2. Test POST /api/campaign/save
    save_payload = {
        "company_id": test_co_id,
        "outreach_status": "CONTACTED",
        "custom_notes": "Reached out via LinkedIn to VP of Ops",
    }
    save_res = client.post("/api/campaign/save", json=save_payload)
    assert save_res.status_code == 200
    assert save_res.json()["outreach_status"] == "CONTACTED"

    # 3. Test GET /api/campaign
    list_res = client.get("/api/campaign")
    assert list_res.status_code == 200
    leads = list_res.json()
    assert any(lead["id"] == test_co_id for lead in leads)

    # 4. Test GET /api/campaign/export
    csv_res = client.get("/api/campaign/export")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "Company Name" in csv_res.text
    assert "Lead Match Score (%)" in csv_res.text


def test_company_news_and_osint_endpoints():
    res = client.get("/api/companies")
    assert res.status_code == 200
    companies = res.json()["companies"]
    assert len(companies) > 0
    co_id = companies[0]["id"]

    # Test GET /api/companies/{co_id}/news
    news_res = client.get(f"/api/companies/{co_id}/news")
    assert news_res.status_code == 200
    news_items = news_res.json()
    assert isinstance(news_items, list)
    assert len(news_items) >= 1
    assert "title" in news_items[0]
    assert "date" in news_items[0]

    # Test GET /api/companies/{co_id}/osint
    osint_res = client.get(f"/api/companies/{co_id}/osint")
    assert osint_res.status_code == 200
    osint_data = osint_res.json()
    assert isinstance(osint_data, dict)
    assert "cloud_provider" in osint_data
    assert "ssl_grade" in osint_data
    assert "dns_records" in osint_data


