import pytest
from sqlalchemy.orm import Session
from backend.app.core.database import SessionLocal
from backend.app.models.company import CompanyNode
from backend.app.services.mass_ingestion import seed_mass_entities_if_needed
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_mass_ingestion_and_zero_fake_data():
    db = SessionLocal()
    try:
        count = seed_mass_entities_if_needed(db, min_count=10000)
        assert count >= 10000, f"Expected at least 10000 entities, found {count}"

        # Assert zero placeholder phone numbers in newly seeded mass entities
        mass_records = db.query(CompanyNode).filter(CompanyNode.source.like("%Pune Regional%")).limit(50).all()
        assert len(mass_records) > 0
        for r in mass_records:
            assert r.phone is None, f"Entity {r.name} has unverified phone: {r.phone}"
            assert r.contact_email is None, f"Entity {r.name} has unverified email: {r.contact_email}"
            assert r.latitude is not None and r.longitude is not None
            assert r.hq_address is not None
            assert "Pune" in r.hq_address or "Maharashtra" in r.hq_address
            assert r.osm_id is not None
            assert r.google_maps_url is not None
    finally:
        db.close()


def test_nlp_search_with_zero_fake_data():
    res = client.get("/api/search?q=therapist+near+me&lat=18.5204&lon=73.8567&limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    results = data["results"]
    assert len(results) > 0
    for r in results:
        assert r["distance_km"] is not None
        assert r["distance_km"] >= 0


def test_companies_endpoint_returns_mass_total():
    res = client.get("/api/companies?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 10000
    assert len(data["companies"]) == 10
