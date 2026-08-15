"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

import { DEFAULT_NODE_COLOR, NODE_COLORS } from "@/types/canvas";
import type { CanvasNode, NodeShape } from "@/types/canvas";

const HANDLES = (
  <>
    <Handle type="target" position={Position.Top} />
    <Handle type="source" position={Position.Right} />
    <Handle type="target" position={Position.Bottom} />
    <Handle type="source" position={Position.Left} />
  </>
);

/** Shapes simple enough to draw with CSS border-radius, no SVG needed. */
const CSS_SHAPE_RADIUS: Partial<Record<NodeShape, string>> = {
  rectangle: "0.375rem", // rounded-md
  circle: "9999px",
  pill: "9999px",
};

/** `points` for the shapes drawn as an SVG polygon, in a 0–100 viewBox. */
const POLYGON_POINTS: Partial<Record<NodeShape, string>> = {
  diamond: "50,0 100,50 50,100 0,50",
  hexagon: "25,0 75,0 100,50 75,100 25,100 0,50",
};

interface ShapeLabelProps {
  label: string;
  textColor: string;
}

function ShapeLabel({ label, textColor }: ShapeLabelProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm"
      style={{ color: textColor }}
    >
      <span className="truncate">{label || " "}</span>
    </div>
  );
}

/**
 * Renderer for the `canvasNode` type. Rectangle/circle/pill are plain
 * bordered divs (border-radius alone draws them); diamond/hexagon/cylinder
 * are drawn as inline SVG per `context/ui-context.md` ("complex shapes are
 * rendered as inline SVGs rather than CSS borders").
 */
export function CanvasNodeRenderer({ data, selected }: NodeProps<CanvasNode>) {
  const fill = data.color || DEFAULT_NODE_COLOR.fill;
  const textColor =
    NODE_COLORS.find((c) => c.fill === fill)?.text ?? DEFAULT_NODE_COLOR.text;
  const stroke = selected ? "#FFFFFF" : "rgba(255, 255, 255, 0.12)";
  const label = data.label;

  const radius = CSS_SHAPE_RADIUS[data.shape];
  if (radius) {
    return (
      <div
        className="relative h-full w-full border"
        style={{ backgroundColor: fill, borderColor: stroke, borderRadius: radius }}
      >
        {HANDLES}
        <ShapeLabel label={label} textColor={textColor} />
      </div>
    );
  }

  const points = POLYGON_POINTS[data.shape];
  if (points) {
    return (
      <div className="relative h-full w-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <polygon points={points} fill={fill} stroke={stroke} strokeWidth={2} />
        </svg>
        {HANDLES}
        <ShapeLabel label={label} textColor={textColor} />
      </div>
    );
  }

  // Cylinder — a body with curved top/bottom caps plus a rim line for the lid.
  return (
    <div className="relative h-full w-full">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <path
          d="M8,18 C8,10 92,10 92,18 L92,82 C92,90 8,90 8,82 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
        />
        <path
          d="M8,18 C8,26 92,26 92,18"
          fill="none"
          stroke={stroke}
          strokeWidth={2}
        />
      </svg>
      {HANDLES}
      <ShapeLabel label={label} textColor={textColor} />
    </div>
  );
}
