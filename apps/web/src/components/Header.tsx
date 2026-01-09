"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks";

export default function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="bg-hn-orange">
      <nav className="max-w-5xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href="/"
              className="font-bold text-black hover:text-white transition-colors"
            >
              Nacker News
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <Link href="/?sort=new" className="text-black hover:text-white">
                new
              </Link>
              <span className="text-black/50">|</span>
              <Link href="/?sort=top" className="text-black hover:text-white">
                top
              </Link>
              <span className="text-black/50">|</span>
              <Link href="/?sort=best" className="text-black hover:text-white">
                best
              </Link>
              {user && (
                <>
                  <span className="text-black/50">|</span>
                  <Link href="/submit" className="text-black hover:text-white">
                    submit
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="text-sm">
            {loading ? (
              <span className="text-black/50">...</span>
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="text-black">{user.username}</span>
                <button
                  onClick={logout}
                  className="text-black hover:text-white"
                >
                  logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-black hover:text-white">
                  login
                </Link>
                <span className="text-black/50">|</span>
                <Link href="/signup" className="text-black hover:text-white">
                  signup
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
