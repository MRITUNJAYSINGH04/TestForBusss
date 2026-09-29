import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import Base, engine, init_db
from backend.app.api.endpoints import profile, scan, companies, campaign, discovery, enrichment, search, news, viper, gdelt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure tables and migrations exist
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Global Enterprise Intelligence & Lead-Generation API for God's Eye for Business",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# VIPER OSINT & MCP Connector Prospecting
app.include_router(viper.router, prefix="/api/viper", tags=["VIPER OSINT & B2B Prospecting"])
app.include_router(viper.router, prefix="/api", tags=["VIPER Recon Direct"])
app.include_router(viper.router, prefix="/api/v1/viper", tags=["VIPER OSINT (v1)"])

# Discovery endpoints (Overpass OSM & multi-criteria search)
app.include_router(discovery.router, prefix="/api/discovery", tags=["OSM Overpass Discovery"])
app.include_router(discovery.router, prefix="/api/v1/discovery", tags=["OSM Overpass Discovery (v1)"])

# Enrichment endpoints (Safe Crawler, Passive DNS/SSL/Headers, News Signals, Evidence AI)
app.include_router(enrichment.router, prefix="/api/enrichment", tags=["Intelligence Enrichment"])
app.include_router(enrichment.router, prefix="/api/v1/enrichment", tags=["Intelligence Enrichment (v1)"])

# Fast Search endpoint (Debounced header search)
app.include_router(search.router, prefix="/api/search", tags=["Tactical Fast Search"])
app.include_router(search.router, prefix="/api/v1/search", tags=["Tactical Fast Search (v1)"])

# Operator Profile endpoints
app.include_router(profile.router, prefix="/api/profile", tags=["Operator Profile"])
app.include_router(profile.router, prefix="/api/operator/profile", tags=["Operator Profile (Alias)"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["Operator Profile (v1)"])

# Scan & Lead discovery
app.include_router(scan.router, prefix="/api/scan", tags=["Discovery & AI Scan"])
app.include_router(scan.router, prefix="/api/v1/intelligence/discover", tags=["Discovery & AI Scan (v1)"])

# Cesium Globe Companies & Dossier
app.include_router(companies.router, prefix="/api/companies", tags=["Cesium Globe Companies"])
app.include_router(companies.router, prefix="/api/v1/companies", tags=["Cesium Globe Companies (v1)"])

# Campaign, Leads & CRM Export
app.include_router(campaign.router, prefix="/api/campaign", tags=["Campaign & CRM"])
app.include_router(campaign.router, prefix="/api/campaigns", tags=["Campaigns"])
app.include_router(campaign.router, prefix="/api", tags=["Leads & CRM Direct"])
app.include_router(campaign.router, prefix="/api/v1/campaign", tags=["Campaign & CRM (v1)"])

# Real-Time Business News Pulse & Telemetry Beacons
app.include_router(news.router, prefix="/api/news", tags=["Live Business News Pulse"])
app.include_router(news.router, prefix="/api/v1/news", tags=["Live Business News Pulse (v1)"])

# GDELT Project 2.0 Live News & Wikidata Intelligence Feeds
app.include_router(gdelt.router, prefix="/api/gdelt", tags=["GDELT & Wikidata Intelligence"])
app.include_router(gdelt.router, prefix="/api/v1/gdelt", tags=["GDELT & Wikidata Intelligence (v1)"])



@app.get("/health", tags=["System Health"])
@app.get("/api/health", tags=["System Health"])
@app.get("/", tags=["System Health"])
def health_check():
    return {
        "status": "ONLINE",
        "system": "God's Eye for Business Backend",
        "version": settings.VERSION,
        "gemini_model": settings.GEMINI_MODEL,
        "database": "CONNECTED",
        "overpass_endpoint": settings.OVERPASS_ENDPOINT,
    }
