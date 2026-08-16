"use client";

import { useEffect, useRef, useState } from "react";
import type { EdgeChange, FitViewOptions, NodeChange } from "@xyflow/react";

import type { CanvasEdge, CanvasNode, CanvasSnapshot } from "@/types/canvas";

interface UseCanvasLoadOptions {
  projectId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<CanvasEdge>[]) => void;
  /**
   * Called once, only when this hook actually surfaces content (an
   * already-populated room, or a freshly-loaded saved canvas) — deliberately
   * not React Flow's own `fitView` prop, which re-fires on the *next* nodes
   * transition too (including a user's own first drop onto a genuinely
   * empty canvas), causing an unwanted auto-zoom on drop. See
   * `context/current-issues.md` #5.
   */
  fitView: (options?: FitViewOptions<CanvasNode>) => void;
}

/**
 * On mount, loads the project's saved canvas from
 * `GET /api/projects/[projectId]/canvas` — but only if the Liveblocks room
 * is empty. If the room already has nodes or edges (active collaboration,
 * or a load that already happened for another connected client), the saved
 * blob is never fetched, so it can't overwrite what's already there.
 */
export function useCanvasLoad({
  projectId,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  fitView,
}: UseCanvasLoadOptions): { isLoadComplete: boolean } {
  const [isLoadComplete, setIsLoadComplete] = useState(false);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    if (nodes.length > 0 || edges.length > 0) {
      // A room that already has content (active collaboration, or another
      // client's load already ran) — same one-time initialization category
      // as `use-share-dialog.ts`'s open-triggered fetch, which is React's
      // own documented exception for effects synchronizing from an
      // external system (Liveblocks storage) on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoadComplete(true);
      fitView({ duration: 300 });
      return;
    }

    // No unmount-cancellation flag here on purpose: `hasRunRef` already
    // guarantees this fetch only ever starts once for the component's
    // whole lifetime, and a `cancelled`-via-cleanup flag would actively
    // break that guarantee under StrictMode's dev-only double-invoke —
    // the *fake* first cleanup would poison the one fetch that's actually
    // still in flight, since the ref survives the fake unmount but a
    // freshly-scoped `cancelled` variable can't be un-set by the second,
    // real invocation. Setting state after a genuine unmount is a no-op
    // in modern React, not an error.
    fetch(`/api/projects/${projectId}/canvas`)
      .then((response) => (response.ok ? response.json() : null))
      .then((snapshot: CanvasSnapshot | null) => {
        if (!snapshot) return;

        let loadedSomething = false;
        if (snapshot.nodes.length > 0) {
          onNodesChange(snapshot.nodes.map((item) => ({ type: "add" as const, item })));
          loadedSomething = true;
        }
        if (snapshot.edges.length > 0) {
          onEdgesChange(snapshot.edges.map((item) => ({ type: "add" as const, item })));
          loadedSomething = true;
        }
        // Fit to the loaded canvas once — never fires again later, so it
        // can't confuse a subsequent user-initiated drop with a "canvas
        // just loaded" event.
        if (loadedSomething) fitView({ duration: 300 });
      })
      .catch(() => {})
      .finally(() => setIsLoadComplete(true));
  }, [projectId, nodes, edges, onNodesChange, onEdgesChange, fitView]);

  return { isLoadComplete };
}
