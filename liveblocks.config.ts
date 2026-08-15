// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      cursor: { x: number; y: number } | null;
      isThinking: boolean;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- unused until Storage is speced
    Storage: {
      // Example, a conflict-free list
      // animals: LiveList<string>;
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
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- unused until RoomEvents are speced
    RoomEvent: {};
    // Example has two events, using a union
    // | { type: "PLAY" }
    // | { type: "REACTION"; emoji: "🔥" };

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
