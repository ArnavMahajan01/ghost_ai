"use client";

import { MoreVertical, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onCreateProject: () => void;
  onRenameProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
}

export function ProjectSidebar({
  isOpen,
  onClose,
  projects,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  const ownedProjects = projects.filter((project) => project.role === "owner");
  const sharedProjects = projects.filter(
    (project) => project.role === "collaborator"
  );

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-black/50 transition-opacity duration-200 lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        aria-hidden={!isOpen}
        className={cn(
          "absolute top-0 left-0 z-40 flex h-full w-72 flex-col border-r border-surface-border bg-surface/95 backdrop-blur-sm transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-surface-border px-4">
          <h2 className="text-sm font-medium text-copy-primary">Project</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close sidebar"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="my-projects" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-4 mt-3">
            <TabsTrigger value="my-projects">My Projects</TabsTrigger>
            <TabsTrigger value="shared">Shared</TabsTrigger>
          </TabsList>

          <TabsContent value="my-projects" className="flex-1">
            <ScrollArea className="h-full">
              {ownedProjects.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-1 px-4 py-12 text-center">
                  <p className="text-sm text-copy-secondary">No projects yet</p>
                  <p className="text-xs text-copy-muted">
                    Create a project to get started
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-0.5 p-2">
                  {ownedProjects.map((project) => (
                    <li
                      key={project.id}
                      className="group flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 hover:bg-elevated"
                    >
                      <span className="truncate text-sm text-copy-primary">
                        {project.name}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${project.name}`}
                              className="shrink-0 opacity-0 group-hover:opacity-100 aria-expanded:opacity-100"
                            />
                          }
                        >
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onRenameProject(project)}
                          >
                            <Pencil className="h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDeleteProject(project)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="shared" className="flex-1">
            <ScrollArea className="h-full">
              {sharedProjects.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-1 px-4 py-12 text-center">
                  <p className="text-sm text-copy-secondary">
                    Nothing shared yet
                  </p>
                  <p className="text-xs text-copy-muted">
                    Projects shared with you will show up here
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-0.5 p-2">
                  {sharedProjects.map((project) => (
                    <li
                      key={project.id}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 hover:bg-elevated"
                    >
                      <span className="truncate text-sm text-copy-primary">
                        {project.name}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="shrink-0 border-t border-surface-border p-3">
          <Button
            className="w-full justify-center gap-2"
            onClick={onCreateProject}
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </aside>
    </>
  );
}
