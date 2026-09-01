import type { CSSProperties } from "react";
import type { PixelBlock } from "@/app/types";

type PixelBlockPopoverProps = {
  block: PixelBlock;
  style: CSSProperties;
};

export function PixelBlockPopover({ block, style }: PixelBlockPopoverProps) {
  return (
    <aside
      className="pointer-events-none absolute z-10 w-64 border border-zinc-300 bg-white p-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-950"
      style={style}
    >
      {block.content && <p>{block.content}</p>}
    </aside>
  );
}
