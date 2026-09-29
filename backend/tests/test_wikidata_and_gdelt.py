"""
test_wikidata_and_gdelt.py — Test Suite for Wikidata Knowledge Graph & GDELT Live Signals.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.wikidata_integration import (
    parse_wikidata_point,
    search_wikidata_company,
    fetch_wikidata_sparql_details,
    enrich_company_with_wikidata,
)
from backend.app.services.gdelt_integration import (
    fetch_gdelt_news_signals,
    _classify_signal,
    _parse_gdelt_date,
)

client = TestClient(app)


def test_wikidata_point_parsing():
    # In WKT Point format, coordinates are Point(longitude latitude)
    point_str = "Point(73.8567 18.5204)"
    parsed = parse_wikidata_point(point_str)
    assert parsed is not None
    assert abs(parsed["latitude"] - 18.5204) < 0.0001
    assert abs(parsed["longitude"] - 73.8567) < 0.0001

    # Negative coordinates
    parsed_sf = parse_wikidata_point("Point(-122.4194 37.7749)")
    assert parsed_sf is not None
    assert abs(parsed_sf["latitude"] - 37.7749) < 0.0001
    assert abs(parsed_sf["longitude"] - (-122.4194)) < 0.0001

    # Invalid input
    assert parse_wikidata_point("") is None
    assert parse_wikidata_point("InvalidCoordinates") is None


def test_wikidata_invalid_id_raises():
    with pytest.raises(ValueError):
        import asyncio
        asyncio.run(fetch_wikidata_sparql_details("NOT_A_QID"))


def test_gdelt_classification_and_date():
    assert _classify_signal("Company X raises $50M Series B funding") == "FUNDING"
    assert _classify_signal("Acme Corp acquires competitor for $200M") == "ACQUISITION"
    assert _classify_signal("Tech giant opens new headquarters in Pune") == "EXPANSION"
    assert _classify_signal("Board appoints new CEO") == "LEADERSHIP"

    iso_date = _parse_gdelt_date("20231015143000")
    assert "2023-10-15" in iso_date


@pytest.mark.anyio
async def test_wikidata_search_and_sparql():
    # Test Wikidata Action API search
    results = await search_wikidata_company("Microsoft", limit=3)
    assert isinstance(results, list)
    if results:
        first = results[0]
        assert "id" in first
        assert first["id"].startswith("Q")
        assert "label" in first
        assert "url" in first

        # Test SPARQL details for entity Q2283 (Microsoft)
        details = await fetch_wikidata_sparql_details("Q2283")
        assert details["wikidata_id"] == "Q2283"
        assert details["provenance"] == "Wikidata Open Knowledge Graph (SPARQL)"
        assert "website" in details
        assert "founders" in details
        assert "ceo" in details


@pytest.mark.anyio
async def test_gdelt_live_or_fallback_signals():
    signals = await fetch_gdelt_news_signals("Artificial Intelligence", max_records=3)
    assert isinstance(signals, list)
    if signals:
        first = signals[0]
        assert "title" in first
        assert "url" in first
        assert "signal_type" in first


def test_gdelt_api_endpoints():
    # Test GET /api/gdelt/signals
    resp = client.get("/api/gdelt/signals?q=Technology&limit=3")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert "signals" in data

    # Test GET /api/gdelt/wikidata/search
    resp_w = client.get("/api/gdelt/wikidata/search?q=Infosys&limit=2")
    assert resp_w.status_code == 200
    w_data = resp_w.json()
    assert w_data["status"] == "SUCCESS"
    assert "results" in w_data

    # Test GET /api/gdelt/wikidata/entity/Q2283
    resp_e = client.get("/api/gdelt/wikidata/entity/Q2283")
    assert resp_e.status_code == 200
    e_data = resp_e.json()
    assert e_data["status"] == "SUCCESS"
    assert e_data["entity_id"] == "Q2283"
    assert "details" in e_data
