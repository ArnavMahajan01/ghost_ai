"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ProjectDialogs } from "@/components/projects/project-dialogs";
import { Button } from "@/components/ui/button";
import { useProjectActions } from "@/hooks/use-project-actions";
import type { ProjectSummary } from "@/types/project";

interface EditorShellProps {
  ownedProjects: ProjectSummary[];
  sharedProjects: ProjectSummary[];
  /** The project currently open, if this is a workspace page rather than the editor home. */
  activeProject?: ProjectSummary;
}

export function EditorShell({
  ownedProjects,
  sharedProjects,
  activeProject,
}: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const actions = useProjectActions({ activeProjectId: activeProject?.id });

  return (
    <div className="flex flex-1 flex-col">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />
      <div className="relative flex flex-1 overflow-hidden">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          ownedProjects={ownedProjects}
          sharedProjects={sharedProjects}
          onCreateProject={actions.openCreate}
          onRenameProject={actions.openRename}
          onDeleteProject={actions.openDelete}
        />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          {activeProject ? (
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-medium text-copy-primary">
                {activeProject.name}
              </h1>
              <p className="text-sm text-copy-muted">
                The canvas workspace isn&apos;t built yet — this is a
                placeholder.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <h1 className="text-xl font-medium text-copy-primary">
                  Create a project or open an existing one
                </h1>
                <p className="text-sm text-copy-muted">
                  Start a new architecture workspace, or choose a project
                  from the sidebar.
                </p>
              </div>
              <Button className="gap-2" onClick={actions.openCreate}>
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </>
          )}
        </main>
      </div>

      <ProjectDialogs state={actions} />
    </div>
  );
}
