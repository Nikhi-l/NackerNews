"""Pytest configuration and fixtures."""

import os

# Set test environment variables before importing app modules
os.environ["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test"
os.environ["JWT_SECRET"] = "test-secret-key"
os.environ["CORS_ORIGINS"] = "*"

import pytest


@pytest.fixture
def mock_settings():
    """Provide mock settings for tests."""
    return {
        "database_url": "postgresql://test:test@localhost:5432/test",
        "jwt_secret": "test-secret-key",
        "jwt_algorithm": "HS256",
        "jwt_expiration_minutes": 60,
        "cors_origins": "*",
    }
