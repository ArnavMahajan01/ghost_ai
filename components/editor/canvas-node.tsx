"use client";

import {
  Handle,
  NodeResizer,
  NodeToolbar,
  Position,
  useReactFlow,
  type NodeProps,
} from "@xyflow/react";
import { useCallback, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";

import { cn } from "@/lib/utils";
import {
  DEFAULT_NODE_COLOR,
  MIN_NODE_HEIGHT,
  MIN_NODE_WIDTH,
  NODE_COLORS,
} from "@/types/canvas";
import type { CanvasEdge, CanvasNode, NodeShape } from "@/types/canvas";

/** Small white dot with a dark border — hidden until the node is hovered. */
const CONNECTION_HANDLE_STYLE: CSSProperties = {
  width: 8,
  height: 8,
  backgroundColor: "#FFFFFF",
  border: "1px solid rgba(10, 10, 12, 0.85)",
};
const CONNECTION_HANDLE_CLASS =
  "opacity-0 transition-opacity duration-150 group-hover:opacity-100";

/**
 * All four handles are declared `type="source"`, not alternating
 * source/target by position. `@xyflow/system`'s `getEdgePosition` always
 * resolves an edge's *source* endpoint from a node's `source`-typed handle
 * bounds only — even in `ConnectionMode.Loose`, which only relaxes the
 * *target* side (matching a source- or target-typed handle there). So a
 * `target`-typed handle can never start a connection under any mode; with
 * every position typed `source`, Loose mode's lenient target-side lookup
 * (source or target handles both accepted) still lets any of these serve as
 * a drop target too — the combination that actually makes every handle
 * usable as both a connection start and end point, per spec.
 */
const HANDLES = (
  <>
    <Handle
      id="top"
      type="source"
      position={Position.Top}
      className={CONNECTION_HANDLE_CLASS}
      style={CONNECTION_HANDLE_STYLE}
    />
    <Handle
      id="right"
      type="source"
      position={Position.Right}
      className={CONNECTION_HANDLE_CLASS}
      style={CONNECTION_HANDLE_STYLE}
    />
    <Handle
      id="bottom"
      type="source"
      position={Position.Bottom}
      className={CONNECTION_HANDLE_CLASS}
      style={CONNECTION_HANDLE_STYLE}
    />
    <Handle
      id="left"
      type="source"
      position={Position.Left}
      className={CONNECTION_HANDLE_CLASS}
      style={CONNECTION_HANDLE_STYLE}
    />
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

interface ColorToolbarProps {
  nodeId: string;
  activeFill: string;
  onSelect: (fill: string) => void;
}

/**
 * Floating toolbar shown above a selected node — one swatch per
 * `NODE_COLORS` pair. `NodeToolbar` already only renders when its node is
 * selected and positions itself above the node without overlapping it, so
 * no visibility/positioning logic needed here beyond that default.
 */
function ColorToolbar({ nodeId, activeFill, onSelect }: ColorToolbarProps) {
  return (
    <NodeToolbar
      nodeId={nodeId}
      className="nodrag nopan flex items-center gap-1 rounded-full border border-surface-border bg-surface/90 p-1.5 shadow-lg backdrop-blur-sm"
    >
      {NODE_COLORS.map((color) => {
        const isActive = color.fill === activeFill;
        return (
          <button
            key={color.fill}
            type="button"
            onClick={() => onSelect(color.fill)}
            aria-label={`Set node color to ${color.text}`}
            aria-pressed={isActive}
            className={cn(
              "h-5 w-5 shrink-0 rounded-full transition-shadow duration-150 hover:shadow-[0_0_6px_0px_var(--glow-color)]",
              isActive ? "border-2 border-copy-primary" : "border border-white/10"
            )}
            style={
              {
                backgroundColor: color.fill,
                "--glow-color": color.text,
              } as CSSProperties
            }
          />
        );
      })}
    </NodeToolbar>
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

  const colorToolbar = (
    <ColorToolbar
      nodeId={id}
      activeFill={fill}
      onSelect={(color) => updateNodeData(id, { color })}
    />
  );

  const labelOverlay = (
    // Inset off the node's edges (not flush `inset-0`) so this catches
    // double-clicks over the label without sitting on top of the
    // connection handles, which are centered right on the border.
    <div
      className="absolute inset-2 flex items-center justify-center px-4 text-center"
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
        className="group relative h-full w-full border"
        style={{ backgroundColor: fill, borderColor: stroke, borderRadius: radius }}
      >
        {resizer}
        {colorToolbar}
        {HANDLES}
        {labelOverlay}
      </div>
    );
  }

  const points = POLYGON_POINTS[data.shape];
  if (points) {
    return (
      <div className="group relative h-full w-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <polygon points={points} fill={fill} stroke={stroke} strokeWidth={2} />
        </svg>
        {resizer}
        {colorToolbar}
        {HANDLES}
        {labelOverlay}
      </div>
    );
  }

  // Cylinder — a body with curved top/bottom caps plus a rim line for the lid.
  return (
    <div className="group relative h-full w-full">
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
      {colorToolbar}
      {HANDLES}
      {labelOverlay}
    </div>
  );
}
