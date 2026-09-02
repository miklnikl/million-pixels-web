import type { PixelBlock } from "@/app/types";
import type { Area, Point, Selection, Size } from "./types";

export const FIELD_SIZE = 1000;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 1000;

const FOCUSED_BLOCK_RATIO = 0.8;
const MAX_FIELD_OVERFLOW = 100;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getSelectionBounds(selection: Selection): Area {
  return {
    x: Math.min(selection.start.x, selection.end.x),
    y: Math.min(selection.start.y, selection.end.y),
    width: Math.abs(selection.end.x - selection.start.x) + 1,
    height: Math.abs(selection.end.y - selection.start.y) + 1,
  };
}

export function findBlockAtPoint(blocks: PixelBlock[], point: Point) {
  return (
    blocks.find(
      (block) =>
        point.x >= block.x &&
        point.x < block.x + block.width &&
        point.y >= block.y &&
        point.y < block.y + block.height,
    ) ?? null
  );
}

export function areasOverlap(area: Area, block: PixelBlock) {
  return (
    area.x < block.x + block.width &&
    area.x + area.width > block.x &&
    area.y < block.y + block.height &&
    area.y + area.height > block.y
  );
}

export function pointIsInsideArea(point: Point, area: Area) {
  return (
    point.x >= area.x &&
    point.x < area.x + area.width &&
    point.y >= area.y &&
    point.y < area.y + area.height
  );
}

export function screenPositionToPixel(
  position: Point | null,
  offset: Point,
  scale: number,
) {
  if (!position || scale === 0) {
    return null;
  }

  const point = {
    x: Math.floor((position.x - offset.x) / scale),
    y: Math.floor((position.y - offset.y) / scale),
  };

  return point.x >= 0 &&
    point.y >= 0 &&
    point.x < FIELD_SIZE &&
    point.y < FIELD_SIZE
    ? point
    : null;
}

export function constrainOffset(offset: Point, scale: number, canvasSize: Size) {
  const fieldSize = FIELD_SIZE * scale;

  function constrainAxis(value: number, viewportSize: number) {
    if (fieldSize + MAX_FIELD_OVERFLOW * 2 < viewportSize) {
      return (viewportSize - fieldSize) / 2;
    }

    return clamp(
      value,
      viewportSize - fieldSize - MAX_FIELD_OVERFLOW,
      MAX_FIELD_OVERFLOW,
    );
  }

  return {
    x: constrainAxis(offset.x, canvasSize.width),
    y: constrainAxis(offset.y, canvasSize.height),
  };
}

export function getInitialView(blocks: PixelBlock[], width: number, height: number) {
  if (blocks.length === 0) {
    const scale = Math.min(width, height) / FIELD_SIZE;

    return {
      zoom: MIN_ZOOM,
      offset: {
        x: (width - FIELD_SIZE * scale) / 2,
        y: (height - FIELD_SIZE * scale) / 2,
      },
    };
  }

  const minX = Math.min(...blocks.map((block) => block.x));
  const minY = Math.min(...blocks.map((block) => block.y));
  const maxX = Math.max(...blocks.map((block) => block.x + block.width));
  const maxY = Math.max(...blocks.map((block) => block.y + block.height));
  const contentWidth = Math.max(maxX - minX, 1);
  const contentHeight = Math.max(maxY - minY, 1);
  const baseScale = Math.min(width, height) / FIELD_SIZE;
  const zoom = clamp(
    Math.min(width / (contentWidth * 1.2), height / (contentHeight * 1.2)) /
      baseScale,
    MIN_ZOOM,
    MAX_ZOOM,
  );
  const scale = baseScale * zoom;

  return {
    zoom,
    offset: {
      x: width / 2 - ((minX + maxX) / 2) * scale,
      y: height / 2 - ((minY + maxY) / 2) * scale,
    },
  };
}

export function getBlockView(block: PixelBlock, canvasSize: Size) {
  const baseScale = Math.min(canvasSize.width, canvasSize.height) / FIELD_SIZE;
  const scale = Math.min(
    (canvasSize.width * FOCUSED_BLOCK_RATIO) / block.width,
    (canvasSize.height * FOCUSED_BLOCK_RATIO) / block.height,
  );
  const zoom = clamp(scale / baseScale, MIN_ZOOM, MAX_ZOOM);
  const appliedScale = baseScale * zoom;

  return {
    zoom,
    offset: {
      x: canvasSize.width / 2 - (block.x + block.width / 2) * appliedScale,
      y: canvasSize.height / 2 - (block.y + block.height / 2) * appliedScale,
    },
  };
}

export function getRuler(scale: number) {
  const targetWorldSize = 100 / scale;
  const magnitude = 10 ** Math.floor(Math.log10(targetWorldSize));
  const normalizedSize = targetWorldSize / magnitude;
  const step = normalizedSize >= 5 ? 5 : normalizedSize >= 2 ? 2 : 1;
  const worldSize = step * magnitude;

  return { worldSize, screenSize: worldSize * scale };
}
