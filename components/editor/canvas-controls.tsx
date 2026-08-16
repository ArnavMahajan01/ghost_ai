"use client";

import { useReactFlow } from "@xyflow/react";
import { Maximize, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, type ComponentType } from "react";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

const ZOOM_DURATION = 250;

interface ControlButtonProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function ControlButton({ icon: Icon, label, onClick, disabled }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

interface CanvasControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

/**
 * Floating pill-shaped control bar, bottom-left of the canvas — zoom
 * controls wired straight to the `ReactFlow` instance, and undo/redo wired
 * to Liveblocks history (passed in as props so this stays a dumb view;
 * `Canvas` also feeds the same undo/redo handlers to `useKeyboardShortcuts`).
 */
export function CanvasControls({ canUndo, canRedo, onUndo, onRedo }: CanvasControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow<CanvasNode, CanvasEdge>();

  const handleZoomIn = useCallback(
    () => zoomIn({ duration: ZOOM_DURATION }),
    [zoomIn]
  );
  const handleZoomOut = useCallback(
    () => zoomOut({ duration: ZOOM_DURATION }),
    [zoomOut]
  );
  const handleFitView = useCallback(
    () => fitView({ duration: ZOOM_DURATION }),
    [fitView]
  );

  return (
    <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 rounded-full border border-surface-border bg-surface/90 p-1.5 shadow-lg backdrop-blur-sm">
      <ControlButton icon={ZoomOut} label="Zoom out" onClick={handleZoomOut} />
      <ControlButton icon={Maximize} label="Fit view" onClick={handleFitView} />
      <ControlButton icon={ZoomIn} label="Zoom in" onClick={handleZoomIn} />
      <div className="mx-1 h-5 w-px bg-surface-border" />
      <ControlButton icon={Undo2} label="Undo" onClick={onUndo} disabled={!canUndo} />
      <ControlButton icon={Redo2} label="Redo" onClick={onRedo} disabled={!canRedo} />
    </div>
  );
}
