"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { useCallback, useState, type KeyboardEvent } from "react";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

/** Dimmed at rest, brightened on hover/selection — a "light stroke" per spec. */
const EDGE_STROKE = "rgba(225, 225, 235, 0.45)";
const EDGE_STROKE_ACTIVE = "rgba(240, 240, 245, 0.95)";

interface EdgeLabelEditorProps {
  initialValue: string;
  onSave: (value: string) => void;
}

/** Input that grows with its content, shown directly over the label while editing. */
function EdgeLabelEditor({ initialValue, onSave }: EdgeLabelEditorProps) {
  const [draft, setDraft] = useState(initialValue);

  const commit = useCallback(() => onSave(draft), [draft, onSave]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "Escape") {
      event.currentTarget.blur();
    }
  }, []);

  return (
    <input
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
      size={Math.max(draft.length, 1)}
      className="nodrag nopan rounded-full border border-surface-border bg-surface px-2 py-0.5 text-center text-xs text-copy-primary outline-none"
    />
  );
}

/**
 * Renderer for the `canvasEdge` type — right-angle (smooth-step) routing,
 * dimmed at rest and brightened on hover/selection, with an inline label
 * editable by double-clicking the edge or its label badge. Positions the
 * label with `EdgeLabelRenderer` using the midpoint `getSmoothStepPath`
 * itself returns, per the spec (no manual midpoint math).
 */
export function CanvasEdgeRenderer({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<CanvasEdge>) {
  const { updateEdgeData } = useReactFlow<CanvasNode, CanvasEdge>();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isActive = selected || isHovered;
  const label = data?.label ?? "";

  const startEditing = useCallback((event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    setIsEditing(true);
  }, []);

  const saveLabel = useCallback(
    (value: string) => {
      updateEdgeData(id, { label: value });
      setIsEditing(false);
    },
    [id, updateEdgeData]
  );

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={24}
        style={{
          stroke: isActive ? EDGE_STROKE_ACTIVE : EDGE_STROKE,
          strokeWidth: 1.5,
          strokeLinecap: "round",
          transition: "stroke 150ms ease",
        }}
      />
      {/* Wider invisible path purely to catch hover/double-click without
          thickening the visible line — BaseEdge's own interaction path has
          no exposed event handlers. */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="nodrag nopan"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={startEditing}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onDoubleClick={startEditing}
        >
          {isEditing ? (
            <EdgeLabelEditor initialValue={label} onSave={saveLabel} />
          ) : label ? (
            <span className="rounded-full border border-surface-border bg-surface/90 px-2 py-0.5 text-xs text-copy-secondary shadow-sm">
              {label}
            </span>
          ) : isActive ? (
            <span className="rounded-full border border-dashed border-surface-border/60 px-2 py-0.5 text-xs italic text-copy-muted/70">
              Double-click to add a label
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
