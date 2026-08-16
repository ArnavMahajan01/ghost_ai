"use client";

import { MiniMap, Panel } from "@xyflow/react";
import { Map as MapIcon, Minus } from "lucide-react";
import { useState } from "react";

/**
 * The minimap, wrapped in a minimize/reopen toggle. Rendered as a single
 * `Panel` (bottom-right, same spot the bare `MiniMap` used to sit) so open
 * and minimized states occupy the same corner rather than jumping around;
 * `MiniMap`'s own `style` overrides its internal `Panel` to `position:
 * static` so it lays out as a normal block inside ours instead of stacking
 * two independently-positioned panels on top of each other.
 */
export function CanvasMinimap() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Panel position="bottom-right">
      {isOpen ? (
        <div className="relative rounded-lg border border-surface-border bg-surface/90 p-1 shadow-lg backdrop-blur-sm">
          <MiniMap style={{ position: "static", width: 180, height: 120 }} />
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Minimize minimap"
            title="Minimize minimap"
            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border border-surface-border bg-surface text-copy-secondary shadow transition-colors hover:bg-elevated hover:text-copy-primary"
          >
            <Minus className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Show minimap"
          title="Show minimap"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-surface/90 text-copy-secondary shadow-lg backdrop-blur-sm transition-colors hover:bg-elevated hover:text-copy-primary"
        >
          <MapIcon className="h-4 w-4" />
        </button>
      )}
    </Panel>
  );
}
