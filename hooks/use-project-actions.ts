"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { slugify } from "@/lib/slug";
import type { ProjectSummary } from "@/types/project";

type DialogState =
  | { type: "create" }
  | { type: "rename"; project: ProjectSummary }
  | { type: "delete"; project: ProjectSummary }
  | null;

function createRoomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

interface UseProjectActionsOptions {
  /** The project currently being viewed, if any — used to redirect away on delete. */
  activeProjectId?: string;
}

export function useProjectActions({
  activeProjectId,
}: UseProjectActionsOptions = {}) {
  const router = useRouter();

  const [dialog, setDialog] = useState<DialogState>(null);
  const [name, setName] = useState("");
  const [roomSuffix, setRoomSuffix] = useState(createRoomSuffix);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roomIdPreview = useMemo(() => {
    const slug = slugify(name);
    return slug ? `${slug}-${roomSuffix}` : "";
  }, [name, roomSuffix]);

  function openCreate() {
    setName("");
    setRoomSuffix(createRoomSuffix());
    setError(null);
    setDialog({ type: "create" });
  }

  function openRename(project: ProjectSummary) {
    setName(project.name);
    setError(null);
    setDialog({ type: "rename", project });
  }

  function openDelete(project: ProjectSummary) {
    setError(null);
    setDialog({ type: "delete", project });
  }

  function close() {
    if (isLoading) return;
    setDialog(null);
    setName("");
    setError(null);
  }

  async function submitCreate() {
    if (!name.trim() || !roomIdPreview) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!response.ok) throw new Error("Failed to create project");
      const project = (await response.json()) as { id: string };

      // The project ID Prisma generated is what the workspace navigates to —
      // there's no separate room ID to reconcile, so it and the (future)
      // Liveblocks room stay aligned by construction.
      setDialog(null);
      setName("");
      router.push(`/editor/${project.id}`);
    } catch {
      setError("Couldn't create the project. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function submitRename() {
    if (dialog?.type !== "rename" || !name.trim()) return;
    const { project } = dialog;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!response.ok) throw new Error("Failed to rename project");
      setDialog(null);
      setName("");
      router.refresh();
    } catch {
      setError("Couldn't rename the project. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function submitDelete() {
    if (dialog?.type !== "delete") return;
    const { project } = dialog;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete project");
      setDialog(null);
      if (project.id === activeProjectId) {
        router.push("/editor");
      } else {
        router.refresh();
      }
    } catch {
      setError("Couldn't delete the project. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return {
    dialog,
    name,
    setName,
    roomIdPreview,
    isLoading,
    error,
    openCreate,
    openRename,
    openDelete,
    close,
    submitCreate,
    submitRename,
    submitDelete,
  };
}

export type UseProjectActionsReturn = ReturnType<typeof useProjectActions>;
