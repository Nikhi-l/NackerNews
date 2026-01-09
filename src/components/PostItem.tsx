'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Post } from '@/lib/types';
import { formatTimeAgo, extractDomain } from '@/lib/utils';

interface PostItemProps {
  post: Post;
  rank?: number;
}

export default function PostItem({ post, rank }: PostItemProps) {
  const [points, setPoints] = useState(post.points);
  const [userVote, setUserVote] = useState(post.userVote);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (value: number) => {
    if (isVoting) return;

    const newValue = userVote === value ? 0 : value;
    const prevPoints = points;
    const prevVote = userVote;

    // Optimistic update
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

      if (!res.ok) {
        throw new Error('Vote failed');
      }

      const data = await res.json();
      setPoints(data.newPoints);
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
          {points} point{points !== 1 ? 's' : ''} by{' '}
          <span className="hover:underline cursor-pointer">{post.author}</span>{' '}
          {formatTimeAgo(post.createdAt)} |{' '}
          <Link href={`/post/${post.id}`} className="hover:underline">
            {post.commentsCount} comment{post.commentsCount !== 1 ? 's' : ''}
          </Link>
        </div>
      </div>
    </article>
  );
}
