import type { PixelBlock } from "@/app/types";

type Area = {
  width: number;
  height: number;
};

type PixelPriceWidgetProps = {
  soldPixels: number;
  selectedBlock: PixelBlock | null;
  selectedEmptyArea: Area | null;
};

const TOTAL_PIXELS = 1_000_000;

function formatPrice(pixels: number) {
  return `$${pixels.toLocaleString("en-US")}`;
}

function SelectionDetails({ label, area }: { label: string; area: Area }) {
  const pixels = area.width * area.height;

  return (
    <div className="flex h-full items-center justify-between gap-6">
      <div>
        <p className="text-sm text-zinc-500">{label}</p>
        <p className="mt-1 text-lg font-medium tabular-nums">
          {area.width} × {area.height} px
        </p>
      </div>
      <p className="text-2xl font-semibold tabular-nums">
        {formatPrice(pixels)}
      </p>
    </div>
  );
}

export function PixelPriceWidget({
  soldPixels,
  selectedBlock,
  selectedEmptyArea,
}: PixelPriceWidgetProps) {
  const safeSoldPixels = Math.min(soldPixels, TOTAL_PIXELS);
  const progress = (safeSoldPixels / TOTAL_PIXELS) * 100;

  return (
    <section className="h-24 shrink-0 border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950">
      {selectedBlock ? (
        <SelectionDetails label="Block" area={selectedBlock} />
      ) : selectedEmptyArea ? (
        <SelectionDetails label="Selection" area={selectedEmptyArea} />
      ) : (
        <div className="flex h-full flex-col justify-center">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span>Sold</span>
            <span className="tabular-nums">
              {formatPrice(safeSoldPixels)} / {formatPrice(TOTAL_PIXELS)}
            </span>
          </div>
          <div className="mt-3 h-3 overflow-hidden bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full bg-blue-600"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
