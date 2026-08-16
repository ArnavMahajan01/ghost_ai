"use client";

import { useUser } from "@clerk/nextjs";
import { useCreateFeed, useCreateFeedMessage, useFeedMessages, useRoom } from "@liveblocks/react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { AlertCircle, Bot, Download, Loader2, Send, Sparkles, FileText, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import ReactMarkdown, { type Components } from "react-markdown";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ACTIVE_AI_STATUSES,
  AI_CHAT_FEED_ID,
  AI_STATUS_FEED_ID,
  aiStatusFeedMessageSchema,
  chatFeedMessageSchema,
  type AiStatusFeedMessage,
  type ChatFeedMessage,
} from "@/types/tasks";

/** The exact green accent `context/feature-specs/26-ai-chat-functional.md`'s "UI Details" section specifies — already an existing token, `NODE_COLORS`' green pair in `types/canvas.ts`/`context/ui-context.md`, not a new color. */
const CHAT_ACCENT_GREEN = "#62C073";
const CHAT_ACCENT_GREEN_DARK = "#0F2E18";

/**
 * Creates a room feed if it doesn't already exist — "create or reuse", the
 * client-side equivalent of `trigger/design-agent.ts`'s server-side
 * `ensureAiStatusFeed`. Any failure (including "already exists") is
 * swallowed: a feed that's already there is the expected steady state, and
 * subscribing/sending below will surface their own errors if the feed
 * genuinely can't be reached.
 */
function useEnsureFeed(feedId: string) {
  const createFeed = useCreateFeed();

  useEffect(() => {
    createFeed(feedId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run if the feed id itself changes, not on every `createFeed` identity change
  }, [feedId]);
}

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const AI_STATUS_LABELS: Record<AiStatusFeedMessage["status"], string> = {
  started: "Getting started…",
  thinking: "Thinking…",
  generating: "Generating…",
  complete: "Done",
  error: "Something went wrong",
};

/**
 * Reads the room's shared `ai-status-feed` (see `types/tasks.ts`,
 * `trigger/design-agent.ts`) and surfaces only the most recent message,
 * validated through `aiStatusFeedMessageSchema` — an unparsable message
 * (or none yet) just means no status to show. Must render inside the same
 * `RoomProvider` as the canvas (see `CanvasRoom`'s `children` slot), since
 * feeds are room-scoped.
 */
function useAiStatus() {
  const { messages } = useFeedMessages(AI_STATUS_FEED_ID);

  return useMemo(() => {
    if (!messages || messages.length === 0) return null;

    const latest = messages.reduce((newest, message) =>
      message.createdAt > newest.createdAt ? message : newest
    );
    const parsed = aiStatusFeedMessageSchema.safeParse(latest.data);
    if (!parsed.success) return null;

    return {
      ...parsed.data,
      isActive: (ACTIVE_AI_STATUSES as readonly string[]).includes(parsed.data.status),
    };
  }, [messages]);
}

/**
 * Floating AI chat sidebar — the open/close state stays owned by the
 * parent (`EditorShell`), same as before this unit; this only builds out
 * what renders inside it. Chat is real and collaborative via the room's
 * `ai-chat` feed, and submitting now actually triggers design generation
 * and tracks its run status (`context/feature-specs/26-ai-chat-functional.md`).
 */
export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  const aiStatus = useAiStatus();
  useEnsureFeed(AI_CHAT_FEED_ID);

  return (
    <aside
      aria-hidden={!isOpen}
      className={cn(
        "absolute top-0 right-0 z-40 flex h-full w-80 flex-col border-l border-surface-border bg-base/95 shadow-lg backdrop-blur-sm transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <AiSidebarHeader onClose={onClose} />

      <Tabs defaultValue="architect" className="flex flex-1 flex-col overflow-hidden px-3 pb-3">
        <TabsList className="w-full shrink-0">
          <TabsTrigger
            value="architect"
            className="text-copy-muted data-active:bg-ai/15 data-active:text-ai"
          >
            AI Architect
          </TabsTrigger>
          <TabsTrigger
            value="specs"
            className="text-copy-muted data-active:bg-ai/15 data-active:text-ai"
          >
            Specs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="architect" className="flex flex-1 flex-col overflow-hidden">
          <AiArchitectTab aiStatus={aiStatus} />
        </TabsContent>
        <TabsContent value="specs" className="flex-1 overflow-y-auto">
          <SpecsTab />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function AiSidebarHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-surface-border px-4">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 shrink-0 text-ai" />
        <div className="flex flex-col leading-tight">
          <h2 className="text-sm font-medium text-copy-primary">AI Workspace</h2>
          <p className="text-xs text-copy-muted">Collaborate with Ghost AI</p>
        </div>
      </div>
      <Button variant="ghost" size="icon-sm" aria-label="Close AI sidebar" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
];

interface ChatFeedEntry {
  /** The feed message's own id (`FeedMessage.id`), not part of the validated payload. */
  id: string;
  data: ChatFeedMessage;
}

/**
 * Reads the room's `ai-chat` feed, validates each message through
 * `chatFeedMessageSchema` (unparsable messages are dropped, not rendered),
 * and sorts by the payload's own `timestamp` — feed message ordering isn't
 * documented, so this doesn't assume the array arrives pre-sorted.
 */
function useChatMessages(): ChatFeedEntry[] {
  const { messages } = useFeedMessages(AI_CHAT_FEED_ID);

  return useMemo(() => {
    if (!messages) return [];

    const entries: ChatFeedEntry[] = [];
    for (const message of messages) {
      const parsed = chatFeedMessageSchema.safeParse(message.data);
      if (parsed.success) entries.push({ id: message.id, data: parsed.data });
    }
    return entries.sort((a, b) => a.data.timestamp - b.data.timestamp);
  }, [messages]);
}

type AiStatusInfo = (AiStatusFeedMessage & { isActive: boolean }) | null;

interface AiArchitectTabProps {
  /** The room's latest `ai-status-feed` message — shared across every participant, not just whoever submitted. */
  aiStatus: AiStatusInfo;
}

/** A design run this client just started — tracked locally only for the submitter, to know when to push the final AI chat message. */
interface ActiveRun {
  runId: string;
  publicToken: string;
}

function AiArchitectTab({ aiStatus }: AiArchitectTabProps) {
  const { user } = useUser();
  const room = useRoom();
  const messages = useChatMessages();
  const createChatMessage = useCreateFeedMessage();
  const [draft, setDraft] = useState("");
  const [sendFailed, setSendFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);

  // Only enabled once this client actually has a run to track — before
  // that, `accessToken` would be empty and the hook would just error.
  const { run } = useRealtimeRun(activeRun?.runId, {
    accessToken: activeRun?.publicToken,
    enabled: activeRun !== null,
  });

  const senderName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Anonymous";

  const pushChatMessage = (role: ChatFeedMessage["role"], content: string) => {
    const payload: ChatFeedMessage = {
      sender: role === "assistant" ? "Ghost AI" : senderName,
      role,
      content,
      timestamp: Date.now(),
    };
    return createChatMessage(AI_CHAT_FEED_ID, payload);
  };

  // Once the tracked run reaches a terminal state, push a final AI message
  // to `ai-chat` and reset local loading/run state — per spec step 2. Runs
  // on `run?.isCompleted` specifically (not the whole `run` object), so this
  // only fires once per run rather than on every intermediate status update.
  useEffect(() => {
    if (!run?.isCompleted || !activeRun) return;

    const content = run.isSuccess
      ? "Design generation complete — check the canvas for the updated architecture."
      : "Design generation failed. Please try again.";

    pushChatMessage("assistant", content)
      .catch(() => {})
      .finally(() => {
        setActiveRun(null);
        setIsSubmitting(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when this run's terminal state actually flips
  }, [run?.isCompleted]);

  const submitDraft = async () => {
    const content = draft.trim();
    if (!content || isGenerating) return;

    setSendFailed(false);
    setIsSubmitting(true);

    try {
      await pushChatMessage("user", content);
      setDraft("");
    } catch {
      setSendFailed(true);
      setIsSubmitting(false);
      return;
    }

    try {
      // The room id doubles as the project id in this app (a project's own
      // Prisma id is what's used to navigate to/open its room — see
      // `context/progress-tracker.md`'s 07-wire-editor-home.md note), and
      // `/api/ai/design` needs `projectId` specifically for its ownership
      // check, so both are sent even though they're always the same value.
      const designResponse = await fetch("/api/ai/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: content, roomId: room.id, projectId: room.id }),
      });
      if (!designResponse.ok) throw new Error("Failed to start design generation");
      const { runId } = (await designResponse.json()) as { runId: string };

      const tokenResponse = await fetch("/api/ai/design/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      if (!tokenResponse.ok) throw new Error("Failed to authorize design run");
      const { token } = (await tokenResponse.json()) as { token: string };

      setActiveRun({ runId, publicToken: token });
    } catch {
      setIsSubmitting(false);
      await pushChatMessage(
        "assistant",
        "Something went wrong starting design generation. Please try again."
      ).catch(() => {});
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submitDraft();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitDraft();
    }
  };

  // Shared (every participant, from `ai-status-feed`) OR local (this
  // client mid-submit, before the feed has caught up) — either one disables
  // the input, so two people can't kick off overlapping generations.
  const isGenerating = (aiStatus?.isActive ?? false) || isSubmitting;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 px-1 py-3">
          {messages.length === 0 ? (
            <AiArchitectEmptyState onPromptClick={setDraft} />
          ) : (
            messages.map((message) => <ChatBubble key={message.id} message={message.data} />)
          )}
        </div>
      </ScrollArea>

      <div className="flex shrink-0 flex-col gap-2 border-t border-surface-border pt-3">
        {aiStatus?.isActive ? <AiStatusStrip status={aiStatus} /> : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder="Ask Ghost AI to design your architecture…"
            className="min-h-[72px] max-h-[160px] resize-none"
          />
          {sendFailed ? (
            <p className="flex items-center gap-1.5 text-xs text-error">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Couldn&apos;t send your message. Try again.
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={!draft.trim() || isGenerating}
            style={!draft.trim() || isGenerating ? undefined : { backgroundColor: CHAT_ACCENT_GREEN }}
            className={cn(
              "gap-2 self-end text-white",
              !draft.trim() || isGenerating ? "bg-ai" : "hover:opacity-90"
            )}
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isGenerating ? "Generating…" : "Send"}
          </Button>
        </form>
      </div>
    </div>
  );
}

/** Compact status strip above the chat input — shared across the room via `ai-status-feed`, shown only while a run is active. */
function AiStatusStrip({ status }: { status: AiStatusFeedMessage }) {
  return (
    <div
      className="flex shrink-0 items-center gap-2 rounded-lg bg-base px-3 py-1.5 text-xs"
      style={{ border: `1px solid ${CHAT_ACCENT_GREEN}4D`, color: CHAT_ACCENT_GREEN }}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          style={{ backgroundColor: CHAT_ACCENT_GREEN }}
        />
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ backgroundColor: CHAT_ACCENT_GREEN }}
        />
      </span>
      <span className="truncate">{status.text || AI_STATUS_LABELS[status.status]}</span>
    </div>
  );
}

interface AiArchitectEmptyStateProps {
  onPromptClick: (prompt: string) => void;
}

function AiArchitectEmptyState({ onPromptClick }: AiArchitectEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-3 py-10 text-center">
      <Bot className="h-8 w-8 text-ai" />
      <p className="text-sm text-copy-secondary">
        Describe the system you want to build and Ghost AI will help design it.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPromptClick(prompt)}
            className="rounded-full bg-subtle px-3 py-1.5 text-xs text-ai-text transition-colors hover:bg-elevated"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatFeedMessage }) {
  const isUser = message.role === "user";
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <div className="flex items-center gap-1.5 px-1 text-[11px] text-copy-muted">
        <span className="font-medium text-copy-secondary">{message.sender}</span>
        <span>{time}</span>
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words",
          !isUser && "border border-surface-border bg-elevated text-ai-text"
        )}
        style={isUser ? { backgroundColor: CHAT_ACCENT_GREEN, color: CHAT_ACCENT_GREEN_DARK } : undefined}
      >
        {message.content}
      </div>
    </div>
  );
}

interface SpecSummary {
  id: string;
  createdAt: string;
  filename: string;
}

function specDownloadUrl(projectId: string, specId: string): string {
  return `/api/projects/${projectId}/specs/${specId}/download`;
}

function formatSpecDate(createdAt: string): string {
  return new Date(createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Real spec list + preview/download, per
 * `context/feature-specs/29-spec-ui-integration.md`. "Generate Spec" stays
 * exactly as inert as it was before this unit — wiring it up (assembling
 * `chatHistory`/`nodes`/`edges` and calling `POST /api/ai/spec`) isn't one
 * of this spec's 3 listed steps, so it's left untouched rather than guessed at.
 */
function SpecsTab() {
  const room = useRoom();
  const [specs, setSpecs] = useState<SpecSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);

  const loadSpecs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${room.id}/specs`);
      if (!response.ok) throw new Error("Failed to load specs");
      const data = (await response.json()) as { specs: SpecSummary[] };
      setSpecs(data.specs);
    } catch {
      setSpecs([]);
    } finally {
      setIsLoading(false);
    }
  }, [room.id]);

  useEffect(() => {
    // Same documented exception as `hooks/use-share-dialog.ts` — no
    // server-rendered data to hydrate the sidebar's Specs tab from.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSpecs();
  }, [loadSpecs]);

  const selectedSpec = specs.find((spec) => spec.id === selectedSpecId) ?? null;

  return (
    <div className="flex flex-col gap-3 px-1 py-3">
      <Button className="gap-2 self-start bg-ai text-white hover:bg-ai/90">
        <Sparkles className="h-4 w-4" />
        Generate Spec
      </Button>

      {isLoading ? (
        <p className="px-1 text-xs text-copy-muted">Loading specs…</p>
      ) : specs.length === 0 ? (
        <p className="px-1 text-xs text-copy-muted">No specs generated yet.</p>
      ) : (
        <ScrollArea className="max-h-72">
          <div className="flex flex-col gap-1.5 pr-2">
            {specs.map((spec) => (
              <SpecListItem
                key={spec.id}
                spec={spec}
                projectId={room.id}
                onSelect={() => setSelectedSpecId(spec.id)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      <SpecPreviewDialog
        projectId={room.id}
        spec={selectedSpec}
        open={selectedSpec !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSpecId(null);
        }}
      />
    </div>
  );
}

interface SpecListItemProps {
  spec: SpecSummary;
  projectId: string;
  onSelect: () => void;
}

function SpecListItem({ spec, projectId, onSelect }: SpecListItemProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-surface-border bg-elevated py-1 pr-1 pl-3">
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 flex-col items-start py-1.5 text-left"
      >
        <span className="flex w-full min-w-0 items-center gap-1.5 truncate text-sm font-medium text-copy-primary">
          <FileText className="h-3.5 w-3.5 shrink-0 text-ai-text" />
          <span className="truncate">{spec.filename}</span>
        </span>
        <span className="text-xs text-copy-muted">{formatSpecDate(spec.createdAt)}</span>
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Download ${spec.filename}`}
        onClick={() => window.open(specDownloadUrl(projectId, spec.id), "_blank")}
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}

const MARKDOWN_COMPONENTS: Components = {
  h1: (props) => <h1 className="mt-4 mb-2 text-base font-semibold text-copy-primary first:mt-0" {...props} />,
  h2: (props) => <h2 className="mt-4 mb-2 text-sm font-semibold text-copy-primary first:mt-0" {...props} />,
  h3: (props) => <h3 className="mt-3 mb-1 text-sm font-medium text-copy-primary first:mt-0" {...props} />,
  p: (props) => <p className="mb-2 text-sm text-copy-secondary" {...props} />,
  ul: (props) => <ul className="mb-2 list-disc space-y-1 pl-5 text-sm text-copy-secondary" {...props} />,
  ol: (props) => <ol className="mb-2 list-decimal space-y-1 pl-5 text-sm text-copy-secondary" {...props} />,
  code: (props) => <code className="rounded bg-subtle px-1 py-0.5 text-xs text-copy-primary" {...props} />,
  a: (props) => <a className="text-brand underline" {...props} />,
};

interface SpecPreviewDialogProps {
  projectId: string;
  spec: SpecSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Fetches the spec's Markdown content through the same download route used
 * for actual downloads (`fetch()` just reads the body, ignoring its
 * `Content-Disposition` header) rather than touching Blob directly — per
 * the spec's "assume ProjectSpec only provides metadata, content must be
 * fetched separately." Content is held in local state only for as long as
 * the modal is open, not cached anywhere longer-term.
 */
function SpecPreviewDialog({ projectId, spec, open, onOpenChange }: SpecPreviewDialogProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!open || !spec) {
      // Resetting on close (no fetch to run) — same documented
      // fetch-on-open exception as `loadSpecs` above, just the mirror case.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContent(null);
      setLoadFailed(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadFailed(false);

    fetch(specDownloadUrl(projectId, spec.id))
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load spec");
        return response.text();
      })
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, spec, projectId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="truncate">{spec?.filename}</DialogTitle>
          <DialogDescription>{spec ? formatSpecDate(spec.createdAt) : null}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] flex-1">
          <div className="px-1 py-2">
            {isLoading ? <p className="text-sm text-copy-muted">Loading…</p> : null}
            {loadFailed ? (
              <p className="flex items-center gap-1.5 text-sm text-error">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Couldn&apos;t load this spec.
              </p>
            ) : null}
            {content ? (
              <ReactMarkdown components={MARKDOWN_COMPONENTS}>{content}</ReactMarkdown>
            ) : null}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!spec}
            onClick={() => spec && window.open(specDownloadUrl(projectId, spec.id), "_blank")}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          <DialogClose render={<Button variant="ghost" />}>Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
