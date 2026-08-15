"use client";

import { Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Structural placeholder for the future AI chat panel — no chat logic yet,
 * per context/feature-specs/08-editor-workspace-shell.md.
 */
export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      className={cn(
        "absolute top-0 right-0 z-40 flex h-full w-80 flex-col border-l border-surface-border bg-surface/95 backdrop-blur-sm transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-surface-border px-4">
        <h2 className="text-sm font-medium text-copy-primary">Assistant</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close AI sidebar"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <Sparkles className="h-8 w-8 text-ai-text" />
        <p className="text-sm text-copy-secondary">AI chat is coming soon</p>
        <p className="text-xs text-copy-muted">
          This panel will let you talk to the AI about your architecture.
        </p>
      </div>
    </aside>
  );
}
