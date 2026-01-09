"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search posts..."
        className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-hn-orange focus:border-transparent"
      />
      <button
        type="submit"
        className="px-4 py-1.5 bg-hn-orange text-white text-sm rounded hover:bg-orange-600 transition-colors"
      >
        Search
      </button>
      {searchParams.get("q") && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            const params = new URLSearchParams(searchParams.toString());
            params.delete("q");
            router.push(`/?${params.toString()}`);
          }}
          className="px-3 py-1.5 text-hn-text text-sm hover:underline"
        >
          Clear
        </button>
      )}
    </form>
  );
}
