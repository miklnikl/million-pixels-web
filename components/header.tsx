"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export function Header() {
  const { user, isLoading, error, openAuth, logout } = useAuth();
  return (
    <header className="shrink-0 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <nav
        aria-label="Main navigation"
        className="flex flex-wrap items-center gap-6"
      >
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
        <Link href="/leaderboard">Leaderboard</Link>
        <Link href="/progress">Progress</Link>
        <div className="ml-auto flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm">{user.email}</span>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void logout()}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => openAuth()}
              >
                Sign in
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => openAuth("register")}
              >
                Register
              </button>
            </>
          )}
        </div>
      </nav>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </header>
  );
}
