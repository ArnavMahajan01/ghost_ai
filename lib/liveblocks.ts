import { Liveblocks } from "@liveblocks/node";

// Fixed palette for deterministically-assigned cursor colors — kept in sync
// visually with the app's existing accent tokens (see context/ui-context.md)
// but expressed as literal hex values since Liveblocks sessions are issued
// server-side, outside of Tailwind/CSS custom property scope.
const CURSOR_COLOR_PALETTE = [
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#EF4444", // red
] as const;

/**
 * Deterministically maps a user ID to a consistent color from a fixed
 * palette, so the same user always gets the same cursor color across
 * sessions and rooms.
 */
export function getCursorColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0; // force 32-bit int
  }
  const index = Math.abs(hash) % CURSOR_COLOR_PALETTE.length;
  return CURSOR_COLOR_PALETTE[index];
}

const globalForLiveblocks = globalThis as unknown as {
  liveblocks?: Liveblocks;
};

function createLiveblocksClient(): Liveblocks {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not set");
  }

  return new Liveblocks({ secret });
}

/**
 * Cached Liveblocks node client — reused across hot reloads in dev so we
 * don't spin up a new client on every edit, mirroring the `lib/prisma.ts`
 * singleton pattern.
 */
export const liveblocks =
  globalForLiveblocks.liveblocks ?? createLiveblocksClient();

if (process.env.NODE_ENV !== "production") {
  globalForLiveblocks.liveblocks = liveblocks;
}
