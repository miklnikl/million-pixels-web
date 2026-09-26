export type PixelBlock = {
  id: string;
  userId: string | null;
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

export type User = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
};
