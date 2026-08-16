"use client";

import { UserButton } from "@clerk/nextjs";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface EditorNavbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  /** Shown centered in the navbar — the active workspace's project name. */
  projectName?: string;
  /** Extra actions rendered before the user menu (e.g. share, AI toggle). */
  actions?: ReactNode;
  /**
   * Whether to render the Clerk `UserButton` — this navbar is shared
   * between the editor home and a project workspace, and the workspace
   * view shouldn't show it. Defaults to `true` (the editor home's case) so
   * any caller that doesn't pass it keeps the original behavior.
   */
  showUserButton?: boolean;
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  projectName,
  actions,
  showUserButton = true,
}: EditorNavbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-surface-border bg-surface px-3">
      <div className="flex flex-1 items-center justify-start">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-pressed={isSidebarOpen}
          onClick={onToggleSidebar}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {projectName ? (
          <span className="truncate text-sm font-medium text-copy-primary">
            {projectName}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 items-center justify-end gap-2">
        {actions}
        {showUserButton ? <UserButton /> : null}
      </div>
    </header>
  );
}
