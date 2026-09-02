"use client";

import { FormEvent, useState } from "react";
import type { PixelBlock } from "@/app/types";

type Area = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PixelBlockFormModalProps = {
  area: Area;
  block?: PixelBlock;
  onClose: () => void;
  onSaved: (block: PixelBlock) => void;
};

function getInputColor(block?: PixelBlock) {
  const color = block?.colors?.[0];
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : "#000000";
}

export function PixelBlockFormModal({
  area,
  block,
  onClose,
  onSaved,
}: PixelBlockFormModalProps) {
  const [color, setColor] = useState(() => getInputColor(block));
  const [hasChangedColor, setHasChangedColor] = useState(false);
  const [content, setContent] = useState(block?.content ?? "");
  const [contentType, setContentType] = useState<"IMAGE" | "TEXT">(
    block?.contentType ?? "TEXT",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pixel-blocks${block ? `/${block.id}` : ""}`,
        {
          method: block ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...area,
            contentType,
            content: content || undefined,
            colors:
              block && !hasChangedColor
                ? (block.colors ?? [])
                : Array(area.width * area.height).fill(color),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const savedBlock: PixelBlock = await response.json();
      onSaved(savedBlock);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Request failed",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pixel-block-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <form
        className="w-full max-w-md border border-zinc-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-950"
        onSubmit={handleSubmit}
      >
        <h2 id="pixel-block-form-title" className="text-lg font-semibold">
          {block ? "Edit block" : "Buy this block"}
        </h2>

        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm">
            Color
            <input
              type="color"
              value={color}
              onChange={(event) => {
                setColor(event.target.value);
                setHasChangedColor(true);
              }}
              className="h-10 w-full border border-zinc-300 dark:border-zinc-700"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            Content
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-24 border border-zinc-300 bg-transparent p-2 dark:border-zinc-700"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            Content type
            <select
              value={contentType}
              onChange={(event) =>
                setContentType(event.target.value as "IMAGE" | "TEXT")
              }
              className="h-10 border border-zinc-300 bg-transparent px-2 dark:border-zinc-700"
            >
              <option value="TEXT">TEXT</option>
              <option value="IMAGE">IMAGE</option>
            </select>
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="border border-zinc-300 px-4 py-2 dark:border-zinc-700"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
            disabled={isSaving}
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
