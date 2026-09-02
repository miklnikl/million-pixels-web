import type { PixelBlock } from "@/app/types";

export type Point = {
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
};

export type Area = Point & Size;

export type Selection = {
  start: Point;
  end: Point;
};

export type Camera = {
  zoom: number;
  offset: Point;
  canvasSize: Size;
};

export type PixelCanvasProps = {
  blocks: PixelBlock[];
};

export type TouchGesture = {
  distance: number;
  zoom: number;
  world: Point;
};
