"""
test_opencorporates_reddit_commoncrawl.py — Unit and integration tests for
OpenCorporates, Reddit discussions, and Common Crawl index integrations.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.opencorporates import query_opencorporates, KNOWN_REGISTRIES
from backend.app.services.reddit_integration import query_reddit_discussions
from backend.app.services.common_crawl import (
    query_common_crawl_archives,
    _parse_common_crawl_timestamp,
)

client = TestClient(app)


def test_common_crawl_timestamp_parser():
    raw_ts = "20240415123045"
    parsed = _parse_common_crawl_timestamp(raw_ts)
    assert "2024-04-15" in parsed
    assert "12:30:45" in parsed

    empty_parsed = _parse_common_crawl_timestamp("")
    assert len(empty_parsed) > 0


@pytest.mark.anyio
async def test_opencorporates_query():
    # Test known registry fallback
    data_pers = await query_opencorporates("Persistent Systems")
    assert isinstance(data_pers, dict)
    assert "name" in data_pers
    assert "company_number" in data_pers
    assert data_pers["jurisdiction_code"] == "in"
    assert data_pers["current_status"] == "Active"

    # Test The Full Circle
    data_tfc = await query_opencorporates("The Full Circle")
    assert isinstance(data_tfc, dict)
    assert "company_number" in data_tfc


@pytest.mark.anyio
async def test_reddit_discussions_query():
    res = await query_reddit_discussions("Artificial Intelligence", limit=3)
    assert isinstance(res, list)
    if res:
        first = res[0]
        assert "title" in first
        assert "url" in first
        assert "source" in first
        assert first["source"] == "Reddit-Community-Intel"


@pytest.mark.anyio
async def test_common_crawl_archives_query():
    archives = await query_common_crawl_archives("persistent.com", limit=3)
    assert isinstance(archives, list)
    # Empty query safety
    empty_res = await query_common_crawl_archives("")
    assert empty_res == []


def test_api_multi_connector_endpoints():
    # 1. GET /api/gdelt/opencorporates
    resp_oc = client.get("/api/gdelt/opencorporates?q=Persistent+Systems")
    assert resp_oc.status_code == 200
    data_oc = resp_oc.json()
    assert data_oc["status"] == "SUCCESS"
    assert "data" in data_oc

    # 2. GET /api/gdelt/reddit
    resp_rd = client.get("/api/gdelt/reddit?q=Technology&limit=3")
    assert resp_rd.status_code == 200
    data_rd = resp_rd.json()
    assert data_rd["status"] == "SUCCESS"
    assert "discussions" in data_rd

    # 3. GET /api/gdelt/commoncrawl
    resp_cc = client.get("/api/gdelt/commoncrawl?domain=persistent.com&limit=3")
    assert resp_cc.status_code == 200
    data_cc = resp_cc.json()
    assert data_cc["status"] == "SUCCESS"
    assert "archives" in data_cc
