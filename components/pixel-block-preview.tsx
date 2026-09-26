"use client";

import { useEffect, useRef } from "react";

type PixelBlockPreviewProps = {
  block: {
    width: number;
    height: number;
    colors: string[];
    contentType: "IMAGE" | "TEXT" | null;
  };
};

export function PixelBlockPreview({ block }: PixelBlockPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scale = Math.min(96 / block.width, 64 / block.height);
  const width = Math.max(1, Math.round(block.width * scale));
  const height = Math.max(1, Math.round(block.height * scale));
  const fallbackColor = block.contentType === "IMAGE" ? "#2563eb" : "#f59e0b";

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;

    context.fillStyle = fallbackColor;
    context.fillRect(0, 0, width, height);

    // Sample into a bounded thumbnail, preserving the block's pixel colors.
    for (let y = 0; y < height; y += 1) {
      const sourceY = Math.floor(((y + 0.5) * block.height) / height);
      for (let x = 0; x < width; x += 1) {
        const sourceX = Math.floor(((x + 0.5) * block.width) / width);
        const color = block.colors[sourceY * block.width + sourceX];
        if (color && CSS.supports("color", color)) {
          context.fillStyle = color;
          context.fillRect(x, y, 1, 1);
        }
      }
    }
  }, [block, fallbackColor, width, height]);

  return (
    <div className="flex h-16 w-24 items-center justify-center">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        role="img"
        aria-label={`${block.width} × ${block.height} pixel block`}
        style={{ backgroundColor: fallbackColor, imageRendering: "pixelated" }}
      />
    </div>
  );
}
