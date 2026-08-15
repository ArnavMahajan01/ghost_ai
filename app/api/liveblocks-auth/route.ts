import { currentUser } from "@clerk/nextjs/server";

import { getCursorColor, liveblocks } from "@/lib/liveblocks";
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access";

// The Liveblocks room ID is always the project's own ID — see
// context/progress-tracker.md's 07-wire-editor-home.md note on why no
// separate room-id field exists to keep in sync.
export async function POST(request: Request) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const roomId = typeof body?.room === "string" ? body.room : "";

  if (!roomId) {
    return Response.json({ error: "A room is required" }, { status: 400 });
  }

  const access = await checkProjectAccess(roomId, identity);

  if (!access) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Room is created lazily on first auth, not up front on project creation —
  // `getOrCreateRoom` is a no-op if it already exists. This route is the
  // only place a session token for the room is ever issued, and it already
  // gated on `checkProjectAccess` above, so the room's own Liveblocks
  // permissions can safely default to `room:write` for anyone holding a
  // token from this app, rather than maintaining a duplicate
  // `usersAccesses` allowlist that would need updating on every invite.
  await liveblocks.getOrCreateRoom(roomId, {
    defaultAccesses: ["room:write"],
  });

  const user = await currentUser();
  const name = user
    ? (user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "Anonymous")
    : "Anonymous";
  const avatar = user?.imageUrl ?? "";
  const color = getCursorColor(identity.userId);

  const { status, body: responseBody } = await liveblocks.identifyUser(
    { userId: identity.userId, groupIds: [] },
    { userInfo: { name, avatar, color } }
  );

  return new Response(responseBody, { status });
}
