import { PixelBlockPreview } from "@/components/pixel-block-preview";

type LeaderboardEntry = {
  rank: number;
  maskedEmail: string;
  pixels: number;
  block: {
    width: number;
    height: number;
    colors: string[];
    contentType: "IMAGE" | "TEXT" | null;
    content: string | null;
    priceUsd: number;
  };
};

export default async function LeaderboardPage() {
  let entries: LeaderboardEntry[] = [];
  let hasError = false;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/users/leaderboard`,
      { cache: "no-store" },
    );
    if (!response.ok) throw new Error("Failed to load leaderboard");
    entries = await response.json();
  } catch {
    hasError = true;
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-semibold">Leaderboard</h1>
        {hasError ? (
          <p role="alert" className="mt-6 text-sm text-red-600">
            Unable to load the leaderboard. Please try again later.
          </p>
        ) : entries.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">No owned blocks yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto border border-zinc-300 dark:border-zinc-700">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Blocks ranked by pixel area</caption>
              <thead className="border-b border-zinc-300 dark:border-zinc-700">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Rank
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Owner
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Pixels
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Block
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Block price
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Text
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {entries.map((entry) => (
                  <tr key={entry.rank}>
                    <td className="px-4 py-3 tabular-nums">{entry.rank}</td>
                    <td className="break-all px-4 py-3">{entry.maskedEmail}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {entry.pixels.toLocaleString("en-US")}
                    </td>
                    <td className="px-4 py-3">
                      <PixelBlockPreview block={entry.block} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      ${entry.block.priceUsd.toLocaleString("en-US")}
                    </td>
                    <td className="max-w-xs whitespace-pre-wrap break-words px-4 py-3 [overflow-wrap:anywhere]">
                      {entry.block.content || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
