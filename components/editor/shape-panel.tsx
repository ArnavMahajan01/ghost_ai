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

import { SHAPE_DRAG_MIME_TYPE } from "@/lib/canvas";
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
}

/**
 * Floating pill-shaped toolbar at the bottom-center of the canvas. Each
 * button is draggable — dropping it onto the canvas creates a new node
 * (handled by `Canvas`'s `onDrop`).
 */
export function ShapePanel() {
  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-surface-border bg-surface/90 p-2 shadow-lg backdrop-blur-sm">
      {SHAPES.map(({ shape, label, icon: Icon }) => (
        <button
          key={shape}
          type="button"
          draggable
          onDragStart={(event) => handleDragStart(event, shape)}
          aria-label={`Drag to add a ${label.toLowerCase()} node`}
          title={label}
          className="flex h-9 w-9 cursor-grab items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary active:cursor-grabbing"
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
