import { PixelCanvas } from "@/components/pixel-canvas";
import { PixelBlock } from "./types";

export default async function Home() {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/pixel-blocks`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("Failed to load pixel blocks");
  }

  const blocks: PixelBlock[] = await response.json();

  return (
    <main className="flex min-h-0 flex-1 justify-center p-6">
      <PixelCanvas blocks={blocks} />
    </main>
  );
}
