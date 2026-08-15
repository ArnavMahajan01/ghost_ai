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
import type { UseProjectDialogsReturn } from "@/hooks/use-project-dialogs";
import { cn } from "@/lib/utils";

interface ProjectDialogsProps {
  state: UseProjectDialogsReturn;
}

export function ProjectDialogs({ state }: ProjectDialogsProps) {
  const {
    dialog,
    name,
    setName,
    slugPreview,
    isLoading,
    close,
    submitCreate,
    submitRename,
    submitDelete,
  } = state;

  const isNameEmpty = !name.trim();
  const isSlugInvalid = !isNameEmpty && !slugPreview;
  const slugMessage = isNameEmpty
    ? "Enter a name to preview the slug"
    : isSlugInvalid
      ? "Name must include at least one letter or number"
      : `/${slugPreview}`;

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
                isSlugInvalid ? "text-error" : "text-copy-muted"
              )}
            >
              {slugMessage}
            </p>
          </form>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={submitCreate}
              disabled={isNameEmpty || isSlugInvalid || isLoading}
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
            <p
              className={cn(
                "mt-2 text-xs",
                isSlugInvalid ? "text-error" : "text-copy-muted"
              )}
            >
              {slugMessage}
            </p>
          </form>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={submitRename}
              disabled={isNameEmpty || isSlugInvalid || isLoading}
            >
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
