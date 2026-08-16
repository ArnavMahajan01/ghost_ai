"use client";

import { AlertCircle, Check, Cloud, Loader2 } from "lucide-react";
import type { ComponentType } from "react";

import { Button } from "@/components/ui/button";
import type { SaveStatus } from "@/hooks/use-canvas-autosave";
import { cn } from "@/lib/utils";

interface SaveStatusButtonProps {
  status: SaveStatus;
  onSaveNow: () => void;
}

const STATUS_CONFIG: Record<
  SaveStatus,
  { icon: ComponentType<{ className?: string }>; label: string }
> = {
  idle: { icon: Cloud, label: "Save" },
  saving: { icon: Loader2, label: "Saving…" },
  saved: { icon: Check, label: "Saved" },
  error: { icon: AlertCircle, label: "Retry" },
};

/** Navbar save button — click to save immediately; its icon/label double as the autosave status indicator. */
export function SaveStatusButton({ status, onSaveNow }: SaveStatusButtonProps) {
  const { icon: Icon, label } = STATUS_CONFIG[status];

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onSaveNow}
      disabled={status === "saving"}
      aria-label={status === "error" ? "Retry save" : "Save"}
      className={cn("gap-1.5 text-xs", status === "error" && "text-error")}
    >
      <Icon className={cn("h-3.5 w-3.5", status === "saving" && "animate-spin")} />
      {label}
    </Button>
  );
}
