"""Unit tests for post utilities (no database required)."""

from datetime import datetime, timezone

from app.routes.posts import calculate_best_score, decode_cursor, encode_cursor


def test_encode_decode_cursor():
    """Test cursor encoding and decoding."""
    data = {
        "created_at": "2024-01-15T12:00:00+00:00",
        "id": 42,
    }
    encoded = encode_cursor(data)

    # Should be a non-empty string
    assert isinstance(encoded, str)
    assert len(encoded) > 0

    # Decode should return original data
    decoded = decode_cursor(encoded)
    assert decoded == data


def test_decode_invalid_cursor():
    """Test decoding invalid cursor returns None."""
    result = decode_cursor("not-valid-base64!!!")
    assert result is None


def test_calculate_best_score_new_post():
    """Test best score for a new post."""
    now = datetime.now(timezone.utc)
    score = calculate_best_score(10, now)

    # Score should be positive
    assert score > 0

    # Score = 10 / (0 + 2)^1.5 = 10 / 2.83 ≈ 3.54
    assert 3 < score < 4


def test_calculate_best_score_decay():
    """Test that score decays over time."""
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(hours=1)
    one_day_ago = now - timedelta(days=1)

    score_now = calculate_best_score(10, now)
    score_1h = calculate_best_score(10, one_hour_ago)
    score_1d = calculate_best_score(10, one_day_ago)

    # Newer posts should have higher scores
    assert score_now > score_1h > score_1d


def test_calculate_best_score_points_matter():
    """Test that more points mean higher score."""
    now = datetime.now(timezone.utc)

    score_10 = calculate_best_score(10, now)
    score_100 = calculate_best_score(100, now)

    assert score_100 > score_10
