"""Votes routes for upvoting/downvoting posts."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Post, User, Vote
from app.rate_limit import RATE_LIMITS, rate_limiter
from app.schemas import VoteCreate, VoteResponse

router = APIRouter(prefix="/votes", tags=["votes"])


@router.post("", response_model=VoteResponse, status_code=status.HTTP_200_OK)
async def vote(
    request: Request,
    data: VoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VoteResponse:
    """Vote on a post.

    - value=1: Upvote
    - value=-1: Downvote
    - value=0: Remove vote

    If user has already voted, the vote is updated.
    """
    # Rate limiting
    await rate_limiter.check_rate_limit(
        request, "vote", **RATE_LIMITS["vote"]
    )

    # Verify post exists
    post = db.query(Post).filter(Post.id == data.post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "POST_NOT_FOUND", "message": "Post not found"},
        )

    # Check for existing vote
    existing_vote = db.query(Vote).filter(
        Vote.user_id == current_user.id,
        Vote.post_id == data.post_id,
    ).first()

    if data.value == 0:
        # Remove vote
        if existing_vote:
            # Subtract the old vote value from points
            post.points -= existing_vote.value
            db.delete(existing_vote)
    elif existing_vote:
        # Update existing vote
        if existing_vote.value != data.value:
            # Calculate point difference
            point_diff = data.value - existing_vote.value
            post.points += point_diff
            existing_vote.value = data.value
    else:
        # Create new vote
        new_vote = Vote(
            user_id=current_user.id,
            post_id=data.post_id,
            value=data.value,
        )
        db.add(new_vote)
        post.points += data.value

    db.commit()
    db.refresh(post)

    return VoteResponse(
        post_id=post.id,
        value=data.value,
        new_points=post.points,
    )
