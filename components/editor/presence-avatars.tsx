"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useOthers } from "@liveblocks/react";
import { useMemo } from "react";

const MAX_VISIBLE_AVATARS = 5;
/** Keeps collaborator avatars and the Clerk `UserButton` visually the same size. */
const AVATAR_SIZE_CLASS = "h-8 w-8";

interface CollaboratorAvatarProps {
  name: string;
  avatarUrl: string;
}

/** Display-only avatar — profile photo when available, initials otherwise. */
function CollaboratorAvatar({ name, avatarUrl }: CollaboratorAvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      title={name}
      className={`relative ${AVATAR_SIZE_CLASS} shrink-0 overflow-hidden rounded-full ring-2 ring-surface`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Clerk-hosted avatar URL, same pattern as share-dialog.tsx
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-accent-dim text-xs font-medium text-brand">
          {initial}
        </div>
      )}
    </div>
  );
}

/**
 * Floating avatar group for the top-right corner of the canvas view —
 * collaborator avatars (from Liveblocks presence, excluding the current
 * user) plus the existing Clerk `UserButton` for the current user. Rendered
 * only inside `Canvas`, so it never shows up on the editor home navbar,
 * which stays untouched.
 */
export function PresenceAvatars() {
  const { user } = useUser();
  const others = useOthers();

  // `useOthers()` already excludes the current connection, but not other
  // connections/tabs *of* the current user (e.g. the same project open in
  // two tabs) — the current Clerk user id is the one identity we actually
  // want excluded, regardless of connection.
  const collaborators = useMemo(
    () => others.filter((other) => other.id !== user?.id),
    [others, user?.id]
  );

  const visible = collaborators.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = collaborators.length - visible.length;

  return (
    <div className="absolute top-4 right-4 z-20 flex items-center gap-2 rounded-full border border-surface-border bg-surface/90 p-1 shadow-lg backdrop-blur-sm">
      {collaborators.length > 0 ? (
        <>
          <div className="flex -space-x-2">
            {visible.map((other) => (
              <CollaboratorAvatar
                key={other.connectionId}
                name={other.info?.name ?? "Anonymous"}
                avatarUrl={other.info?.avatar ?? ""}
              />
            ))}
            {overflowCount > 0 ? (
              <div
                className={`flex ${AVATAR_SIZE_CLASS} shrink-0 items-center justify-center rounded-full bg-elevated text-xs font-medium text-copy-secondary ring-2 ring-surface`}
              >
                +{overflowCount}
              </div>
            ) : null}
          </div>
          <div className="h-5 w-px shrink-0 bg-surface-border" />
        </>
      ) : null}
      <UserButton
        appearance={{ elements: { userButtonAvatarBox: AVATAR_SIZE_CLASS } }}
      />
    </div>
  );
}
