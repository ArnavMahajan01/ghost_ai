"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CanvasEdge, CanvasNode, CanvasSnapshot } from "@/types/canvas";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DEBOUNCE_MS = 1500;

interface UseCanvasAutosaveOptions {
  projectId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  /** Gate autosave on the initial load check having finished — see `useCanvasLoad`; without this, a save could fire before a saved canvas has even been loaded in, wiping it with an empty one. */
  enabled: boolean;
}

interface UseCanvasAutosaveResult {
  status: SaveStatus;
  /** Saves immediately, bypassing the debounce — wired to the navbar's manual Save button. */
  saveNow: () => void;
}

/** Debounces canvas saves through `PUT /api/projects/[projectId]/canvas`, tracking save status. */
export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  enabled,
}: UseCanvasAutosaveOptions): UseCanvasAutosaveResult {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstEnabledRunRef = useRef(true);

  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const snapshot: CanvasSnapshot = { nodes, edges };
    setStatus("saving");

    fetch(`/api/projects/${projectId}/canvas`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Save failed with status ${response.status}`);
        setStatus("saved");
      })
      .catch(() => setStatus("error"));
  }, [projectId, nodes, edges]);

  useEffect(() => {
    if (!enabled) return;

    // The first render after autosave is enabled coincides with whatever
    // `useCanvasLoad` just settled on (either a freshly-loaded canvas or an
    // already-active room) — skip it so mounting doesn't immediately queue
    // a redundant save of state that's already correct.
    if (isFirstEnabledRunRef.current) {
      isFirstEnabledRunRef.current = false;
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(saveNow, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [nodes, edges, enabled, saveNow]);

  return { status, saveNow };
}
