"""
ai_router.py — Multi-tier LLM Routing Gateway for God's Eye for Business.
Cascades through OpenRouter Free Tier -> Google AI Studio Gemini -> Deterministic Fallback.
"""

import json
import logging
import re
from typing import Dict, Any, Optional, List
import httpx
from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class AIRouter:
    def __init__(
        self,
        openrouter_key: Optional[str] = None,
        gemini_key: Optional[str] = None,
        openrouter_model: Optional[str] = None,
    ):
        self.openrouter_key = openrouter_key if openrouter_key is not None else settings.OPENROUTER_API_KEY
        self.openrouter_url = f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/chat/completions"
        self.openrouter_model = openrouter_model or settings.OPENROUTER_MODEL
        self.gemini_key = gemini_key if gemini_key is not None else settings.GEMINI_API_KEY
        self.gemini_model = settings.GEMINI_MODEL

        # Cascade of free models to attempt on OpenRouter
        self.openrouter_models: List[str] = [self.openrouter_model] + [
            m for m in settings.OPENROUTER_FALLBACK_MODELS if m != self.openrouter_model
        ]

    def _clean_and_parse_json(self, text: str) -> Optional[Any]:
        """Extracts and parses JSON object or array from LLM responses."""
        if not text:
            return None
        cleaned = text.strip()
        # Remove markdown code blocks if present
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned)
            cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Attempt to locate the outer JSON boundaries { ... } or [ ... ]
            obj_match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
            if obj_match:
                try:
                    return json.loads(obj_match.group(1))
                except json.JSONDecodeError:
                    pass
            arr_match = re.search(r"(\[.*\])", cleaned, re.DOTALL)
            if arr_match:
                try:
                    return json.loads(arr_match.group(1))
                except json.JSONDecodeError:
                    pass
        return None

    async def call_openrouter(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        json_mode: bool = False,
        timeout: float = 20.0,
    ) -> Optional[str]:
        """Calls OpenRouter with fallback across supported free models."""
        if not self.openrouter_key:
            return None

        headers = {
            "Authorization": f"Bearer {self.openrouter_key}",
            "HTTP-Referer": "https://gods-eye.intel",
            "X-Title": "Gods Eye Business",
            "Content-Type": "application/json",
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        for model in self.openrouter_models:
            payload: Dict[str, Any] = {
                "model": model,
                "messages": messages,
                "temperature": 0.2,
            }
            if json_mode:
                payload["response_format"] = {"type": "json_object"}

            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.post(self.openrouter_url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        choices = data.get("choices", [])
                        if choices:
                            content = choices[0].get("message", {}).get("content", "")
                            if content.strip():
                                logger.info(f"OpenRouter success with model: {model}")
                                return content
                    elif resp.status_code == 429:
                        logger.warning("OpenRouter daily free-tier limit reached (429), cascading to Gemini/deterministic fallback...")
                        break
                    else:
                        logger.warning(
                            f"OpenRouter model {model} returned HTTP {resp.status_code}: {resp.text[:120]}"
                        )
            except Exception as exc:
                logger.warning(f"OpenRouter error on model {model}: {exc}")

        return None

    async def call_gemini(
        self,
        prompt: str,
        json_mode: bool = False,
        timeout: float = 8.0,
    ) -> Optional[str]:
        """Calls Google AI Studio Gemini API with model cascade."""
        if not self.gemini_key:
            return None

        candidate_models = [self.gemini_model, "gemini-flash-lite-latest", "gemini-flash-latest"]

        for model in candidate_models:
            if not model:
                continue
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.gemini_key}"
            payload: Dict[str, Any] = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.2,
                },
            }
            if json_mode:
                payload["generationConfig"]["response_mime_type"] = "application/json"

            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                content = parts[0].get("text", "")
                                if content.strip():
                                    logger.info(f"Gemini success with model: {model}")
                                    return content
                    elif resp.status_code in (400, 401, 403, 429):
                        logger.warning(f"Gemini returned {resp.status_code}: {resp.text[:100]}, cascading...")
                        break
                    else:
                        logger.warning(
                            f"Gemini model {model} returned HTTP {resp.status_code}: {resp.text[:100]}"
                        )
            except Exception as exc:
                logger.warning(f"Gemini call error on model {model}: {exc}")

        return None

    async def call_llm_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        fallback_default: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Unified LLM call expecting JSON. Cascades OpenRouter -> Gemini -> Fallback."""
        # 1. Try OpenRouter free tier
        raw = await self.call_openrouter(prompt, system_prompt=system_prompt, json_mode=True)
        if raw:
            parsed = self._clean_and_parse_json(raw)
            if isinstance(parsed, dict) and parsed:
                return parsed

        # 2. Try Gemini API
        gemini_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        raw_gemini = await self.call_gemini(gemini_prompt, json_mode=True)
        if raw_gemini:
            parsed = self._clean_and_parse_json(raw_gemini)
            if isinstance(parsed, dict) and parsed:
                return parsed

        # 3. Fallback
        logger.info("Using deterministic fallback for JSON LLM response")
        return fallback_default or {}

    async def call_llm_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        default_text: str = "",
    ) -> str:
        """Unified LLM call expecting plain text. Cascades OpenRouter -> Gemini -> Fallback."""
        # 1. Try OpenRouter
        raw = await self.call_openrouter(prompt, system_prompt=system_prompt, json_mode=False)
        if raw and raw.strip():
            return raw.strip()

        # 2. Try Gemini
        gemini_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        raw_gemini = await self.call_gemini(gemini_prompt, json_mode=False)
        if raw_gemini and raw_gemini.strip():
            return raw_gemini.strip()

        return default_text


ai_router = AIRouter()
