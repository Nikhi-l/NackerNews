"""Comments routes for threaded discussions."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_optional_user
from app.database import get_db
from app.models import Comment, Post, User
from app.rate_limit import RATE_LIMITS, rate_limiter
from app.schemas import (
    CommentCreate,
    CommentListResponse,
    CommentResponse,
    CommentUpdate,
)

router = APIRouter(tags=["comments"])


def comment_to_response(comment: Comment, include_replies: bool = False) -> CommentResponse:
    """Convert Comment model to response schema."""
    replies = []
    if include_replies:
        replies = [
            comment_to_response(reply, include_replies=True)
            for reply in sorted(comment.replies, key=lambda c: c.created_at)
        ]

    return CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        parent_id=comment.parent_id,
        author_id=comment.author_id,
        author_username=comment.author.username,
        text=comment.text,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        replies=replies,
    )


def build_comment_tree(comments: list[Comment]) -> list[CommentResponse]:
    """Build a tree structure from flat list of comments."""
    # Create a map of comment id to comment
    comment_map: dict[int, Comment] = {c.id: c for c in comments}

    # Separate root comments and replies
    root_comments: list[Comment] = []

    for comment in comments:
        if comment.parent_id is None:
            root_comments.append(comment)

    # Sort root comments by created_at
    root_comments.sort(key=lambda c: c.created_at)

    # Build tree recursively
    return [comment_to_response(c, include_replies=True) for c in root_comments]


@router.get("/posts/{post_id}/comments", response_model=CommentListResponse)
async def list_comments(
    post_id: int,
    response: Response,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
) -> CommentListResponse:
    """Get all comments for a post as a threaded tree."""
    response.headers["Cache-Control"] = "public, max-age=30, stale-while-revalidate=15"

    # Verify post exists
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "POST_NOT_FOUND", "message": "Post not found"},
        )

    # Get all comments for the post
    comments = (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at)
        .all()
    )

    # Build threaded tree
    comment_tree = build_comment_tree(comments)

    return CommentListResponse(comments=comment_tree)


@router.post("/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    request: Request,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CommentResponse:
    """Create a new comment on a post."""
    # Rate limiting
    await rate_limiter.check_rate_limit(
        request, "comment", **RATE_LIMITS["comment"]
    )

    # Verify post exists
    post = db.query(Post).filter(Post.id == data.post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "POST_NOT_FOUND", "message": "Post not found"},
        )

    # Verify parent comment exists if provided
    if data.parent_id:
        parent = db.query(Comment).filter(
            Comment.id == data.parent_id,
            Comment.post_id == data.post_id,
        ).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "PARENT_NOT_FOUND", "message": "Parent comment not found"},
            )

    # Create comment
    comment = Comment(
        post_id=data.post_id,
        parent_id=data.parent_id,
        author_id=current_user.id,
        text=data.text,
    )
    db.add(comment)

    # Update post comment count
    post.comments_count += 1

    db.commit()
    db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        parent_id=comment.parent_id,
        author_id=comment.author_id,
        author_username=current_user.username,
        text=comment.text,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        replies=[],
    )


@router.patch("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: int,
    data: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CommentResponse:
    """Update a comment (author only)."""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "COMMENT_NOT_FOUND", "message": "Comment not found"},
        )

    # Check ownership
    if comment.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "You can only edit your own comments"},
        )

    # Update comment
    comment.text = data.text
    db.commit()
    db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        parent_id=comment.parent_id,
        author_id=comment.author_id,
        author_username=current_user.username,
        text=comment.text,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        replies=[],
    )


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a comment (author only)."""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "COMMENT_NOT_FOUND", "message": "Comment not found"},
        )

    # Check ownership
    if comment.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "You can only delete your own comments"},
        )

    # Get post to update comment count
    post = db.query(Post).filter(Post.id == comment.post_id).first()

    # Count this comment and all its nested replies
    def count_replies(c: Comment) -> int:
        total = 1
        for reply in c.replies:
            total += count_replies(reply)
        return total

    comment_count_decrease = count_replies(comment)

    # Delete comment (cascade will delete replies)
    db.delete(comment)

    # Update post comment count
    if post:
        post.comments_count = max(0, post.comments_count - comment_count_decrease)

    db.commit()
