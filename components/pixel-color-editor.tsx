"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import styles from "./pixel-color-editor.module.css";

type PixelColorEditorProps = {
  width: number;
  height: number;
  colors: string[];
  onChange: (colors: string[]) => void;
};

export function PixelColorEditor({
  width,
  height,
  colors,
  onChange,
}: PixelColorEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorsRef = useRef(colors);
  const initialColorsRef = useRef([...colors]);
  const isPaintingRef = useRef(false);
  const lastPixelRef = useRef<{ x: number; y: number } | null>(null);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(1);

  useEffect(() => {
    colorsRef.current = [...colors];
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    canvas.width = width;
    canvas.height = height;

    for (let index = 0; index < width * height; index += 1) {
      const color = colors[index] ?? "#000000";
      context.fillStyle = CSS.supports("color", color) ? color : "#000000";
      context.fillRect(index % width, Math.floor(index / width), 1, 1);
    }
  }, [colors, height, width]);

  function paint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * height);

    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }

    const context = canvas.getContext("2d");
    const start = lastPixelRef.current ?? { x, y };
    const steps = Math.max(Math.abs(x - start.x), Math.abs(y - start.y), 1);

    if (context) {
      context.fillStyle = brushColor;
    }

    for (let step = 0; step <= steps; step += 1) {
      const centerX = Math.round(start.x + ((x - start.x) * step) / steps);
      const centerY = Math.round(start.y + ((y - start.y) * step) / steps);
      const brushStartX = centerX - Math.floor(brushSize / 2);
      const brushStartY = centerY - Math.floor(brushSize / 2);

      for (let brushY = 0; brushY < brushSize; brushY += 1) {
        for (let brushX = 0; brushX < brushSize; brushX += 1) {
          const pixelX = brushStartX + brushX;
          const pixelY = brushStartY + brushY;

          if (pixelX < 0 || pixelY < 0 || pixelX >= width || pixelY >= height) {
            continue;
          }

          colorsRef.current[pixelY * width + pixelX] = brushColor;
          context?.fillRect(pixelX, pixelY, 1, 1);
        }
      }
    }

    lastPixelRef.current = { x, y };
  }

  function finishPainting() {
    if (!isPaintingRef.current) {
      return;
    }

    isPaintingRef.current = false;
    lastPixelRef.current = null;
    onChange([...colorsRef.current]);
  }

  function resetDrawing() {
    isPaintingRef.current = false;
    lastPixelRef.current = null;
    onChange([...initialColorsRef.current]);
  }

  const editorStyle = {
    width: `min(100%, ${16 * (width / height)}rem)`,
    aspectRatio: `${width} / ${height}`,
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span>Colors</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
            onClick={resetDrawing}
          >
            Undo
          </button>
          <label className="flex items-center gap-2">
            Color
            <input
              type="color"
              value={brushColor}
              onChange={(event) => setBrushColor(event.target.value)}
              className="h-8 w-12 border border-zinc-300 dark:border-zinc-700"
            />
          </label>
          <label className="flex items-center gap-2">
            Size
            <select
              value={brushSize}
              onChange={(event) => setBrushSize(Number(event.target.value))}
              className="h-8 border border-zinc-300 bg-transparent px-2 dark:border-zinc-700"
            >
              {[1, 2, 4, 6, 10].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex justify-center overflow-auto bg-zinc-100 dark:bg-zinc-900">
        <div
          className="relative max-h-64 max-w-full shrink-0"
          style={editorStyle}
        >
          <canvas
            ref={canvasRef}
            aria-label={`${width} by ${height} pixel color editor`}
            className={`${styles.canvas} block h-full w-full touch-none border border-zinc-300 [image-rendering:pixelated] dark:border-zinc-700`}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              isPaintingRef.current = true;
              lastPixelRef.current = null;
              paint(event);
            }}
            onPointerMove={(event) => {
              if (isPaintingRef.current) {
                paint(event);
              }
            }}
            onPointerUp={finishPainting}
            onPointerCancel={finishPainting}
          />
        </div>
      </div>
    </div>
  );
}
