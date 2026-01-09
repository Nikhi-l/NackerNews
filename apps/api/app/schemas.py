"""Pydantic schemas for request/response validation."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# =============================================================================
# Error Response
# =============================================================================


class ErrorDetail(BaseModel):
    """Structured error detail."""

    code: str
    message: str
    details: Optional[Any] = None


class ErrorResponse(BaseModel):
    """Standard error response format."""

    error: ErrorDetail


# =============================================================================
# Auth Schemas
# =============================================================================


class UserSignup(BaseModel):
    """User registration request."""

    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    """User login request."""

    username: str
    password: str


class Token(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """User data response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    created_at: datetime


class AuthUser(BaseModel):
    """Authenticated user response."""

    user: UserResponse


# =============================================================================
# Post Schemas
# =============================================================================


class PostCreate(BaseModel):
    """Create post request."""

    title: str = Field(..., min_length=1, max_length=300)
    url: Optional[str] = Field(None, max_length=2048)
    text: Optional[str] = Field(None, max_length=40000)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            v = v.strip()
            if not v.startswith(("http://", "https://")):
                raise ValueError("URL must start with http:// or https://")
        return v if v else None

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else None

    def model_post_init(self, __context: Any) -> None:
        """Validate that at least url or text is provided."""
        if not self.url and not self.text:
            raise ValueError("Post must include either url or text")


class PostResponse(BaseModel):
    """Post response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    url: Optional[str]
    text: Optional[str]
    author_id: int
    author_username: str
    points: int
    comments_count: int
    created_at: datetime
    user_vote: Optional[int] = None  # Current user's vote if authenticated


class PostDetail(PostResponse):
    """Detailed post response with full text."""

    pass


class PostListResponse(BaseModel):
    """Paginated list of posts."""

    posts: list[PostResponse]
    next_cursor: Optional[str] = None
    has_more: bool = False


# =============================================================================
# Comment Schemas
# =============================================================================


class CommentCreate(BaseModel):
    """Create comment request."""

    post_id: int
    parent_id: Optional[int] = None
    text: str = Field(..., min_length=1, max_length=10000)


class CommentUpdate(BaseModel):
    """Update comment request."""

    text: str = Field(..., min_length=1, max_length=10000)


class CommentResponse(BaseModel):
    """Comment response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    parent_id: Optional[int]
    author_id: int
    author_username: str
    text: str
    created_at: datetime
    updated_at: datetime
    replies: list["CommentResponse"] = []


class CommentListResponse(BaseModel):
    """List of comments for a post."""

    comments: list[CommentResponse]


# =============================================================================
# Vote Schemas
# =============================================================================


class VoteCreate(BaseModel):
    """Create/update vote request."""

    post_id: int
    value: int = Field(..., ge=-1, le=1)

    @field_validator("value")
    @classmethod
    def validate_value(cls, v: int) -> int:
        if v not in (-1, 0, 1):
            raise ValueError("Vote value must be -1, 0, or 1")
        return v


class VoteResponse(BaseModel):
    """Vote response."""

    post_id: int
    value: int
    new_points: int


# =============================================================================
# Pagination
# =============================================================================


class CursorInfo(BaseModel):
    """Cursor for keyset pagination.

    Cursor format for different sorts:
    - new: base64({"created_at": "iso-timestamp", "id": 123})
    - top: base64({"points": 50, "created_at": "iso-timestamp", "id": 123})
    - best: base64({"score": 1.234, "id": 123})
    """

    pass
