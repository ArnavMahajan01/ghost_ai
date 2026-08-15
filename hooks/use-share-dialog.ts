"use client";

import { useCallback, useEffect, useState } from "react";

import type { CollaboratorSummary } from "@/types/collaborator";

const COPIED_FEEDBACK_MS = 2000;

export function useShareDialog(projectId: string, isOpen: boolean) {
  const [collaborators, setCollaborators] = useState<CollaboratorSummary[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadCollaborators = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`);
      if (!response.ok) throw new Error("Failed to load collaborators");
      const data = (await response.json()) as CollaboratorSummary[];
      setCollaborators(data);
    } catch {
      setCollaborators([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      // Fetching on open is the documented exception to "avoid effects for
      // data fetching" (react.dev/learn/you-might-not-need-an-effect) — the
      // dialog has no server-rendered initial data to hydrate from.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadCollaborators();
    } else {
      setEmail("");
      setInviteError(null);
      setCopied(false);
    }
  }, [isOpen, loadCollaborators]);

  async function invite() {
    if (!email.trim() || isInviting) return;
    setIsInviting(true);
    setInviteError(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/collaborators`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        }
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? "Couldn't invite that email");
      }
      setCollaborators(body as CollaboratorSummary[]);
      setEmail("");
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : "Couldn't invite that email"
      );
    } finally {
      setIsInviting(false);
    }
  }

  async function remove(collaboratorId: string) {
    setRemovingId(collaboratorId);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/collaborators/${collaboratorId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to remove collaborator");
      setCollaborators((prev) =>
        prev.filter((collaborator) => collaborator.id !== collaboratorId)
      );
    } catch {
      // Leave the row in place — the owner can retry the removal.
    } finally {
      setRemovingId(null);
    }
  }

  async function copyLink() {
    const link = `${window.location.origin}/editor/${projectId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Clipboard access denied/unavailable — nothing to fall back to.
    }
  }

  return {
    collaborators,
    isLoading,
    email,
    setEmail,
    isInviting,
    inviteError,
    removingId,
    copied,
    invite,
    remove,
    copyLink,
  };
}

export type UseShareDialogReturn = ReturnType<typeof useShareDialog>;
