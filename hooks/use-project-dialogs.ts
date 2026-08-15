"use client";

import { useMemo, useState } from "react";

import { MOCK_PROJECTS } from "@/lib/mock-projects";
import { slugify } from "@/lib/slug";
import type { Project } from "@/types/project";

type DialogState =
  | { type: "create" }
  | { type: "rename"; project: Project }
  | { type: "delete"; project: Project }
  | null;

const MOCK_DELAY_MS = 400;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useProjectDialogs() {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const slugPreview = useMemo(() => slugify(name), [name]);

  function openCreate() {
    setName("");
    setDialog({ type: "create" });
  }

  function openRename(project: Project) {
    setName(project.name);
    setDialog({ type: "rename", project });
  }

  function openDelete(project: Project) {
    setDialog({ type: "delete", project });
  }

  function close() {
    if (isLoading) return;
    setDialog(null);
    setName("");
  }

  async function submitCreate() {
    const slug = slugify(name);
    if (!name.trim() || !slug) return;
    setIsLoading(true);
    await wait(MOCK_DELAY_MS);
    setProjects((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        slug,
        role: "owner",
      },
    ]);
    setIsLoading(false);
    setDialog(null);
    setName("");
  }

  async function submitRename() {
    if (dialog?.type !== "rename") return;
    const slug = slugify(name);
    if (!name.trim() || !slug) return;
    const { project } = dialog;
    setIsLoading(true);
    await wait(MOCK_DELAY_MS);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id ? { ...p, name: name.trim(), slug } : p
      )
    );
    setIsLoading(false);
    setDialog(null);
    setName("");
  }

  async function submitDelete() {
    if (dialog?.type !== "delete") return;
    const { project } = dialog;
    setIsLoading(true);
    await wait(MOCK_DELAY_MS);
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    setIsLoading(false);
    setDialog(null);
  }

  return {
    projects,
    dialog,
    name,
    setName,
    slugPreview,
    isLoading,
    openCreate,
    openRename,
    openDelete,
    close,
    submitCreate,
    submitRename,
    submitDelete,
  };
}

export type UseProjectDialogsReturn = ReturnType<typeof useProjectDialogs>;
