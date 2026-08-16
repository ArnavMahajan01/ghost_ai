import { z } from "zod";

import { NODE_SHAPES } from "@/types/canvas";
import type { NodeShape } from "@/types/canvas";

/**
 * The lifecycle stages a background AI task moves through — published to
 * the shared `ai-status-feed` Liveblocks feed (see
 * `trigger/design-agent.ts` on the write side, `components/editor/ai-sidebar.tsx`
 * on the read side) and generic across task kinds (design generation now,
 * spec generation later), per `context/feature-specs/24-ai-presence-state.md`.
 */
export const AI_STATUS_VALUES = ["started", "thinking", "generating", "complete", "error"] as const;
export type AiStatus = (typeof AI_STATUS_VALUES)[number];

/** Statuses that represent work still in progress, as opposed to a finished (successful or failed) run. */
export const ACTIVE_AI_STATUSES: readonly AiStatus[] = ["started", "thinking", "generating"];

/**
 * Payload shape for a message on the `ai-status-feed` feed. `text` is
 * optional — a status can be a bare state change with no extra detail.
 */
export const aiStatusFeedMessageSchema = z.object({
  status: z.enum(AI_STATUS_VALUES),
  text: z.string().optional(),
});
export type AiStatusFeedMessage = z.infer<typeof aiStatusFeedMessageSchema>;

/** The (room-scoped) Liveblocks feed id every AI task publishes its status to. */
export const AI_STATUS_FEED_ID = "ai-status-feed";

/**
 * Payload shape for a message on the `ai-chat` feed — the room's
 * collaborative chat with the AI sidebar, kept deliberately separate from
 * `ai-status-feed` (progress/presence, not conversation). Per
 * `context/feature-specs/25-sidebar-chat-feed.md`'s step 4: sender, role,
 * content, and a timestamp, all validated before a message is ever
 * rendered.
 */
export const chatMessageRoleValues = ["user", "assistant"] as const;
export type ChatMessageRole = (typeof chatMessageRoleValues)[number];

export const chatFeedMessageSchema = z.object({
  sender: z.string().min(1).max(80),
  role: z.enum(chatMessageRoleValues),
  content: z.string().min(1).max(4000),
  timestamp: z.number(),
});
export type ChatFeedMessage = z.infer<typeof chatFeedMessageSchema>;

/** The (room-scoped) Liveblocks feed id for the sidebar's user/AI chat — never mixed with `AI_STATUS_FEED_ID`. */
export const AI_CHAT_FEED_ID = "ai-chat";

/**
 * Minimal, permissive shapes for the canvas nodes/edges sent into spec
 * generation (`POST /api/ai/spec`, `trigger/generate-spec.ts`) — just
 * enough structure to describe the architecture to the model. Not the full
 * React Flow `Node`/`Edge` type (many fields there are rendering-only and
 * irrelevant to a written spec), and not a change to `types/canvas.ts`'s
 * existing `CanvasNode`/`CanvasEdge` — those stay the source of truth for
 * the canvas itself; these are a read-only, purpose-built projection of them.
 */
export const specNodeSchema = z.object({
  id: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z
    .object({
      label: z.string(),
      shape: z.enum(NODE_SHAPES as [NodeShape, ...NodeShape[]]),
      color: z.string(),
    })
    .passthrough(),
});
export type SpecNode = z.infer<typeof specNodeSchema>;

export const specEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  data: z.object({ label: z.string() }).partial().optional(),
});
export type SpecEdge = z.infer<typeof specEdgeSchema>;

/**
 * `POST /api/ai/spec`'s request body — deliberately has no `projectId`
 * field. Project access (and the real `projectId` used everywhere after)
 * is resolved server-side from `roomId` + the authenticated user, per
 * `context/feature-specs/27-spec-generation-flow.md`'s "do not trust a
 * client-supplied projectId."
 */
export const generateSpecRequestSchema = z.object({
  roomId: z.string().min(1),
  chatHistory: z.array(chatFeedMessageSchema).max(200),
  nodes: z.array(specNodeSchema),
  edges: z.array(specEdgeSchema),
});
export type GenerateSpecRequest = z.infer<typeof generateSpecRequestSchema>;

/** `generate-spec` task payload — the request body plus the server-resolved `projectId`. */
export const generateSpecPayloadSchema = generateSpecRequestSchema.extend({
  projectId: z.string().min(1),
});
export type GenerateSpecPayload = z.infer<typeof generateSpecPayloadSchema>;
