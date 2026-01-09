"""Authentication routes."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models import User
from app.rate_limit import RATE_LIMITS, rate_limiter
from app.schemas import AuthUser, Token, UserLogin, UserResponse, UserSignup

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(
    request: Request,
    data: UserSignup,
    db: Session = Depends(get_db),
) -> Token:
    """Register a new user."""
    # Rate limiting
    await rate_limiter.check_rate_limit(
        request, "signup", **RATE_LIMITS["signup"]
    )

    # Check if username exists
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "USERNAME_EXISTS", "message": "Username already taken"},
        )

    # Check if email exists
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "EMAIL_EXISTS", "message": "Email already registered"},
        )

    # Create user
    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate token
    token = create_access_token(user.id)
    return Token(access_token=token)


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    data: UserLogin,
    db: Session = Depends(get_db),
) -> Token:
    """Login and get an access token."""
    # Rate limiting
    await rate_limiter.check_rate_limit(
        request, "login", **RATE_LIMITS["login"]
    )

    # Find user by username
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid username or password"},
        )

    # Generate token
    token = create_access_token(user.id)
    return Token(access_token=token)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(user: User = Depends(get_current_user)) -> dict:
    """Logout the current user.

    Note: This is a stateless JWT implementation, so logout is a no-op on the server.
    The client should discard the token. For true logout, implement token blacklisting
    using Vercel KV or similar.
    """
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=AuthUser)
async def get_me(user: User = Depends(get_current_user)) -> AuthUser:
    """Get the current authenticated user."""
    return AuthUser(
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            created_at=user.created_at,
        )
    )
