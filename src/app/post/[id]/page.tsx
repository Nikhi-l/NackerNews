'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Post, Comment } from '@/lib/types';
import { formatTimeAgo, extractDomain } from '@/lib/utils';
import CommentItem from '@/components/CommentItem';

export default function PostPage() {
  const params = useParams();
  const postId = parseInt(params.id as string);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>();

  const [points, setPoints] = useState(0);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [postRes, commentsRes, meRes] = await Promise.all([
        fetch(`/api/posts/${postId}`),
        fetch(`/api/posts/${postId}/comments`),
        fetch('/api/auth/me'),
      ]);

      if (!postRes.ok) throw new Error('Post not found');

      const postData = await postRes.json();
      const commentsData = await commentsRes.json();

      setPost(postData);
      setPoints(postData.points);
      setUserVote(postData.userVote);
      setComments(commentsData.comments || []);

      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUserId(meData.user?.id);
      }
    } catch {
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVote = async (value: number) => {
    if (isVoting || !post) return;

    const newValue = userVote === value ? 0 : value;
    const prevPoints = points;
    const prevVote = userVote;

    let pointsDelta = newValue;
    if (prevVote) pointsDelta -= prevVote;

    setPoints(points + pointsDelta);
    setUserVote(newValue === 0 ? null : newValue);
    setIsVoting(true);

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, value: newValue }),
      });

      if (!res.ok) throw new Error('Vote failed');

      const data = await res.json();
      setPoints(data.newPoints);
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
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, text: newComment.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) {
          alert('Please login to comment');
        } else {
          throw new Error(data.error?.message || 'Failed to post comment');
        }
        return;
      }

      setNewComment('');
      fetchData();
    } catch {
      alert('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-hn-text text-center py-8">Loading...</div>;
  }

  if (error || !post) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error || 'Post not found'}</p>
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
                userVote === 1 ? 'text-hn-orange' : 'text-hn-text hover:text-hn-orange'
              }`}
              disabled={isVoting}
              aria-label="Upvote"
            >
              ▲
            </button>
            <button
              onClick={() => handleVote(-1)}
              className={`text-xs leading-none ${
                userVote === -1 ? 'text-blue-500' : 'text-hn-text hover:text-blue-500'
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
              {points} point{points !== 1 ? 's' : ''} by{' '}
              <span className="hover:underline cursor-pointer">{post.author}</span>{' '}
              {formatTimeAgo(post.createdAt)}
            </div>
          </div>
        </div>

        {post.text && (
          <div className="mt-4 text-black whitespace-pre-wrap pl-6">{post.text}</div>
        )}
      </article>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={currentUserId ? 'Add a comment...' : 'Login to comment...'}
          disabled={!currentUserId}
          rows={4}
          className="w-full border border-gray-300 rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-hn-orange focus:border-transparent disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim() || !currentUserId}
          className="mt-2 px-4 py-2 bg-hn-orange text-white rounded hover:bg-orange-600 disabled:opacity-50"
        >
          {submitting ? 'Posting...' : 'Add Comment'}
        </button>
      </form>

      {/* Comments */}
      <div className="border-t border-gray-200 pt-4">
        <h2 className="text-lg font-medium mb-4">
          {post.commentsCount} Comment{post.commentsCount !== 1 ? 's' : ''}
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
                currentUserId={currentUserId}
                onReplyAdded={fetchData}
                onCommentUpdated={fetchData}
                onCommentDeleted={fetchData}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
