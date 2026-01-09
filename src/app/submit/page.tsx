'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SubmitPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
        } else {
          setIsAuthenticated(true);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!url.trim() && !text.trim()) {
      setError('Please provide either a URL or text content');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          url: url.trim() || null,
          text: text.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Failed to submit post');
        return;
      }

      router.push(`/post/${data.id}`);
    } catch {
      setError('Failed to submit post');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated === null) {
    return <div className="text-hn-text text-center py-8">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-6">Submit</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={300}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-hn-orange focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
            URL
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-hn-orange focus:border-transparent"
          />
          <p className="text-xs text-hn-text mt-1">Optional - for link posts</p>
        </div>

        <div className="text-center text-hn-text text-sm">or</div>

        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
            Text
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Write your post content here..."
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-hn-orange focus:border-transparent resize-y"
          />
          <p className="text-xs text-hn-text mt-1">
            Optional - for text posts (Ask HN, Show HN, etc.)
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-hn-orange text-white rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-gray-100 rounded text-sm text-hn-text">
        <p className="font-medium mb-2">Submission Guidelines:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Provide either a URL for link posts or text for discussion posts</li>
          <li>Use descriptive titles that accurately represent the content</li>
          <li>For &quot;Ask HN&quot; posts, use text content to describe your question</li>
          <li>For &quot;Show HN&quot; posts, include a URL to your project</li>
        </ul>
      </div>
    </div>
  );
}
