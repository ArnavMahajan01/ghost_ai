"use client";

import { useEffect } from "react";
import type { Edge, Node, ReactFlowInstance } from "@xyflow/react";

const ZOOM_DURATION = 200;

/** True while the user is typing in an input, textarea, or any contenteditable element. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

interface UseKeyboardShortcutsOptions<NodeType extends Node, EdgeType extends Edge> {
  reactFlowInstance: ReactFlowInstance<NodeType, EdgeType>;
  onUndo: () => void;
  onRedo: () => void;
}

/**
 * Global keyboard shortcuts for canvas zoom and Liveblocks undo/redo:
 * `+`/`=` zoom in, `-` zoom out, `Cmd/Ctrl+Z` undo, `Cmd/Ctrl+Shift+Z` and
 * `Cmd/Ctrl+Y` redo. Skips all of the above while focus is inside an
 * editable field, so it never steals keystrokes from node/edge label
 * editing or any other text input.
 */
export function useKeyboardShortcuts<NodeType extends Node = Node, EdgeType extends Edge = Edge>({
  reactFlowInstance,
  onUndo,
  onRedo,
}: UseKeyboardShortcutsOptions<NodeType, EdgeType>) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;

      const isMod = event.metaKey || event.ctrlKey;

      if (isMod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
        return;
      }

      if (isMod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        onRedo();
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        reactFlowInstance.zoomIn({ duration: ZOOM_DURATION });
        return;
      }

      if (event.key === "-") {
        event.preventDefault();
        reactFlowInstance.zoomOut({ duration: ZOOM_DURATION });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reactFlowInstance, onUndo, onRedo]);
}
