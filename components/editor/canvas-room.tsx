"use client";

import { LiveMap, LiveObject } from "@liveblocks/client";
import { ClientSideSuspense, LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense";
import { ReactFlowProvider } from "@xyflow/react";
import { Loader2 } from "lucide-react";

import { Canvas } from "@/components/editor/canvas";
import { CanvasErrorBoundary } from "@/components/editor/canvas-error-boundary";
import type { SaveStatus } from "@/hooks/use-canvas-autosave";

interface CanvasRoomProps {
  roomId: string;
  isTemplatesModalOpen: boolean;
  onTemplatesModalOpenChange: (open: boolean) => void;
  onAutosaveStateChange: (state: { status: SaveStatus; saveNow: () => void }) => void;
}

function CanvasLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-base">
      <Loader2 className="h-6 w-6 animate-spin text-copy-muted" />
      <p className="text-sm text-copy-muted">Loading canvas…</p>
    </div>
  );
}

/**
 * Sets up the Liveblocks room for the project's canvas — auth, the room
 * connection, and the loading/error states around the realtime-synced
 * `Canvas` itself. The workspace page stays server-side; this is the client
 * boundary where the Liveblocks connection actually opens.
 */
export function CanvasRoom({
  roomId,
  isTemplatesModalOpen,
  onTemplatesModalOpenChange,
  onAutosaveStateChange,
}: CanvasRoomProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, thinking: false }}
        initialStorage={{ flow: new LiveObject({ nodes: new LiveMap(), edges: new LiveMap() }) }}
      >
        <CanvasErrorBoundary>
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <ReactFlowProvider>
              <Canvas
                projectId={roomId}
                isTemplatesModalOpen={isTemplatesModalOpen}
                onTemplatesModalOpenChange={onTemplatesModalOpenChange}
                onAutosaveStateChange={onAutosaveStateChange}
              />
            </ReactFlowProvider>
          </ClientSideSuspense>
        </CanvasErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
