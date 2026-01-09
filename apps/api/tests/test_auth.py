"""Unit tests for auth utilities (no database required)."""

from app.auth import create_access_token, decode_token, hash_password, verify_password


def test_password_hashing():
    """Test password hashing and verification."""
    password = "securepassword123"
    hashed = hash_password(password)

    # Hash should be different from plain password
    assert hashed != password

    # Verification should work
    assert verify_password(password, hashed) is True

    # Wrong password should fail
    assert verify_password("wrongpassword", hashed) is False


def test_password_different_hashes():
    """Test that same password produces different hashes (salted)."""
    password = "securepassword123"
    hash1 = hash_password(password)
    hash2 = hash_password(password)

    # Hashes should be different due to salting
    assert hash1 != hash2

    # But both should verify correctly
    assert verify_password(password, hash1) is True
    assert verify_password(password, hash2) is True


def test_create_and_decode_token():
    """Test JWT token creation and decoding."""
    user_id = 42
    token = create_access_token(user_id)

    # Token should be a non-empty string
    assert isinstance(token, str)
    assert len(token) > 0

    # Decode should return the same user_id
    decoded_user_id = decode_token(token)
    assert decoded_user_id == user_id


def test_decode_invalid_token():
    """Test decoding an invalid token returns None."""
    invalid_token = "invalid.token.here"
    result = decode_token(invalid_token)
    assert result is None


def test_decode_empty_token():
    """Test decoding an empty token returns None."""
    result = decode_token("")
    assert result is None
