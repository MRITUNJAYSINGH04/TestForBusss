"""
test_viper_and_ai_router.py — Tests for VIPER OSINT, OpenRouter Free AI Router,
and B2B Prospecting Machine.
"""

import asyncio
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.services.ai_router import ai_router, AIRouter
from backend.app.services.viper_prospector import viper_prospector

client = TestClient(app)


def test_openrouter_configuration():
    """Verifies that OpenRouter settings are configured with free models."""
    assert settings.OPENROUTER_API_KEY is not None
    assert "openrouter" in settings.OPENROUTER_BASE_URL
    assert settings.OPENROUTER_MODEL == "openrouter/free"
    assert len(settings.OPENROUTER_FALLBACK_MODELS) >= 2


def test_ai_router_json_parsing_and_fallback():
    """Tests JSON extraction and deterministic schema fallback."""
    router = AIRouter(openrouter_key="", gemini_key="")

    # Test markdown-wrapped JSON extraction
    raw_text = '```json\n{"operational_issues": ["Bottleneck A", "Bottleneck B", "Bottleneck C"]}\n```'
    parsed = router._clean_and_parse_json(raw_text)
    assert parsed is not None
    assert len(parsed["operational_issues"]) == 3

    # Test fallback default when keys are None
    fallback = {"status": "ok", "items": [1, 2, 3]}
    res = asyncio.run(router.call_llm_json("impossible_prompt", fallback_default=fallback))
    assert res == fallback


def test_viper_intent_parsing():
    """Tests parsing natural language B2B prospecting query."""
    prompt = "Find 10 AI startups in Pune with founder contact numbers"
    intent = asyncio.run(viper_prospector.parse_prospecting_intent(prompt))

    assert intent["location"].lower() == "pune"
    assert "ai" in intent["industry"].lower()
    assert intent["target_count"] == 10
    assert any("founder" in r.lower() or "ceo" in r.lower() for r in intent["target_roles"])


def test_viper_zero_fake_data_policy():
    """Ensures that VIPER leads contain ZERO dummy/mock placeholder phone numbers."""
    res = asyncio.run(
        viper_prospector.execute_prospecting(
            prompt="Find 3 healthcare clinics in Pune",
            limit=3,
        )
    )

    assert res.status == "COMPLETED"
    assert len(res.leads) > 0
    assert len(res.telemetry_logs) >= 4

    for lead in res.leads:
        # Strict zero-tolerance checks
        if lead.phone:
            assert "555-01" not in lead.phone
            assert "6703 0000" not in lead.phone
            assert "800 555" not in lead.phone
        for exec_person in lead.key_executives:
            if exec_person.phone:
                assert "555-01" not in exec_person.phone
                assert "6703 0000" not in exec_person.phone


def test_api_viper_prospect_endpoint():
    """Tests POST /api/viper/prospect."""
    payload = {
        "prompt": "Find 5 software companies in Pune",
        "location": "Pune",
        "limit": 5,
    }
    response = client.post("/api/viper/prospect", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert len(data["leads"]) <= 5
    assert len(data["telemetry_logs"]) > 0
    assert data["parsed_intent"]["location"] == "Pune"


def test_api_viper_recon_endpoint():
    """Tests POST /api/recon single company intelligence extraction."""
    payload = {
        "company_name": "Persistent Systems",
        "domain": "persistent.com",
        "city": "Pune",
    }
    response = client.post("/api/recon", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert data["company_name"] == "Persistent Systems"
    assert data["lead"] is not None
    assert data["lead"]["domain"] == "persistent.com"
    assert len(data["lead"]["key_executives"]) > 0
