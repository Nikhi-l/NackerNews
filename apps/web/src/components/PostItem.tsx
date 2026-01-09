"use client";

import Link from "next/link";
import { useState } from "react";
import { Post, api, getToken } from "@/lib/api";
import { formatTimeAgo, extractDomain } from "@/lib/hooks";

interface PostItemProps {
  post: Post;
  rank?: number;
}

export default function PostItem({ post, rank }: PostItemProps) {
  const [points, setPoints] = useState(post.points);
  const [userVote, setUserVote] = useState(post.user_vote);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (value: number) => {
    if (!getToken()) {
      window.location.href = "/login";
      return;
    }

    if (isVoting) return;

    // Calculate new vote value
    const newValue = userVote === value ? 0 : value;

    // Optimistic update
    const prevPoints = points;
    const prevVote = userVote;

    // Calculate points change
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
      // Rollback on failure
      setPoints(prevPoints);
      setUserVote(prevVote);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <article className="flex gap-2 py-1">
      {rank && (
        <span className="text-hn-text text-sm w-8 text-right flex-shrink-0">
          {rank}.
        </span>
      )}

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

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          {post.url ? (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-black hover:underline break-words"
            >
              {post.title}
            </a>
          ) : (
            <Link
              href={`/post/${post.id}`}
              className="text-black hover:underline break-words"
            >
              {post.title}
            </Link>
          )}
          {post.url && (
            <span className="text-hn-text text-xs">
              ({extractDomain(post.url)})
            </span>
          )}
          {post.text && !post.url && (
            <span className="text-hn-text text-xs">(text)</span>
          )}
        </div>
        <div className="text-hn-text text-xs mt-0.5">
          {points} point{points !== 1 ? "s" : ""} by{" "}
          <span className="hover:underline cursor-pointer">
            {post.author_username}
          </span>{" "}
          {formatTimeAgo(post.created_at)} |{" "}
          <Link href={`/post/${post.id}`} className="hover:underline">
            {post.comments_count} comment{post.comments_count !== 1 ? "s" : ""}
          </Link>
        </div>
      </div>
    </article>
  );
}
