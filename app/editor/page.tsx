"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ProjectDialogs } from "@/components/projects/project-dialogs";
import { Button } from "@/components/ui/button";
import { useProjectDialogs } from "@/hooks/use-project-dialogs";

export default function EditorPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const projectDialogs = useProjectDialogs();

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
          projects={projectDialogs.projects}
          onCreateProject={projectDialogs.openCreate}
          onRenameProject={projectDialogs.openRename}
          onDeleteProject={projectDialogs.openDelete}
        />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-medium text-copy-primary">
              Create a project or open an existing one
            </h1>
            <p className="text-sm text-copy-muted">
              Start a new architecture workspace, or choose a project from the
              sidebar.
            </p>
          </div>
          <Button
            className="gap-2"
            onClick={projectDialogs.openCreate}
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </main>
      </div>

      <ProjectDialogs state={projectDialogs} />
    </div>
  );
}
