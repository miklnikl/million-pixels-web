import type { Dispatch, RefObject, SetStateAction } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PixelBlock } from "@/app/types";
import {
  clamp,
  constrainOffset,
  FIELD_SIZE,
  getBlockView,
  getInitialView,
  MAX_ZOOM,
  MIN_ZOOM,
} from "./helpers";
import type { Camera, Point, Size, TouchGesture } from "./types";

type UseCanvasCameraOptions = {
  blocks: PixelBlock[];
  canvasRef: RefObject<HTMLCanvasElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
};

type CameraState = {
  canvasSize: Size;
  zoom: number;
  offset: Point;
  scale: number;
  setOffset: Dispatch<SetStateAction<Point>>;
  screenToPixel: (clientX: number, clientY: number) => Point | null;
  focusBlock: (block: PixelBlock) => void;
};

export function useCanvasCamera({
  blocks,
  canvasRef,
  viewportRef,
}: UseCanvasCameraOptions): CameraState {
  const [canvasSize, setCanvasSize] = useState<Size>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const touchGestureRef = useRef<TouchGesture | null>(null);
  const cameraRef = useRef<Camera>({ zoom, offset, canvasSize });
  const baseScale = Math.min(canvasSize.width, canvasSize.height) / FIELD_SIZE;
  const scale = baseScale * zoom;

  useLayoutEffect(() => {
    cameraRef.current = { zoom, offset, canvasSize };
  }, [canvasSize, offset, zoom]);

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
  }, [blocks, viewportRef]);

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
  }, [baseScale, canvasRef, canvasSize, offset, scale, zoom]);

  const screenToPixel = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;

      if (!canvas || scale === 0) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();
      const point = {
        x: Math.floor((clientX - rect.left - offset.x) / scale),
        y: Math.floor((clientY - rect.top - offset.y) / scale),
      };

      return point.x >= 0 &&
        point.y >= 0 &&
        point.x < FIELD_SIZE &&
        point.y < FIELD_SIZE
        ? point
        : null;
    },
    [canvasRef, offset, scale],
  );

  const focusBlock = useCallback(
    (block: PixelBlock) => {
      const view = getBlockView(block, canvasSize);
      const nextScale = baseScale * view.zoom;
      setZoom(view.zoom);
      setOffset(constrainOffset(view.offset, nextScale, canvasSize));
    },
    [baseScale, canvasSize],
  );

  return { canvasSize, zoom, offset, scale, setOffset, screenToPixel, focusBlock };
}
