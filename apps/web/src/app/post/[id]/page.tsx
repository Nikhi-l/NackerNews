"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Post, Comment, api, ApiError, getToken } from "@/lib/api";
import { formatTimeAgo, extractDomain } from "@/lib/hooks";
import CommentItem from "@/components/CommentItem";

export default function PostPage() {
  const params = useParams();
  const postId = parseInt(params.id as string);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [points, setPoints] = useState(0);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [postData, commentsData] = await Promise.all([
        api.getPost(postId),
        api.getComments(postId),
      ]);
      setPost(postData);
      setPoints(postData.points);
      setUserVote(postData.user_vote);
      setComments(commentsData.comments);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.error?.message || "Failed to load post");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVote = async (value: number) => {
    if (!getToken()) {
      window.location.href = "/login";
      return;
    }

    if (isVoting || !post) return;

    const newValue = userVote === value ? 0 : value;
    const prevPoints = points;
    const prevVote = userVote;

    let pointsDelta = newValue;
    if (prevVote !== null) {
      pointsDelta -= prevVote;
    }

    setPoints(points + pointsDelta);
    setUserVote(newValue === 0 ? null : newValue);
    setIsVoting(true);

    try {
      const result = await api.vote(post.id, newValue);
      setPoints(result.new_points);
      setUserVote(newValue === 0 ? null : newValue);
    } catch {
      setPoints(prevPoints);
      setUserVote(prevVote);
    } finally {
      setIsVoting(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const comment = await api.createComment(postId, newComment.trim());
      setComments((prev) => [...prev, { ...comment, replies: [] }]);
      setNewComment("");
      if (post) {
        setPost({ ...post, comments_count: post.comments_count + 1 });
      }
    } catch {
      alert("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyAdded = (comment: Comment) => {
    // Refresh comments to get proper tree structure
    fetchData();
  };

  const handleCommentUpdated = (updated: Comment) => {
    const updateInTree = (comments: Comment[]): Comment[] => {
      return comments.map((c) => {
        if (c.id === updated.id) {
          return { ...updated, replies: c.replies };
        }
        return { ...c, replies: updateInTree(c.replies) };
      });
    };
    setComments(updateInTree(comments));
  };

  const handleCommentDeleted = (commentId: number) => {
    const removeFromTree = (comments: Comment[]): Comment[] => {
      return comments
        .filter((c) => c.id !== commentId)
        .map((c) => ({ ...c, replies: removeFromTree(c.replies) }));
    };
    setComments(removeFromTree(comments));
    if (post) {
      setPost({ ...post, comments_count: Math.max(0, post.comments_count - 1) });
    }
  };

  if (loading) {
    return (
      <div className="text-hn-text text-center py-8">Loading...</div>
    );
  }

  if (error || !post) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error || "Post not found"}</p>
        <Link href="/" className="text-hn-orange hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Post Header */}
      <article className="mb-6">
        <div className="flex gap-2">
          <div className="flex flex-col items-center gap-0 flex-shrink-0 w-4">
            <button
              onClick={() => handleVote(1)}
              className={`text-xs leading-none ${
                userVote === 1 ? "text-hn-orange" : "text-hn-text hover:text-hn-orange"
              }`}
              disabled={isVoting}
              aria-label="Upvote"
            >
              ▲
            </button>
            <button
              onClick={() => handleVote(-1)}
              className={`text-xs leading-none ${
                userVote === -1 ? "text-blue-500" : "text-hn-text hover:text-blue-500"
              }`}
              disabled={isVoting}
              aria-label="Downvote"
            >
              ▼
            </button>
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-medium mb-1">
              {post.url ? (
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {post.title}
                </a>
              ) : (
                post.title
              )}
              {post.url && (
                <span className="text-hn-text text-sm font-normal ml-2">
                  ({extractDomain(post.url)})
                </span>
              )}
            </h1>

            <div className="text-hn-text text-sm">
              {points} point{points !== 1 ? "s" : ""} by{" "}
              <span className="hover:underline cursor-pointer">
                {post.author_username}
              </span>{" "}
              {formatTimeAgo(post.created_at)}
            </div>
          </div>
        </div>

        {post.text && (
          <div className="mt-4 text-black whitespace-pre-wrap pl-6">
            {post.text}
          </div>
        )}
      </article>

      {/* Add Comment Form */}
      {getToken() && (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={4}
            className="w-full border border-gray-300 rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-hn-orange focus:border-transparent"
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="mt-2 px-4 py-2 bg-hn-orange text-white rounded hover:bg-orange-600 disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Add Comment"}
          </button>
        </form>
      )}

      {!getToken() && (
        <p className="mb-6 text-hn-text text-sm">
          <Link href="/login" className="text-hn-orange hover:underline">
            Login
          </Link>{" "}
          to add a comment.
        </p>
      )}

      {/* Comments */}
      <div className="border-t border-gray-200 pt-4">
        <h2 className="text-lg font-medium mb-4">
          {post.comments_count} Comment{post.comments_count !== 1 ? "s" : ""}
        </h2>

        {comments.length === 0 ? (
          <p className="text-hn-text text-sm">No comments yet. Be the first!</p>
        ) : (
          <div className="space-y-0">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                onReplyAdded={handleReplyAdded}
                onCommentUpdated={handleCommentUpdated}
                onCommentDeleted={handleCommentDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
