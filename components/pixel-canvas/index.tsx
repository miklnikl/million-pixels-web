"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { PixelBlock } from "@/app/types";
import { PixelBlockFormModal } from "@/components/pixel-block-form-modal";
import { PixelBlockPopover } from "@/components/pixel-block-popover";
import { PixelPriceWidget } from "@/components/pixel-price-widget";
import {
  areasOverlap,
  findBlockAtPoint,
  getSelectionBounds,
  pointIsInsideArea,
  screenPositionToPixel,
} from "./helpers";
import type { Area, PixelCanvasProps, Point, Selection } from "./types";
import { useCanvasCamera } from "./use-canvas-camera";
import { useCanvasRenderer } from "./use-canvas-renderer";

export function PixelCanvas({ blocks: initialBlocks }: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<Point | null>(null);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<PixelBlock | null>(null);
  const [purchaseArea, setPurchaseArea] = useState<Area | null>(null);
  const [editingBlock, setEditingBlock] = useState<PixelBlock | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<Point | null>(null);
  const { canvasSize, offset, scale, screenToPixel, focusBlock } =
    useCanvasCamera({ blocks, canvasRef, viewportRef });

  const hoveredPixel = screenPositionToPixel(hoveredPosition, offset, scale);
  const hoveredBlock = hoveredPixel
    ? findBlockAtPoint(blocks, hoveredPixel)
    : null;
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

  useCanvasRenderer({
    canvasRef,
    blocks,
    canvasSize,
    offset,
    scale,
    selection,
    hoveredPixel,
    hoveredBlock,
  });

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;

      if (target instanceof Node && !canvasRef.current?.contains(target)) {
        dragStartRef.current = null;
        setSelection(null);
        setSelectedBlock(null);
      }
    }

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  function findBlock(point: Point) {
    return findBlockAtPoint(blocks, point);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "touch") {
      return;
    }

    const point = screenToPixel(event.clientX, event.clientY);

    if (!point) {
      return;
    }

    if (selectedBlock && pointIsInsideArea(point, selectedBlock)) {
      clearSelection();
      return;
    }

    if (selectionBounds && pointIsInsideArea(point, selectionBounds)) {
      clearSelection();
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = point;
    setSelection(findBlock(point) ? null : { start: point, end: point });
    setSelectedBlock(null);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
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
      updateSelectionIfEmpty({ start: dragStartRef.current, end: point });
    }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
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
        focusBlock(block);
      } else {
        setSelection({ start, end: point });
      }
      return;
    }

    if (!findBlock(start)) {
      updateSelectionIfEmpty({ start, end: point });
    }
  }

  function updateSelectionIfEmpty(nextSelection: Selection) {
    const bounds = getSelectionBounds(nextSelection);

    if (!blocks.some((block) => areasOverlap(bounds, block))) {
      setSelection(nextSelection);
    }
  }

  function clearSelection() {
    dragStartRef.current = null;
    setSelection(null);
    setSelectedBlock(null);
  }

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
        onClearSelection={clearSelection}
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
