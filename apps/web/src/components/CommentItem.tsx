"use client";

import { useState } from "react";
import { Comment, api, getToken } from "@/lib/api";
import { formatTimeAgo, useAuth } from "@/lib/hooks";

interface CommentItemProps {
  comment: Comment;
  postId: number;
  onReplyAdded?: (comment: Comment) => void;
  onCommentUpdated?: (comment: Comment) => void;
  onCommentDeleted?: (commentId: number) => void;
  depth?: number;
}

export default function CommentItem({
  comment,
  postId,
  onReplyAdded,
  onCommentUpdated,
  onCommentDeleted,
  depth = 0,
}: CommentItemProps) {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editText, setEditText] = useState(comment.text);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isOwner = user?.id === comment.author_id;
  const maxDepth = 8;

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newComment = await api.createComment(postId, replyText, comment.id);
      setReplyText("");
      setIsReplying(false);
      onReplyAdded?.(newComment);
    } catch {
      alert("Failed to post reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const updated = await api.updateComment(comment.id, editText);
      setIsEditing(false);
      onCommentUpdated?.(updated);
    } catch {
      alert("Failed to update comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      await api.deleteComment(comment.id);
      onCommentDeleted?.(comment.id);
    } catch {
      alert("Failed to delete comment");
    }
  };

  return (
    <div
      className={`${depth > 0 ? "border-l-2 border-gray-200 pl-4" : ""}`}
      style={{ marginLeft: depth > 0 ? "0" : "0" }}
    >
      <div className="py-2">
        <div className="text-hn-text text-xs mb-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mr-1 hover:underline"
          >
            [{collapsed ? "+" : "-"}]
          </button>
          <span className="font-medium">{comment.author_username}</span>{" "}
          {formatTimeAgo(comment.created_at)}
          {comment.updated_at !== comment.created_at && " (edited)"}
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
                    {isSubmitting ? "Saving..." : "Save"}
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
                {getToken() && depth < maxDepth && (
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
                    {isSubmitting ? "Posting..." : "Reply"}
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

            {/* Render nested replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-2">
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    postId={postId}
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
