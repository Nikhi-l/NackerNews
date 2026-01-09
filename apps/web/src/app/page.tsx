"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import { Post, api, PostListResponse, ApiError } from "@/lib/api";
import PostItem from "@/components/PostItem";
import SearchBox from "@/components/SearchBox";

type SortType = "new" | "top" | "best";

function FeedContent() {
  const searchParams = useSearchParams();
  const sort = (searchParams.get("sort") as SortType) || "new";
  const searchQuery = searchParams.get("q") || "";

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPosts = useCallback(async (reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setPosts([]);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const response: PostListResponse = await api.getPosts(
        sort,
        30,
        reset ? undefined : cursor || undefined,
        searchQuery || undefined
      );

      if (reset) {
        setPosts(response.posts);
      } else {
        setPosts((prev) => [...prev, ...response.posts]);
      }
      setCursor(response.next_cursor);
      setHasMore(response.has_more);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.error?.message || "Failed to load posts");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sort, cursor, searchQuery]);

  useEffect(() => {
    setCursor(null);
    fetchPosts(true);
  }, [sort, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPosts(false);
    }
  };

  return (
    <div>
      <SearchBox />

      {searchQuery && (
        <p className="text-hn-text text-sm mb-4">
          Search results for: <strong>{searchQuery}</strong>
        </p>
      )}

      {loading ? (
        <div className="text-hn-text text-center py-8">Loading...</div>
      ) : error ? (
        <div className="text-red-600 text-center py-8">{error}</div>
      ) : posts.length === 0 ? (
        <div className="text-hn-text text-center py-8">
          {searchQuery ? "No posts found matching your search." : "No posts yet."}
        </div>
      ) : (
        <>
          <div className="space-y-0">
            {posts.map((post, index) => (
              <PostItem key={post.id} post={post} rank={index + 1} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2 text-hn-text hover:underline text-sm disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load More"}
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
