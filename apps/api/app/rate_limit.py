"""Rate limiting using Vercel KV (optional)."""

import time
from typing import Optional

import httpx
from fastapi import HTTPException, Request, status

from app.config import get_settings

settings = get_settings()


class RateLimiter:
    """Simple rate limiter using Vercel KV.

    Uses a sliding window approach with KV storage.
    Degrades gracefully if KV is not configured.
    """

    def __init__(self):
        self.enabled = settings.kv_enabled
        if self.enabled:
            self.kv_url = settings.kv_rest_api_url
            self.kv_token = settings.kv_rest_api_token

    async def _kv_get(self, key: str) -> Optional[str]:
        """Get a value from Vercel KV."""
        if not self.enabled:
            return None

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.kv_url}/get/{key}",
                    headers={"Authorization": f"Bearer {self.kv_token}"},
                    timeout=2.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("result")
        except Exception:
            pass
        return None

    async def _kv_incr_with_expiry(self, key: str, expiry_seconds: int) -> int:
        """Increment a counter with expiry in Vercel KV."""
        if not self.enabled:
            return 0

        try:
            async with httpx.AsyncClient() as client:
                # Use INCR and EXPIRE in a pipeline
                pipeline = [
                    ["INCR", key],
                    ["EXPIRE", key, str(expiry_seconds)],
                ]
                response = await client.post(
                    f"{self.kv_url}/pipeline",
                    headers={
                        "Authorization": f"Bearer {self.kv_token}",
                        "Content-Type": "application/json",
                    },
                    json=pipeline,
                    timeout=2.0,
                )
                if response.status_code == 200:
                    results = response.json()
                    if results and len(results) > 0:
                        return int(results[0].get("result", 0))
        except Exception:
            pass
        return 0

    async def check_rate_limit(
        self,
        request: Request,
        key_prefix: str,
        max_requests: int,
        window_seconds: int,
    ) -> None:
        """Check rate limit and raise HTTPException if exceeded.

        Args:
            request: FastAPI request object
            key_prefix: Prefix for the rate limit key (e.g., "signup", "login")
            max_requests: Maximum requests allowed in the window
            window_seconds: Time window in seconds
        """
        if not self.enabled:
            return

        # Get client IP
        client_ip = request.client.host if request.client else "unknown"

        # Create rate limit key
        window = int(time.time() / window_seconds)
        key = f"ratelimit:{key_prefix}:{client_ip}:{window}"

        # Increment counter
        count = await self._kv_incr_with_expiry(key, window_seconds)

        if count > max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "code": "RATE_LIMITED",
                    "message": f"Too many requests. Please try again later.",
                    "details": {"retry_after": window_seconds},
                },
            )


# Singleton instance
rate_limiter = RateLimiter()


# Rate limit configurations
RATE_LIMITS = {
    "signup": {"max_requests": 5, "window_seconds": 3600},  # 5 per hour
    "login": {"max_requests": 10, "window_seconds": 900},  # 10 per 15 minutes
    "post": {"max_requests": 10, "window_seconds": 3600},  # 10 per hour
    "comment": {"max_requests": 30, "window_seconds": 3600},  # 30 per hour
    "vote": {"max_requests": 100, "window_seconds": 3600},  # 100 per hour
}
