"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UseProjectActionsReturn } from "@/hooks/use-project-actions";
import { cn } from "@/lib/utils";

interface ProjectDialogsProps {
  state: UseProjectActionsReturn;
}

export function ProjectDialogs({ state }: ProjectDialogsProps) {
  const {
    dialog,
    name,
    setName,
    roomIdPreview,
    isLoading,
    error,
    close,
    submitCreate,
    submitRename,
    submitDelete,
  } = state;

  const isNameEmpty = !name.trim();
  const isRoomIdInvalid = !isNameEmpty && !roomIdPreview;
  const roomIdMessage = isNameEmpty
    ? "Enter a name to preview the room ID"
    : isRoomIdInvalid
      ? "Name must include at least one letter or number"
      : `Room: ${roomIdPreview}`;

  return (
    <>
      <Dialog
        open={dialog?.type === "create"}
        onOpenChange={(open) => !open && close()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>
              Give your architecture workspace a name.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitCreate();
            }}
          >
            <Input
              autoFocus
              placeholder="Project name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <p
              className={cn(
                "text-xs",
                isRoomIdInvalid ? "text-error" : "text-copy-muted"
              )}
            >
              {roomIdMessage}
            </p>
            {error ? <p className="text-xs text-error">{error}</p> : null}
          </form>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={submitCreate}
              disabled={isNameEmpty || isRoomIdInvalid || isLoading}
            >
              {isLoading ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.type === "rename"}
        onOpenChange={(open) => !open && close()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>
              {dialog?.type === "rename"
                ? `Renaming "${dialog.project.name}".`
                : null}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitRename();
            }}
          >
            <Input
              autoFocus
              placeholder="Project name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {error ? (
              <p className="mt-2 text-xs text-error">{error}</p>
            ) : null}
          </form>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button onClick={submitRename} disabled={isNameEmpty || isLoading}>
              {isLoading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.type === "delete"}
        onOpenChange={(open) => !open && close()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              {dialog?.type === "delete"
                ? `This will permanently delete "${dialog.project.name}". This action cannot be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-xs text-error">{error}</p> : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={submitDelete}
              disabled={isLoading}
            >
              {isLoading ? "Deleting…" : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
