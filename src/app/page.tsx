'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, Suspense } from 'react';
import { Post, PostsResponse } from '@/lib/types';
import PostItem from '@/components/PostItem';
import SearchBox from '@/components/SearchBox';

function FeedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = parseInt(searchParams.get('page') || '1');
  const sort = searchParams.get('sort') || 'new';
  const search = searchParams.get('q') || '';

  const [posts, setPosts] = useState<Post[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('sort', sort);
      if (search) params.set('q', search);

      const res = await fetch(`/api/posts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load posts');

      const data: PostsResponse = await res.json();
      setPosts(data.posts);
      setTotalPages(data.totalPages);
    } catch {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [page, sort, search]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/?${params.toString()}`);
  };

  return (
    <div>
      <SearchBox />

      {search && (
        <p className="text-hn-text text-sm mb-4">
          Search results for: <strong>{search}</strong>
        </p>
      )}

      {loading ? (
        <div className="text-hn-text text-center py-8">Loading...</div>
      ) : error ? (
        <div className="text-red-600 text-center py-8">{error}</div>
      ) : posts.length === 0 ? (
        <div className="text-hn-text text-center py-8">
          {search ? 'No posts found matching your search.' : 'No posts yet.'}
        </div>
      ) : (
        <>
          <div className="space-y-0">
            {posts.map((post, index) => (
              <PostItem
                key={post.id}
                post={post}
                rank={(page - 1) * 30 + index + 1}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 text-sm text-hn-text hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="px-4 py-2 text-sm text-hn-text">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="px-4 py-2 text-sm text-hn-text hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="text-hn-text text-center py-8">Loading...</div>}>
      <FeedContent />
    </Suspense>
  );
}
