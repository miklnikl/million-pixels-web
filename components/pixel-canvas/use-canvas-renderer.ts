import type { RefObject } from "react";
import { useEffect } from "react";
import type { PixelBlock } from "@/app/types";
import { FIELD_SIZE, getRuler, getSelectionBounds } from "./helpers";
import type { Point, Selection, Size } from "./types";

type UseCanvasRendererOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  blocks: PixelBlock[];
  canvasSize: Size;
  offset: Point;
  scale: number;
  selection: Selection | null;
  hoveredPixel: Point | null;
  hoveredBlock: PixelBlock | null;
};

export function useCanvasRenderer({
  canvasRef,
  blocks,
  canvasSize,
  offset,
  scale,
  selection,
  hoveredPixel,
  hoveredBlock,
}: UseCanvasRendererOptions) {
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * pixelRatio;
    canvas.height = canvasSize.height * pixelRatio;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, canvasSize.width, canvasSize.height);

    drawField(context, blocks, offset, scale);
    drawHover(context, hoveredPixel, hoveredBlock, offset, scale);
    drawGrid(context, canvasSize, offset, scale);
    drawSelection(context, selection, offset, scale);
    drawRuler(context, canvasSize.height, scale);
  }, [
    blocks,
    canvasRef,
    canvasSize,
    hoveredBlock,
    hoveredPixel,
    offset,
    scale,
    selection,
  ]);
}

function drawField(
  context: CanvasRenderingContext2D,
  blocks: PixelBlock[],
  offset: Point,
  scale: number,
) {
  context.fillStyle = "#ffffff";
  context.fillRect(offset.x, offset.y, FIELD_SIZE * scale, FIELD_SIZE * scale);

  for (const block of blocks) {
    const fallbackColor =
      block.contentType === "IMAGE" ? "#2563eb" : "#f59e0b";
    context.fillStyle = fallbackColor;
    context.fillRect(
      offset.x + block.x * scale,
      offset.y + block.y * scale,
      block.width * scale,
      block.height * scale,
    );

    const colorCount = Math.min(
      block.colors?.length ?? 0,
      block.width * block.height,
    );

    for (let index = 0; index < colorCount; index += 1) {
      const color = block.colors?.[index];

      if (!color || !CSS.supports("color", color)) {
        continue;
      }

      const pixelX = index % block.width;
      const pixelY = Math.floor(index / block.width);
      context.fillStyle = color;
      context.fillRect(
        offset.x + (block.x + pixelX) * scale,
        offset.y + (block.y + pixelY) * scale,
        scale,
        scale,
      );
    }
  }
}

function drawHover(
  context: CanvasRenderingContext2D,
  hoveredPixel: Point | null,
  hoveredBlock: PixelBlock | null,
  offset: Point,
  scale: number,
) {
  if (!hoveredPixel) {
    return;
  }

  const bounds = hoveredBlock ?? {
    x: hoveredPixel.x,
    y: hoveredPixel.y,
    width: 1,
    height: 1,
  };

  context.strokeStyle = "#18181b";
  context.lineWidth = 2;
  context.strokeRect(
    offset.x + bounds.x * scale,
    offset.y + bounds.y * scale,
    bounds.width * scale,
    bounds.height * scale,
  );
}

function drawGrid(
  context: CanvasRenderingContext2D,
  canvasSize: Size,
  offset: Point,
  scale: number,
) {
  if (scale < 8) {
    return;
  }

  const firstX = Math.max(0, Math.floor(-offset.x / scale));
  const lastX = Math.min(
    FIELD_SIZE,
    Math.ceil((canvasSize.width - offset.x) / scale),
  );
  const firstY = Math.max(0, Math.floor(-offset.y / scale));
  const lastY = Math.min(
    FIELD_SIZE,
    Math.ceil((canvasSize.height - offset.y) / scale),
  );

  context.beginPath();
  context.strokeStyle = "#d4d4d8";
  context.lineWidth = 1;

  for (let x = firstX; x <= lastX; x += 1) {
    const screenX = offset.x + x * scale;
    context.moveTo(screenX, offset.y + firstY * scale);
    context.lineTo(screenX, offset.y + lastY * scale);
  }

  for (let y = firstY; y <= lastY; y += 1) {
    const screenY = offset.y + y * scale;
    context.moveTo(offset.x + firstX * scale, screenY);
    context.lineTo(offset.x + lastX * scale, screenY);
  }

  context.stroke();
}

function drawSelection(
  context: CanvasRenderingContext2D,
  selection: Selection | null,
  offset: Point,
  scale: number,
) {
  if (!selection) {
    return;
  }

  const bounds = getSelectionBounds(selection);
  context.fillStyle = "rgb(24 24 27 / 0.18)";
  context.fillRect(
    offset.x + bounds.x * scale,
    offset.y + bounds.y * scale,
    bounds.width * scale,
    bounds.height * scale,
  );
  context.strokeStyle = "#18181b";
  context.lineWidth = 2;
  context.strokeRect(
    offset.x + bounds.x * scale,
    offset.y + bounds.y * scale,
    bounds.width * scale,
    bounds.height * scale,
  );
}

function drawRuler(
  context: CanvasRenderingContext2D,
  canvasHeight: number,
  scale: number,
) {
  const ruler = getRuler(scale);
  const x = 20;
  const y = canvasHeight - 24;

  context.fillStyle = "rgb(255 255 255 / 0.9)";
  context.fillRect(x - 8, y - 24, ruler.screenSize + 16, 36);
  context.beginPath();
  context.strokeStyle = "#18181b";
  context.lineWidth = 2;
  context.moveTo(x, y);
  context.lineTo(x + ruler.screenSize, y);
  context.moveTo(x, y - 5);
  context.lineTo(x, y + 5);
  context.moveTo(x + ruler.screenSize, y - 5);
  context.lineTo(x + ruler.screenSize, y + 5);
  context.stroke();
  context.fillStyle = "#18181b";
  context.font = "12px sans-serif";
  context.textBaseline = "bottom";
  context.fillText(`${ruler.worldSize} px`, x, y - 7);
}
