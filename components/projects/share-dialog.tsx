"use client";

import { Check, Copy, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useShareDialog } from "@/hooks/use-share-dialog";
import type { ProjectRole } from "@/types/project";

interface ShareDialogProps {
  projectId: string;
  role: ProjectRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({
  projectId,
  role,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const isOwner = role === "owner";
  const state = useShareDialog(projectId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share project</DialogTitle>
          <DialogDescription>
            {isOwner
              ? "Invite people to collaborate by email."
              : "People with access to this project."}
          </DialogDescription>
        </DialogHeader>

        {isOwner ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              state.invite();
            }}
          >
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="teammate@company.com"
                value={state.email}
                onChange={(event) => state.setEmail(event.target.value)}
              />
              <Button
                type="submit"
                disabled={!state.email.trim() || state.isInviting}
              >
                {state.isInviting ? "Inviting…" : "Invite"}
              </Button>
            </div>
            {state.inviteError ? (
              <p className="text-xs text-error">{state.inviteError}</p>
            ) : null}
          </form>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-copy-muted">
            {state.collaborators.length === 1
              ? "1 collaborator"
              : `${state.collaborators.length} collaborators`}
          </p>

          {state.isLoading ? (
            <p className="py-4 text-center text-sm text-copy-muted">
              Loading…
            </p>
          ) : state.collaborators.length === 0 ? (
            <p className="py-4 text-center text-sm text-copy-muted">
              No collaborators yet
            </p>
          ) : (
            <ul className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
              {state.collaborators.map((collaborator) => (
                <li
                  key={collaborator.id}
                  className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5"
                >
                  {collaborator.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- avatar comes from Clerk's CDN, not a local/optimizable asset
                    <img
                      src={collaborator.imageUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-dim text-xs font-medium text-brand">
                      {(collaborator.name ?? collaborator.email)[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm text-copy-primary">
                      {collaborator.name ?? collaborator.email}
                    </span>
                    {collaborator.name ? (
                      <span className="truncate text-xs text-copy-muted">
                        {collaborator.email}
                      </span>
                    ) : null}
                  </div>
                  {isOwner ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${collaborator.email}`}
                      disabled={state.removingId === collaborator.id}
                      onClick={() => state.remove(collaborator.id)}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" className="gap-2" onClick={state.copyLink}>
            {state.copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy link
              </>
            )}
          </Button>
          <DialogClose render={<Button variant="outline" />}>
            Close
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
