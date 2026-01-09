'use client';

import { useState } from 'react';
import { Comment } from '@/lib/types';
import { formatTimeAgo } from '@/lib/utils';

interface CommentItemProps {
  comment: Comment;
  postId: number;
  currentUserId?: number;
  onReplyAdded?: () => void;
  onCommentUpdated?: () => void;
  onCommentDeleted?: () => void;
  depth?: number;
}

export default function CommentItem({
  comment,
  postId,
  currentUserId,
  onReplyAdded,
  onCommentUpdated,
  onCommentDeleted,
  depth = 0,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editText, setEditText] = useState(comment.text);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isOwner = currentUserId === comment.authorId;
  const maxDepth = 8;

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, parentId: comment.id, text: replyText }),
      });

      if (!res.ok) throw new Error('Failed to post reply');

      setReplyText('');
      setIsReplying(false);
      onReplyAdded?.();
    } catch {
      alert('Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText }),
      });

      if (!res.ok) throw new Error('Failed to update comment');

      setIsEditing(false);
      onCommentUpdated?.();
    } catch {
      alert('Failed to update comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete comment');

      onCommentDeleted?.();
    } catch {
      alert('Failed to delete comment');
    }
  };

  return (
    <div className={depth > 0 ? 'border-l-2 border-gray-200 pl-4' : ''}>
      <div className="py-2">
        <div className="text-hn-text text-xs mb-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mr-1 hover:underline"
          >
            [{collapsed ? '+' : '-'}]
          </button>
          <span className="font-medium">{comment.author}</span>{' '}
          {formatTimeAgo(comment.createdAt)}
          {comment.updatedAt !== comment.createdAt && ' (edited)'}
        </div>

        {!collapsed && (
          <>
            {isEditing ? (
              <form onSubmit={handleEdit} className="mt-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                  rows={4}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-hn-orange text-white text-sm rounded hover:bg-orange-600"
                  >
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(comment.text);
                    }}
                    className="px-3 py-1 text-sm text-hn-text hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-sm text-black whitespace-pre-wrap break-words">
                {comment.text}
              </div>
            )}

            {!isEditing && (
              <div className="text-hn-text text-xs mt-1 flex gap-2">
                {currentUserId && depth < maxDepth && (
                  <button
                    onClick={() => setIsReplying(!isReplying)}
                    className="hover:underline"
                  >
                    reply
                  </button>
                )}
                {isOwner && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="hover:underline"
                    >
                      edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="hover:underline text-red-600"
                    >
                      delete
                    </button>
                  </>
                )}
              </div>
            )}

            {isReplying && (
              <form onSubmit={handleReply} className="mt-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                  rows={3}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-hn-orange text-white text-sm rounded hover:bg-orange-600"
                  >
                    {isSubmitting ? 'Posting...' : 'Reply'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReplying(false)}
                    className="px-3 py-1 text-sm text-hn-text hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-2">
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    postId={postId}
                    currentUserId={currentUserId}
                    onReplyAdded={onReplyAdded}
                    onCommentUpdated={onCommentUpdated}
                    onCommentDeleted={onCommentDeleted}
                    depth={depth + 1}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
