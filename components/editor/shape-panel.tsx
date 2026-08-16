"use client";

import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill as PillIcon,
  RectangleHorizontal,
} from "lucide-react";
import type { DragEvent } from "react";

import { createShapeDragPreviewElement, SHAPE_DRAG_MIME_TYPE } from "@/lib/canvas";
import { NODE_DEFAULT_SIZES } from "@/types/canvas";
import type { NodeShape, ShapeDragPayload } from "@/types/canvas";

const SHAPES: { shape: NodeShape; label: string; icon: typeof Circle }[] = [
  { shape: "rectangle", label: "Rectangle", icon: RectangleHorizontal },
  { shape: "diamond", label: "Diamond", icon: Diamond },
  { shape: "circle", label: "Circle", icon: Circle },
  { shape: "pill", label: "Pill", icon: PillIcon },
  { shape: "cylinder", label: "Cylinder", icon: Cylinder },
  { shape: "hexagon", label: "Hexagon", icon: Hexagon },
];

function handleDragStart(event: DragEvent<HTMLButtonElement>, shape: NodeShape) {
  const { width, height } = NODE_DEFAULT_SIZES[shape];
  const payload: ShapeDragPayload = { shape, width, height };

  event.dataTransfer.setData(SHAPE_DRAG_MIME_TYPE, JSON.stringify(payload));
  event.dataTransfer.effectAllowed = "copy";

  // Ghost preview: matches the shape/size that will actually be dropped.
  // `setDragImage` needs the element attached to the document to rasterize
  // it, but the browser only needs it for the instant `dragstart` fires —
  // safe to detach on the next tick. The image itself then tracks the
  // cursor automatically for the rest of the drag and disappears on drop
  // or cancel, all native browser behavior with nothing left to clean up.
  const preview = createShapeDragPreviewElement(shape, width, height);
  document.body.appendChild(preview);
  event.dataTransfer.setDragImage(preview, width / 2, height / 2);
  setTimeout(() => preview.remove(), 0);
}

interface ShapePanelProps {
  /** Adds a shape via keyboard/click, as an alternative to dragging it onto the canvas. */
  onAddShape: (shape: NodeShape) => void;
}

/**
 * Floating pill-shaped toolbar at the bottom-center of the canvas. Each
 * button is draggable — dropping it onto the canvas creates a new node
 * (handled by `Canvas`'s `onDrop`) — and also a plain button, so keyboard
 * users who can't drag can press Enter/Space to add the same node.
 */
export function ShapePanel({ onAddShape }: ShapePanelProps) {
  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-surface-border bg-surface/90 p-2 shadow-lg backdrop-blur-sm">
      {SHAPES.map(({ shape, label, icon: Icon }) => (
        <button
          key={shape}
          type="button"
          draggable
          onDragStart={(event) => handleDragStart(event, shape)}
          onClick={() => onAddShape(shape)}
          aria-label={`Add a ${label.toLowerCase()} node`}
          title={label}
          className="flex h-9 w-9 cursor-grab items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary active:cursor-grabbing"
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
