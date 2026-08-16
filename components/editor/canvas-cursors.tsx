"use client";

import { useOthers } from "@liveblocks/react";
import { ViewportPortal } from "@xyflow/react";
import { MousePointer2 } from "lucide-react";

/**
 * Live cursors for every other room participant — rendered inside
 * `ViewportPortal` so each cursor's position stays in the same coordinate
 * system as nodes/edges (pans with the canvas, unaffected by zoom scale).
 * Never renders the current user's own cursor; `Canvas`'s own
 * `onPaneMouseMove`/`onPaneMouseLeave` are what broadcast it in the first
 * place, not this component.
 */
export function CanvasCursors() {
  const others = useOthers();

  return (
    <ViewportPortal>
      {others.map((other) => {
        const cursor = other.presence.cursor;
        if (!cursor) return null;

        const color = other.info?.color ?? "#888888";
        const name = other.info?.name ?? "Anonymous";

        return (
          <div
            key={other.connectionId}
            className="pointer-events-none absolute top-0 left-0 z-30 flex items-start"
            style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
          >
            <MousePointer2
              className="h-4 w-4 -translate-x-0.5 -translate-y-0.5"
              style={{ color, fill: color }}
            />
            <span
              className="ml-3 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
              style={{ backgroundColor: color }}
            >
              {name}
            </span>
          </div>
        );
      })}
    </ViewportPortal>
  );
}
