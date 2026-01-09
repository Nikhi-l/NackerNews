"""SQLAlchemy database models."""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    """User model for authentication and ownership."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    posts: Mapped[list["Post"]] = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    votes: Mapped[list["Vote"]] = relationship("Vote", back_populates="user", cascade="all, delete-orphan")


class Post(Base):
    """Post model for news submissions."""

    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    author_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comments_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    author: Mapped["User"] = relationship("User", back_populates="posts")
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    votes: Mapped[list["Vote"]] = relationship("Vote", back_populates="post", cascade="all, delete-orphan")

    # Indexes for efficient sorting
    __table_args__ = (
        Index("ix_posts_created_at_desc", created_at.desc()),
        Index("ix_posts_points_created_at", points.desc(), created_at.desc()),
    )


class Comment(Base):
    """Comment model for threaded discussions."""

    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    parent_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    author_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    post: Mapped["Post"] = relationship("Post", back_populates="comments")
    author: Mapped["User"] = relationship("User", back_populates="comments")
    parent: Mapped[Optional["Comment"]] = relationship("Comment", back_populates="replies", remote_side=[id])
    replies: Mapped[list["Comment"]] = relationship("Comment", back_populates="parent", cascade="all, delete-orphan")

    # Index for efficient comment retrieval
    __table_args__ = (
        Index("ix_comments_post_parent_created", post_id, parent_id, created_at),
    )


class Vote(Base):
    """Vote model for upvoting/downvoting posts."""

    __tablename__ = "votes"

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    value: Mapped[int] = mapped_column(Integer, nullable=False)  # +1 or -1
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="votes")
    post: Mapped["Post"] = relationship("Post", back_populates="votes")

    # Unique constraint (already enforced by composite primary key)
    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_votes_user_post"),
    )
