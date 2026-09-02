"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { PixelBlock } from "@/app/types";
import { PixelBlockFormModal } from "@/components/pixel-block-form-modal";
import { PixelBlockPopover } from "@/components/pixel-block-popover";
import { PixelPriceWidget } from "@/components/pixel-price-widget";

const FIELD_SIZE = 1000;
const MIN_ZOOM = 1;
const MAX_ZOOM = 1000;
const FOCUSED_BLOCK_RATIO = 0.8;

type Point = {
  x: number;
  y: number;
};

type Selection = {
  start: Point;
  end: Point;
};

type PixelCanvasProps = {
  blocks: PixelBlock[];
};

type TouchGesture = {
  distance: number;
  zoom: number;
  world: Point;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getSelectionBounds(selection: Selection) {
  return {
    x: Math.min(selection.start.x, selection.end.x),
    y: Math.min(selection.start.y, selection.end.y),
    width: Math.abs(selection.end.x - selection.start.x) + 1,
    height: Math.abs(selection.end.y - selection.start.y) + 1,
  };
}

function findBlockAtPoint(blocks: PixelBlock[], point: Point) {
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

function areasOverlap(
  area: { x: number; y: number; width: number; height: number },
  block: PixelBlock,
) {
  return (
    area.x < block.x + block.width &&
    area.x + area.width > block.x &&
    area.y < block.y + block.height &&
    area.y + area.height > block.y
  );
}

function pointIsInsideArea(
  point: Point,
  area: { x: number; y: number; width: number; height: number },
) {
  return (
    point.x >= area.x &&
    point.x < area.x + area.width &&
    point.y >= area.y &&
    point.y < area.y + area.height
  );
}

function constrainOffset(
  offset: Point,
  scale: number,
  canvasSize: { width: number; height: number },
) {
  const fieldSize = FIELD_SIZE * scale;

  function constrainAxis(value: number, viewportSize: number) {
    if (fieldSize + 200 < viewportSize) {
      return (viewportSize - fieldSize) / 2;
    }

    return clamp(value, viewportSize - fieldSize - 100, 100);
  }

  return {
    x: constrainAxis(offset.x, canvasSize.width),
    y: constrainAxis(offset.y, canvasSize.height),
  };
}

function getInitialView(blocks: PixelBlock[], width: number, height: number) {
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
  const paddedWidth = contentWidth * 1.2;
  const paddedHeight = contentHeight * 1.2;
  const baseScale = Math.min(width, height) / FIELD_SIZE;
  const zoom = clamp(
    Math.min(width / paddedWidth, height / paddedHeight) / baseScale,
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

function getRuler(scale: number) {
  const targetWorldSize = 100 / scale;
  const magnitude = 10 ** Math.floor(Math.log10(targetWorldSize));
  const normalizedSize = targetWorldSize / magnitude;
  const step = normalizedSize >= 5 ? 5 : normalizedSize >= 2 ? 2 : 1;
  const worldSize = step * magnitude;

  return { worldSize, screenSize: worldSize * scale };
}

function getBlockView(
  block: PixelBlock,
  canvasSize: { width: number; height: number },
) {
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

export function PixelCanvas({ blocks: initialBlocks }: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<PixelBlock | null>(null);
  const [purchaseArea, setPurchaseArea] = useState<ReturnType<
    typeof getSelectionBounds
  > | null>(null);
  const [editingBlock, setEditingBlock] = useState<PixelBlock | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<Point | null>(null);
  const dragStartRef = useRef<Point | null>(null);
  const touchGestureRef = useRef<TouchGesture | null>(null);
  const cameraRef = useRef({ zoom, offset, canvasSize });

  const baseScale = Math.min(canvasSize.width, canvasSize.height) / FIELD_SIZE;
  const scale = baseScale * zoom;

  useLayoutEffect(() => {
    cameraRef.current = { zoom, offset, canvasSize };
  }, [canvasSize, offset, zoom]);

  const hoveredPixel = (() => {
    if (!hoveredPosition || scale === 0) {
      return null;
    }

    const point = {
      x: Math.floor((hoveredPosition.x - offset.x) / scale),
      y: Math.floor((hoveredPosition.y - offset.y) / scale),
    };

    return point.x >= 0 &&
      point.y >= 0 &&
      point.x < FIELD_SIZE &&
      point.y < FIELD_SIZE
      ? point
      : null;
  })();
  const hoveredBlock = hoveredPixel
    ? findBlockAtPoint(blocks, hoveredPixel)
    : null;

  const screenToPixel = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;

      if (!canvas || scale === 0) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((clientX - rect.left - offset.x) / scale);
      const y = Math.floor((clientY - rect.top - offset.y) / scale);

      if (x < 0 || y < 0 || x >= FIELD_SIZE || y >= FIELD_SIZE) {
        return null;
      }

      return { x, y };
    },
    [offset, scale],
  );

  const findBlock = useCallback(
    (point: Point) => findBlockAtPoint(blocks, point),
    [blocks],
  );

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);

      if (width === 0 || height === 0) {
        return;
      }

      const currentCamera = cameraRef.current;

      setCanvasSize({ width, height });

      if (
        currentCamera.canvasSize.width === 0 ||
        currentCamera.canvasSize.height === 0
      ) {
        const initialView = getInitialView(blocks, width, height);
        setZoom(initialView.zoom);
        setOffset(initialView.offset);
        return;
      }

      const currentBaseScale =
        Math.min(
          currentCamera.canvasSize.width,
          currentCamera.canvasSize.height,
        ) / FIELD_SIZE;
      const currentScale = currentBaseScale * currentCamera.zoom;
      const nextScale =
        (Math.min(width, height) / FIELD_SIZE) * currentCamera.zoom;
      const center = {
        x:
          (currentCamera.canvasSize.width / 2 - currentCamera.offset.x) /
          currentScale,
        y:
          (currentCamera.canvasSize.height / 2 - currentCamera.offset.y) /
          currentScale,
      };

      setOffset({
        x: width / 2 - center.x * nextScale,
        y: height / 2 - center.y * nextScale,
      });
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, [blocks]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || baseScale === 0) {
      return;
    }

    function getTouchMetrics(touches: TouchList) {
      const rect = canvas!.getBoundingClientRect();
      const points = Array.from(touches)
        .slice(0, 2)
        .map((touch) => ({
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        }));
      const center = {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
      };
      const distance =
        points.reduce(
          (sum, point) =>
            sum + Math.hypot(point.x - center.x, point.y - center.y),
          0,
        ) / points.length;

      return { center, distance };
    }

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length !== 2) {
        touchGestureRef.current = null;
        return;
      }

      event.preventDefault();
      const { center, distance } = getTouchMetrics(event.touches);
      touchGestureRef.current = {
        distance,
        zoom,
        world: {
          x: (center.x - offset.x) / scale,
          y: (center.y - offset.y) / scale,
        },
      };
    }

    function handleTouchMove(event: TouchEvent) {
      const gesture = touchGestureRef.current;

      if (event.touches.length !== 2 || !gesture) {
        return;
      }

      event.preventDefault();
      const { center, distance } = getTouchMetrics(event.touches);
      const nextZoom = clamp(
        gesture.zoom * (distance / gesture.distance),
        MIN_ZOOM,
        MAX_ZOOM,
      );
      const nextScale = baseScale * nextZoom;

      setZoom(nextZoom);
      setOffset(
        constrainOffset(
          {
            x: center.x - gesture.world.x * nextScale,
            y: center.y - gesture.world.y * nextScale,
          },
          nextScale,
          canvasSize,
        ),
      );
    }

    function handleTouchEnd(event: TouchEvent) {
      if (event.touches.length < 2) {
        touchGestureRef.current = null;
      }
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault();

      if (!event.ctrlKey) {
        setOffset((currentOffset) =>
          constrainOffset(
            {
              x: currentOffset.x - event.deltaX,
              y: currentOffset.y - event.deltaY,
            },
            scale,
            canvasSize,
          ),
        );
        return;
      }

      const rect = canvas!.getBoundingClientRect();
      const anchor = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const world = {
        x: (anchor.x - offset.x) / scale,
        y: (anchor.y - offset.y) / scale,
      };
      const nextZoom = clamp(
        zoom * Math.exp(-event.deltaY * 0.01),
        MIN_ZOOM,
        MAX_ZOOM,
      );
      const nextScale = baseScale * nextZoom;

      setZoom(nextZoom);
      setOffset(
        constrainOffset(
          {
            x: anchor.x - world.x * nextScale,
            y: anchor.y - world.y * nextScale,
          },
          nextScale,
          canvasSize,
        ),
      );
    }

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("touchcancel", handleTouchEnd);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [baseScale, canvasSize, offset, scale, zoom]);

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

    context.fillStyle = "#ffffff";
    context.fillRect(
      offset.x,
      offset.y,
      FIELD_SIZE * scale,
      FIELD_SIZE * scale,
    );

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

    if (hoveredPixel) {
      const hoverBounds = hoveredBlock ?? {
        x: hoveredPixel.x,
        y: hoveredPixel.y,
        width: 1,
        height: 1,
      };

      context.strokeStyle = "#18181b";
      context.lineWidth = 2;
      context.strokeRect(
        offset.x + hoverBounds.x * scale,
        offset.y + hoverBounds.y * scale,
        hoverBounds.width * scale,
        hoverBounds.height * scale,
      );
    }

    if (scale >= 8) {
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

    if (selection) {
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

    const ruler = getRuler(scale);
    const rulerX = 20;
    const rulerY = canvasSize.height - 24;

    context.fillStyle = "rgb(255 255 255 / 0.9)";
    context.fillRect(rulerX - 8, rulerY - 24, ruler.screenSize + 16, 36);
    context.beginPath();
    context.strokeStyle = "#18181b";
    context.lineWidth = 2;
    context.moveTo(rulerX, rulerY);
    context.lineTo(rulerX + ruler.screenSize, rulerY);
    context.moveTo(rulerX, rulerY - 5);
    context.lineTo(rulerX, rulerY + 5);
    context.moveTo(rulerX + ruler.screenSize, rulerY - 5);
    context.lineTo(rulerX + ruler.screenSize, rulerY + 5);
    context.stroke();
    context.fillStyle = "#18181b";
    context.font = "12px sans-serif";
    context.textBaseline = "bottom";
    context.fillText(`${ruler.worldSize} px`, rulerX, rulerY - 7);
  }, [
    blocks,
    canvasSize,
    hoveredBlock,
    hoveredPixel,
    offset,
    scale,
    selection,
  ]);

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "touch") {
      return;
    }

    const point = screenToPixel(event.clientX, event.clientY);

    if (!point) {
      return;
    }

    if (selectedBlock && pointIsInsideArea(point, selectedBlock)) {
      dragStartRef.current = null;
      setSelection(null);
      setSelectedBlock(null);
      return;
    }

    const currentSelectionBounds = selection
      ? getSelectionBounds(selection)
      : null;

    if (
      currentSelectionBounds &&
      pointIsInsideArea(point, currentSelectionBounds)
    ) {
      dragStartRef.current = null;
      setSelection(null);
      setSelectedBlock(null);
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = point;
    setSelection(
      findBlock(point) ? null : { start: point, end: point },
    );
    setSelectedBlock(null);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "touch") {
      return;
    }

    const point = screenToPixel(event.clientX, event.clientY);
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });

    if (point && dragStartRef.current && !findBlock(dragStartRef.current)) {
      const nextSelection = { start: dragStartRef.current, end: point };
      const bounds = getSelectionBounds(nextSelection);

      if (!blocks.some((block) => areasOverlap(bounds, block))) {
        setSelection(nextSelection);
      }
    }
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "touch") {
      return;
    }

    const start = dragStartRef.current;
    const point = screenToPixel(event.clientX, event.clientY);
    dragStartRef.current = null;

    if (!start || !point) {
      return;
    }

    if (start.x === point.x && start.y === point.y) {
      const block = findBlock(point);
      setSelectedBlock(block);

      if (block) {
        const view = getBlockView(block, canvasSize);
        setZoom(view.zoom);
        setOffset(
          constrainOffset(
            view.offset,
            (Math.min(canvasSize.width, canvasSize.height) / FIELD_SIZE) *
              view.zoom,
            canvasSize,
          ),
        );
      } else {
        setSelection({ start, end: point });
      }
    } else if (!findBlock(start)) {
      const nextSelection = { start, end: point };
      const bounds = getSelectionBounds(nextSelection);

      if (!blocks.some((block) => areasOverlap(bounds, block))) {
        setSelection(nextSelection);
      }
    }
  }

  const selectionBounds = selection ? getSelectionBounds(selection) : null;
  const selectedEmptyArea =
    selectionBounds &&
    !selectedBlock &&
    !blocks.some((block) => areasOverlap(selectionBounds, block))
      ? selectionBounds
      : null;
  const soldPixels = blocks.reduce(
    (total, block) => total + block.width * block.height,
    0,
  );

  return (
    <section className="flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-4">
      <PixelPriceWidget
        soldPixels={soldPixels}
        selectedBlock={selectedBlock}
        selectedEmptyArea={selectedEmptyArea}
        onBuy={() => {
          if (selectedEmptyArea) {
            setPurchaseArea(selectedEmptyArea);
          }
        }}
        onEdit={() => {
          if (selectedBlock) {
            setEditingBlock(selectedBlock);
          }
        }}
      />

      <div ref={viewportRef} className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          aria-label="Pixel field"
          className="h-full w-full cursor-crosshair border border-zinc-300 bg-zinc-100 [touch-action:auto] dark:border-zinc-700 dark:bg-zinc-900"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            dragStartRef.current = null;
          }}
          onPointerLeave={() => setHoveredPosition(null)}
        />
        {hoveredBlock && (
          <PixelBlockPopover
            block={hoveredBlock}
            style={{
              left:
                offset.x + (hoveredBlock.x + hoveredBlock.width) * scale + 8,
              top: offset.y + hoveredBlock.y * scale,
            }}
          />
        )}
      </div>

      {purchaseArea && (
        <PixelBlockFormModal
          area={purchaseArea}
          onClose={() => setPurchaseArea(null)}
          onSaved={(block) => {
            setBlocks((currentBlocks) => [...currentBlocks, block]);
            setPurchaseArea(null);
            setSelection(null);
          }}
        />
      )}

      {editingBlock && (
        <PixelBlockFormModal
          area={editingBlock}
          block={editingBlock}
          onClose={() => setEditingBlock(null)}
          onSaved={(block) => {
            setBlocks((currentBlocks) =>
              currentBlocks.map((currentBlock) =>
                currentBlock.id === block.id ? block : currentBlock,
              ),
            );
            setEditingBlock(null);
            setSelectedBlock(block);
          }}
        />
      )}
    </section>
  );
}
