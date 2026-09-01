import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <nav aria-label="Main navigation" className="flex gap-6">
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
        <Link href="/leaderboard">Leaderboard</Link>
        <Link href="/progress">Progress</Link>
      </nav>
    </header>
  );
}
