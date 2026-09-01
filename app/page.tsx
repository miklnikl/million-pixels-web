import { PixelBlock } from "./types";

export default async function Home() {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/pixel-blocks`,
  );

  const blocks: PixelBlock[] = await response.json();

  return (
    <main>
      <pre>{JSON.stringify(blocks, null, 2)}</pre>
    </main>
  );
}
