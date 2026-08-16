"use client";

import { Bot, Download, Send, Sparkles, FileText, X } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Floating AI chat sidebar — the open/close state stays owned by the
 * parent (`EditorShell`), same as before this unit; this only builds out
 * what renders inside it. No chat/spec-generation logic yet, per the
 * spec's scope limits — everything below is structure and local-only UI
 * state (draft text, an in-memory message list for the one role a user
 * can actually produce without a backend).
 */
export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
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
          <AiArchitectTab />
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

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

let messageIdCounter = 0;

function AiArchitectTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");

  const submitDraft = () => {
    const content = draft.trim();
    if (!content) return;
    messageIdCounter += 1;
    setMessages((prev) => [...prev, { id: `msg-${messageIdCounter}`, role: "user", content }]);
    setDraft("");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submitDraft();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitDraft();
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 px-1 py-3">
          {messages.length === 0 ? (
            <AiArchitectEmptyState onPromptClick={setDraft} />
          ) : (
            messages.map((message) => <ChatBubble key={message.id} message={message} />)
          )}
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 flex-col gap-2 border-t border-surface-border pt-3"
      >
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Ghost AI to design your architecture…"
          className="min-h-[72px] max-h-[160px] resize-none"
        />
        <Button
          type="submit"
          disabled={!draft.trim()}
          className="gap-2 self-end bg-ai text-white hover:bg-ai/90"
        >
          <Send className="h-4 w-4" />
          Send
        </Button>
      </form>
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

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words",
          isUser
            ? "border-2 border-brand/50 bg-accent-dim text-copy-primary"
            : "border border-surface-border bg-elevated text-ai-text"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function SpecsTab() {
  return (
    <div className="flex flex-col gap-3 px-1 py-3">
      <Button className="gap-2 self-start bg-ai text-white hover:bg-ai/90">
        <Sparkles className="h-4 w-4" />
        Generate Spec
      </Button>
      <DemoSpecCard />
    </div>
  );
}

function DemoSpecCard() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-surface-border bg-elevated p-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 shrink-0 text-ai-text" />
        <h3 className="text-sm font-medium text-copy-primary">E-commerce Backend Spec</h3>
      </div>
      <p className="text-xs text-copy-muted">
        API gateway, product/order/payment services, and a shared Postgres
        database with an event bus for order fulfillment.
      </p>
      <Button variant="outline" size="sm" disabled className="w-fit gap-2">
        <Download className="h-4 w-4" />
        Download
      </Button>
    </div>
  );
}
