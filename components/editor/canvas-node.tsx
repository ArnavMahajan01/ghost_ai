"use client";

import {
  Handle,
  NodeResizer,
  Position,
  useReactFlow,
  type NodeProps,
} from "@xyflow/react";
import { useCallback, useState, type KeyboardEvent, type MouseEvent } from "react";

import {
  DEFAULT_NODE_COLOR,
  MIN_NODE_HEIGHT,
  MIN_NODE_WIDTH,
  NODE_COLORS,
} from "@/types/canvas";
import type { CanvasEdge, CanvasNode, NodeShape } from "@/types/canvas";

const HANDLES = (
  <>
    <Handle id="top-target" type="target" position={Position.Top} />
    <Handle id="right-source" type="source" position={Position.Right} />
    <Handle id="bottom-target" type="target" position={Position.Bottom} />
    <Handle id="left-source" type="source" position={Position.Left} />
  </>
);

/**
 * Shapes simple enough to draw with CSS border-radius, no SVG needed.
 * Exported so `lib/canvas.ts` can draw the same shapes for the drag preview
 * without duplicating the geometry.
 */
export const CSS_SHAPE_RADIUS: Partial<Record<NodeShape, string>> = {
  rectangle: "0.375rem", // rounded-md
  circle: "9999px",
  pill: "9999px",
};

/** `points` for the shapes drawn as an SVG polygon, in a 0–100 viewBox. */
export const POLYGON_POINTS: Partial<Record<NodeShape, string>> = {
  diamond: "50,0 100,50 50,100 0,50",
  hexagon: "25,0 75,0 100,50 75,100 25,100 0,50",
};

/** `d` attributes for the cylinder's body + lid-rim SVG paths. */
export const CYLINDER_BODY_PATH =
  "M8,18 C8,10 92,10 92,18 L92,82 C92,90 8,90 8,82 Z";
export const CYLINDER_RIM_PATH = "M8,18 C8,26 92,26 92,18";

/** Subtle, dark-canvas-appropriate styling for the resize handles/lines. */
const RESIZE_HANDLE_STYLE = {
  width: 8,
  height: 8,
  borderRadius: 2,
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-copy-secondary)",
};
const RESIZE_LINE_STYLE = {
  borderColor: "var(--color-copy-secondary)",
  opacity: 0.5,
};

interface ShapeLabelProps {
  label: string;
  textColor: string;
}

/** Read-only label display — also stands in as centered placeholder text when empty. */
function ShapeLabel({ label, textColor }: ShapeLabelProps) {
  const isEmpty = label.trim().length === 0;
  return (
    <span
      className={`truncate text-sm ${isEmpty ? "italic opacity-50" : ""}`}
      style={{ color: textColor }}
    >
      {isEmpty ? "Double-click to add a label" : label}
    </span>
  );
}

interface LabelEditorProps {
  value: string;
  textColor: string;
  onChange: (value: string) => void;
  onDone: () => void;
}

/** Textarea shown directly over the label while editing. */
function LabelEditor({ value, textColor, onChange, onDone }: LabelEditorProps) {
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.currentTarget.blur();
    }
  }, []);

  return (
    <textarea
      autoFocus
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={(event) => {
        const end = event.currentTarget.value.length;
        event.currentTarget.setSelectionRange(end, end);
      }}
      onBlur={onDone}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
      rows={1}
      className="nodrag nopan max-h-full w-full resize-none border-none bg-transparent text-center text-sm outline-none"
      style={{ color: textColor }}
    />
  );
}

/**
 * Renderer for the `canvasNode` type. Rectangle/circle/pill are plain
 * bordered divs (border-radius alone draws them); diamond/hexagon/cylinder
 * are drawn as inline SVG per `context/ui-context.md` ("complex shapes are
 * rendered as inline SVGs rather than CSS borders"). Selected nodes show
 * resize handles, and double-clicking the label area opens inline editing.
 */
export function CanvasNodeRenderer({ id, data, selected }: NodeProps<CanvasNode>) {
  const { updateNodeData } = useReactFlow<CanvasNode, CanvasEdge>();
  const [isEditing, setIsEditing] = useState(false);

  const fill = data.color || DEFAULT_NODE_COLOR.fill;
  const textColor =
    NODE_COLORS.find((c) => c.fill === fill)?.text ?? DEFAULT_NODE_COLOR.text;
  const stroke = selected ? "#FFFFFF" : "rgba(255, 255, 255, 0.12)";
  const label = data.label;

  const startEditing = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      setIsEditing(true);
    },
    []
  );

  const stopEditing = useCallback(() => setIsEditing(false), []);

  const handleLabelChange = useCallback(
    (value: string) => updateNodeData(id, { label: value }),
    [id, updateNodeData]
  );

  const resizer = (
    <NodeResizer
      nodeId={id}
      isVisible={selected}
      minWidth={MIN_NODE_WIDTH}
      minHeight={MIN_NODE_HEIGHT}
      handleStyle={RESIZE_HANDLE_STYLE}
      lineStyle={RESIZE_LINE_STYLE}
    />
  );

  const labelOverlay = (
    <div
      className="absolute inset-0 flex items-center justify-center px-4 text-center"
      onDoubleClick={startEditing}
    >
      {isEditing ? (
        <LabelEditor
          value={label}
          textColor={textColor}
          onChange={handleLabelChange}
          onDone={stopEditing}
        />
      ) : (
        <ShapeLabel label={label} textColor={textColor} />
      )}
    </div>
  );

  const radius = CSS_SHAPE_RADIUS[data.shape];
  if (radius) {
    return (
      <div
        className="relative h-full w-full border"
        style={{ backgroundColor: fill, borderColor: stroke, borderRadius: radius }}
      >
        {resizer}
        {HANDLES}
        {labelOverlay}
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
        {resizer}
        {HANDLES}
        {labelOverlay}
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
          d={CYLINDER_BODY_PATH}
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
        />
        <path
          d={CYLINDER_RIM_PATH}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
        />
      </svg>
      {resizer}
      {HANDLES}
      {labelOverlay}
    </div>
  );
}
