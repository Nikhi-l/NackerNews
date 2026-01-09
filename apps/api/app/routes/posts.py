"""Posts routes with feed, creation, and detail."""

import base64
import json
import math
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_optional_user
from app.database import get_db
from app.models import Post, User, Vote
from app.rate_limit import RATE_LIMITS, rate_limiter
from app.schemas import PostCreate, PostDetail, PostListResponse, PostResponse

router = APIRouter(prefix="/posts", tags=["posts"])


def encode_cursor(data: dict) -> str:
    """Encode cursor data to base64 string."""
    json_str = json.dumps(data, default=str)
    return base64.urlsafe_b64encode(json_str.encode()).decode()


def decode_cursor(cursor: str) -> Optional[dict]:
    """Decode cursor from base64 string."""
    try:
        json_str = base64.urlsafe_b64decode(cursor.encode()).decode()
        return json.loads(json_str)
    except Exception:
        return None


def calculate_best_score(points: int, created_at: datetime) -> float:
    """Calculate 'best' ranking score.

    Formula: points / pow(hours_since + 2, 1.5)

    This formula:
    - Favors posts with more points
    - Decays over time (gravity of 1.5)
    - The +2 prevents division issues for new posts
    """
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    hours_since = (now - created_at).total_seconds() / 3600
    return points / math.pow(hours_since + 2, 1.5)


def post_to_response(post: Post, user_vote: Optional[int] = None) -> PostResponse:
    """Convert Post model to response schema."""
    return PostResponse(
        id=post.id,
        title=post.title,
        url=post.url,
        text=post.text[:500] if post.text else None,  # Truncate for list view
        author_id=post.author_id,
        author_username=post.author.username,
        points=post.points,
        comments_count=post.comments_count,
        created_at=post.created_at,
        user_vote=user_vote,
    )


@router.get("", response_model=PostListResponse)
async def list_posts(
    response: Response,
    sort: str = Query("new", pattern="^(new|top|best)$"),
    limit: int = Query(30, ge=1, le=100),
    cursor: Optional[str] = Query(None),
    q: Optional[str] = Query(None, max_length=200),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
) -> PostListResponse:
    """List posts with sorting, pagination, and search.

    Sort options:
    - new: Newest first (created_at desc)
    - top: Most points first (points desc, created_at desc)
    - best: Ranking algorithm (points / pow(hours+2, 1.5))

    Cursor pagination format (base64 encoded JSON):
    - new: {"created_at": "2024-01-01T12:00:00Z", "id": 123}
    - top: {"points": 50, "created_at": "2024-01-01T12:00:00Z", "id": 123}
    - best: {"score": 1.234, "id": 123}
    """
    # Set cache header for CDN
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=30"

    query = db.query(Post)

    # Search filter
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                Post.title.ilike(search_term),
                Post.text.ilike(search_term),
            )
        )

    # Decode cursor if provided
    cursor_data = decode_cursor(cursor) if cursor else None

    # Apply sorting and cursor pagination
    if sort == "new":
        # Sort by created_at desc, id desc (for tie-breaking)
        if cursor_data:
            cursor_time = datetime.fromisoformat(cursor_data["created_at"].replace("Z", "+00:00"))
            cursor_id = cursor_data["id"]
            query = query.filter(
                (Post.created_at < cursor_time) |
                ((Post.created_at == cursor_time) & (Post.id < cursor_id))
            )
        query = query.order_by(desc(Post.created_at), desc(Post.id))

    elif sort == "top":
        # Sort by points desc, created_at desc, id desc
        if cursor_data:
            cursor_points = cursor_data["points"]
            cursor_time = datetime.fromisoformat(cursor_data["created_at"].replace("Z", "+00:00"))
            cursor_id = cursor_data["id"]
            query = query.filter(
                (Post.points < cursor_points) |
                ((Post.points == cursor_points) & (Post.created_at < cursor_time)) |
                ((Post.points == cursor_points) & (Post.created_at == cursor_time) & (Post.id < cursor_id))
            )
        query = query.order_by(desc(Post.points), desc(Post.created_at), desc(Post.id))

    elif sort == "best":
        # For best, we need to calculate score for all posts
        # This is less efficient but necessary for the ranking algorithm
        all_posts = query.all()

        # Calculate scores
        scored_posts = [
            (post, calculate_best_score(post.points, post.created_at))
            for post in all_posts
        ]
        scored_posts.sort(key=lambda x: (-x[1], -x[0].id))

        # Apply cursor
        if cursor_data:
            cursor_score = cursor_data["score"]
            cursor_id = cursor_data["id"]
            filtered = []
            past_cursor = False
            for post, score in scored_posts:
                if past_cursor:
                    filtered.append((post, score))
                elif score < cursor_score or (score == cursor_score and post.id < cursor_id):
                    past_cursor = True
                    filtered.append((post, score))
            scored_posts = filtered

        # Paginate
        paginated = scored_posts[: limit + 1]
        has_more = len(paginated) > limit
        paginated = paginated[:limit]

        # Get user votes if authenticated
        user_votes = {}
        if current_user:
            post_ids = [p.id for p, _ in paginated]
            votes = db.query(Vote).filter(
                Vote.user_id == current_user.id,
                Vote.post_id.in_(post_ids),
            ).all()
            user_votes = {v.post_id: v.value for v in votes}

        # Build response
        posts = [
            post_to_response(post, user_votes.get(post.id))
            for post, _ in paginated
        ]

        next_cursor = None
        if has_more and paginated:
            last_post, last_score = paginated[-1]
            next_cursor = encode_cursor({"score": last_score, "id": last_post.id})

        return PostListResponse(posts=posts, next_cursor=next_cursor, has_more=has_more)

    # Fetch posts (for new and top sorts)
    posts = query.limit(limit + 1).all()
    has_more = len(posts) > limit
    posts = posts[:limit]

    # Get user votes if authenticated
    user_votes = {}
    if current_user:
        post_ids = [p.id for p in posts]
        votes = db.query(Vote).filter(
            Vote.user_id == current_user.id,
            Vote.post_id.in_(post_ids),
        ).all()
        user_votes = {v.post_id: v.value for v in votes}

    # Build response
    post_responses = [
        post_to_response(post, user_votes.get(post.id))
        for post in posts
    ]

    # Build next cursor
    next_cursor = None
    if has_more and posts:
        last_post = posts[-1]
        if sort == "new":
            next_cursor = encode_cursor({
                "created_at": last_post.created_at.isoformat(),
                "id": last_post.id,
            })
        elif sort == "top":
            next_cursor = encode_cursor({
                "points": last_post.points,
                "created_at": last_post.created_at.isoformat(),
                "id": last_post.id,
            })

    return PostListResponse(posts=post_responses, next_cursor=next_cursor, has_more=has_more)


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    request: Request,
    data: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PostResponse:
    """Create a new post."""
    # Rate limiting
    await rate_limiter.check_rate_limit(
        request, "post", **RATE_LIMITS["post"]
    )

    post = Post(
        title=data.title,
        url=data.url,
        text=data.text,
        author_id=current_user.id,
        points=1,  # Start with 1 point (author's implicit upvote)
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    return PostResponse(
        id=post.id,
        title=post.title,
        url=post.url,
        text=post.text,
        author_id=post.author_id,
        author_username=current_user.username,
        points=post.points,
        comments_count=post.comments_count,
        created_at=post.created_at,
        user_vote=1,  # Author's implicit upvote
    )


@router.get("/{post_id}", response_model=PostDetail)
async def get_post(
    post_id: int,
    response: Response,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
) -> PostDetail:
    """Get a single post by ID."""
    response.headers["Cache-Control"] = "public, max-age=30, stale-while-revalidate=15"

    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "POST_NOT_FOUND", "message": "Post not found"},
        )

    # Get user vote if authenticated
    user_vote = None
    if current_user:
        vote = db.query(Vote).filter(
            Vote.user_id == current_user.id,
            Vote.post_id == post_id,
        ).first()
        if vote:
            user_vote = vote.value

    return PostDetail(
        id=post.id,
        title=post.title,
        url=post.url,
        text=post.text,  # Full text for detail view
        author_id=post.author_id,
        author_username=post.author.username,
        points=post.points,
        comments_count=post.comments_count,
        created_at=post.created_at,
        user_vote=user_vote,
    )
