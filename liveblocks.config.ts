import type { LiveblocksFlow } from "@liveblocks/react-flow";

import type { CanvasEdge, CanvasNode } from "./types/canvas";

// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      cursor: { x: number; y: number } | null;
      thinking: boolean;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    // `flow` is managed by `useLiveblocksFlow` (`@liveblocks/react-flow`,
    // default `storageKey: "flow"` — see `components/editor/canvas.tsx`) and
    // read/written directly by `trigger/design-agent.ts` via
    // `liveblocks.mutateStorage`, so both sides share one typed tree.
    Storage: {
      flow: LiveblocksFlow<CanvasNode, CanvasEdge>;
    };

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener
    // Published by `trigger/design-agent.ts` (via `liveblocks.broadcastEvent`)
    // as a shared status feed for the AI design agent's progress.
    RoomEvent:
      | {
          type: "ai-status";
          status: "started" | "thinking" | "generating" | "complete" | "error";
          message: string;
        };

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- unused until ThreadMetadata is speced
    ThreadMetadata: {
      // Example, attaching coordinates to a thread
      // x: number;
      // y: number;
    };

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- unused until RoomInfo is speced
    RoomInfo: {
      // Example, rooms with a title and url
      // title: string;
      // url: string;
    };
  }
}

export {};
