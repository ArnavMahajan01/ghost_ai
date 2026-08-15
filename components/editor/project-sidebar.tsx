"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
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
            <div className="flex h-full flex-col items-center justify-center gap-1 px-4 py-12 text-center">
              <p className="text-sm text-copy-secondary">No projects yet</p>
              <p className="text-xs text-copy-muted">
                Create a project to get started
              </p>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="shared" className="flex-1">
          <ScrollArea className="h-full">
            <div className="flex h-full flex-col items-center justify-center gap-1 px-4 py-12 text-center">
              <p className="text-sm text-copy-secondary">Nothing shared yet</p>
              <p className="text-xs text-copy-muted">
                Projects shared with you will show up here
              </p>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <div className="shrink-0 border-t border-surface-border p-3">
        <Button className="w-full justify-center gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
    </aside>
  );
}
