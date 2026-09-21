from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "God's Eye for Business API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "sqlite:///./business_intel.db"

    # Live API Credentials
    SERPAPI_API_KEY: Optional[str] = "b4b89bbe969eefc54c43f130e867a6a25985bcca03ae4dc92c521803e9295ec"
    GEMINI_API_KEY: Optional[str] = "AIzaSyBmDGdsjDg5siVFJEPlZ8SizNjq2pp6uO0"

    # OpenRouter Free Model Configuration
    OPENROUTER_API_KEY: Optional[str] = "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"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "openrouter/free"
    OPENROUTER_FALLBACK_MODELS: list[str] = [
        "google/gemini-2.0-flash-exp:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "deepseek/deepseek-r1:free",
    ]

    # Gemini model configuration
    GEMINI_MODEL: str = "gemini-flash-lite-latest"

    # Scraping & HTTP
    SCRAPER_USER_AGENT: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
    # Overpass & OpenStreetMap
    OVERPASS_ENDPOINT: str = "https://overpass-api.de/api/interpreter"
    OVERPASS_TIMEOUT: int = 25

    # Rate Limiting & Concurrency
    REQUEST_TIMEOUT: float = 20.0
    REQUEST_TIMEOUT_SECONDS: float = 20.0
    MAX_CONCURRENT_REQUESTS: int = 10
    NEWS_POLL_INTERVAL: int = 3600
    CACHE_TTL: int = 86400

    # Optional integrations
    REDIS_URL: Optional[str] = None
    NEWS_API_KEY: Optional[str] = None
    ENABLE_PASSIVE_DNS: bool = True
    ENABLE_SECURITY_HEADERS: bool = True


settings = Settings()
