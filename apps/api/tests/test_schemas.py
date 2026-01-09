"""Unit tests for Pydantic schemas (no database required)."""

import pytest
from pydantic import ValidationError

from app.schemas import (
    CommentCreate,
    CommentUpdate,
    PostCreate,
    UserLogin,
    UserSignup,
    VoteCreate,
)


class TestUserSignup:
    """Tests for UserSignup schema."""

    def test_valid_signup(self):
        """Test valid signup data."""
        data = UserSignup(
            username="testuser",
            email="test@example.com",
            password="password123",
        )
        assert data.username == "testuser"
        assert data.email == "test@example.com"

    def test_username_too_short(self):
        """Test username minimum length."""
        with pytest.raises(ValidationError):
            UserSignup(
                username="ab",
                email="test@example.com",
                password="password123",
            )

    def test_username_invalid_chars(self):
        """Test username pattern validation."""
        with pytest.raises(ValidationError):
            UserSignup(
                username="test user",  # spaces not allowed
                email="test@example.com",
                password="password123",
            )

    def test_invalid_email(self):
        """Test email validation."""
        with pytest.raises(ValidationError):
            UserSignup(
                username="testuser",
                email="not-an-email",
                password="password123",
            )

    def test_password_too_short(self):
        """Test password minimum length."""
        with pytest.raises(ValidationError):
            UserSignup(
                username="testuser",
                email="test@example.com",
                password="short",
            )


class TestPostCreate:
    """Tests for PostCreate schema."""

    def test_post_with_url(self):
        """Test creating post with URL."""
        data = PostCreate(
            title="Test Post",
            url="https://example.com",
        )
        assert data.title == "Test Post"
        assert data.url == "https://example.com"
        assert data.text is None

    def test_post_with_text(self):
        """Test creating post with text."""
        data = PostCreate(
            title="Test Post",
            text="This is the post content.",
        )
        assert data.title == "Test Post"
        assert data.text == "This is the post content."
        assert data.url is None

    def test_post_with_both(self):
        """Test creating post with both URL and text."""
        data = PostCreate(
            title="Test Post",
            url="https://example.com",
            text="Additional context.",
        )
        assert data.url == "https://example.com"
        assert data.text == "Additional context."

    def test_post_without_url_or_text(self):
        """Test that post requires at least URL or text."""
        with pytest.raises(ValidationError):
            PostCreate(title="Test Post")

    def test_url_validation(self):
        """Test URL must start with http(s)."""
        with pytest.raises(ValidationError):
            PostCreate(
                title="Test Post",
                url="ftp://example.com",
            )


class TestVoteCreate:
    """Tests for VoteCreate schema."""

    def test_valid_upvote(self):
        """Test valid upvote."""
        data = VoteCreate(post_id=1, value=1)
        assert data.value == 1

    def test_valid_downvote(self):
        """Test valid downvote."""
        data = VoteCreate(post_id=1, value=-1)
        assert data.value == -1

    def test_valid_remove_vote(self):
        """Test valid vote removal."""
        data = VoteCreate(post_id=1, value=0)
        assert data.value == 0

    def test_invalid_vote_value(self):
        """Test invalid vote value."""
        with pytest.raises(ValidationError):
            VoteCreate(post_id=1, value=2)


class TestCommentSchemas:
    """Tests for comment schemas."""

    def test_valid_comment_create(self):
        """Test valid comment creation."""
        data = CommentCreate(
            post_id=1,
            text="This is a comment.",
        )
        assert data.post_id == 1
        assert data.text == "This is a comment."
        assert data.parent_id is None

    def test_comment_with_parent(self):
        """Test comment with parent (reply)."""
        data = CommentCreate(
            post_id=1,
            parent_id=5,
            text="This is a reply.",
        )
        assert data.parent_id == 5

    def test_comment_empty_text(self):
        """Test that comment text cannot be empty."""
        with pytest.raises(ValidationError):
            CommentCreate(post_id=1, text="")

    def test_comment_update(self):
        """Test comment update schema."""
        data = CommentUpdate(text="Updated comment.")
        assert data.text == "Updated comment."
