export type PixelBlock = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  colors?: string[];
  contentType?: "IMAGE" | "TEXT";
  content?: string;
  createdAt: string;
  updatedAt: string;
};
