import { google } from "@ai-sdk/google";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { LiveMap, LiveObject } from "@liveblocks/node";
import { logger, task } from "@trigger.dev/sdk";
import { z } from "zod";

import { getCursorColor, liveblocks } from "@/lib/liveblocks";
import {
  MIN_NODE_HEIGHT,
  MIN_NODE_WIDTH,
  NODE_COLORS,
  NODE_DEFAULT_SIZES,
  NODE_SHAPES,
} from "@/types/canvas";
import type { NodeShape } from "@/types/canvas";

export interface DesignAgentPayload {
  prompt: string;
  roomId: string;
}

// The AI is presented to collaborators as an ephemeral, unauthenticated
// participant — same `Presence`/`UserMeta` shape a real Clerk user gets,
// issued via `liveblocks.setPresence` instead of a WebSocket connection. See
// https://liveblocks.io/docs/guides/enabling-agentic-workflows-with-liveblocks
const AI_USER_ID = "ai-agent";
const AI_USER_INFO = {
  name: "Ghost AI",
  avatar: "",
  color: getCursorColor(AI_USER_ID),
};
// Refreshed on every presence update while the task runs; short enough that
// a crashed/killed run still self-clears instead of leaving a stale "AI is
// thinking" indicator behind for other collaborators.
const AI_PRESENCE_TTL_SECONDS = 45;
// The minimum TTL the Liveblocks REST presence API accepts — used to clear
// AI presence as close to immediately as the API allows once the run ends.
const AI_PRESENCE_CLEAR_TTL_SECONDS = 2;

/** Publishes one step of AI progress to the room's shared status feed (`RoomEvent`, see `liveblocks.config.ts`). */
async function publishStatus(
  roomId: string,
  status: "started" | "thinking" | "generating" | "complete" | "error",
  message: string
) {
  await liveblocks.broadcastEvent(roomId, { type: "ai-status", status, message });
}

async function setAiPresence(roomId: string, thinking: boolean, cursor: { x: number; y: number } | null) {
  await liveblocks.setPresence(roomId, {
    userId: AI_USER_ID,
    data: { thinking, cursor },
    userInfo: AI_USER_INFO,
    ttl: AI_PRESENCE_TTL_SECONDS,
  });
}

async function clearAiPresence(roomId: string) {
  await liveblocks.setPresence(roomId, {
    userId: AI_USER_ID,
    data: { thinking: false, cursor: null },
    userInfo: AI_USER_INFO,
    ttl: AI_PRESENCE_CLEAR_TTL_SECONDS,
  });
}

// ---------------------------------------------------------------------------
// Reading the room's current canvas as prompt context
// ---------------------------------------------------------------------------

interface ExistingNodeContext {
  id: string;
  label: string;
  shape: string;
  color: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
}

interface ExistingEdgeContext {
  id: string;
  source: string;
  target: string;
  label: string;
}

/**
 * Reads the room's current `flow` storage (same tree `useLiveblocksFlow`
 * renders from) as plain JSON, for grounding the prompt in what's already on
 * the canvas. Loosely typed rather than fought through `ToJson<Storage>`'s
 * generic — this is read-only context for the model, not a mutation.
 */
async function readCanvasContext(
  roomId: string
): Promise<{ nodes: ExistingNodeContext[]; edges: ExistingEdgeContext[] }> {
  const storage = (await liveblocks.getStorageDocument(roomId, "json").catch(() => null)) as {
    flow?: {
      nodes?: Record<
        string,
        {
          id: string;
          position?: { x: number; y: number };
          width?: number;
          height?: number;
          data?: { label?: string; shape?: string; color?: string };
        }
      >;
      edges?: Record<
        string,
        { id: string; source: string; target: string; data?: { label?: string } }
      >;
    };
  } | null;

  const nodes = Object.values(storage?.flow?.nodes ?? {}).map((node) => ({
    id: node.id,
    label: node.data?.label ?? "",
    shape: node.data?.shape ?? "rectangle",
    color: node.data?.color ?? NODE_COLORS[0].fill,
    position: node.position ?? { x: 0, y: 0 },
    width: node.width,
    height: node.height,
  }));

  const edges = Object.values(storage?.flow?.edges ?? {}).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.data?.label ?? "",
  }));

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Gemini plan schema — one call, a small ordered list of canvas actions
// ---------------------------------------------------------------------------

const nodeShapeEnum = z.enum(NODE_SHAPES as [NodeShape, ...NodeShape[]]);
const colorIndexSchema = z
  .number()
  .int()
  .min(0)
  .max(NODE_COLORS.length - 1)
  .describe("Index into the canvas's fixed 8-color palette (0-7) — not a raw hex value.");

const actionTypeEnum = z.enum([
  "addNode",
  "moveNode",
  "resizeNode",
  "updateNodeData",
  "deleteNode",
  "addEdge",
  "deleteEdge",
]);

// A flat object rather than `z.discriminatedUnion` — the union compiles to a
// JSON Schema `oneOf`, which Gemini's structured-output schema support
// doesn't reliably honor (confirmed against a real run: the model's response
// simply didn't conform, surfacing as `AI_NoObjectGeneratedError`). Every
// field below is optional except `type`; which fields are actually required
// per action is enforced in code by `normalizeAction`, not by the schema
// Gemini has to satisfy.
const rawActionSchema = z.object({
  type: actionTypeEnum,
  nodeId: z
    .string()
    .optional()
    .describe(
      "addNode: a short new id to reference this node later in the plan (e.g. 'n1'). moveNode/resizeNode/updateNodeData/deleteNode: an existing node's id, or a `nodeId` from an earlier addNode action in this same plan."
    ),
  label: z.string().max(60).optional().describe("addNode (required): the node's label. updateNodeData: new label, if changing it."),
  shape: nodeShapeEnum.optional().describe("addNode (required): the node's shape. updateNodeData: new shape, if changing it."),
  colorIndex: colorIndexSchema
    .optional()
    .describe("addNode (required): the node's color. updateNodeData: new color, if changing it."),
  x: z.number().min(-10000).max(10000).optional().describe("moveNode (required): target x position."),
  y: z.number().min(-10000).max(10000).optional().describe("moveNode (required): target y position."),
  width: z.number().min(MIN_NODE_WIDTH).max(2000).optional().describe("resizeNode (required): target width."),
  height: z.number().min(MIN_NODE_HEIGHT).max(2000).optional().describe("resizeNode (required): target height."),
  source: z
    .string()
    .optional()
    .describe("addEdge (required): source node id — existing, or a `nodeId` from an addNode action earlier in this plan."),
  target: z.string().optional().describe("addEdge (required): target node id, same id rules as source."),
  edgeLabel: z.string().max(40).optional().describe("addEdge: optional label for the new edge."),
  edgeId: z.string().optional().describe("deleteEdge (required): the id of an existing edge, from the canvas context."),
});

const designPlanSchema = z.object({
  summary: z.string().min(1).max(160).describe("One short sentence describing what this plan does, shown as the completion status."),
  actions: z.array(rawActionSchema).min(1).max(40),
});

type RawAction = z.infer<typeof rawActionSchema>;

type DesignAction =
  | { type: "addNode"; nodeId: string; label: string; shape: NodeShape; colorIndex: number }
  | { type: "moveNode"; nodeId: string; x: number; y: number }
  | { type: "resizeNode"; nodeId: string; width: number; height: number }
  | {
      type: "updateNodeData";
      nodeId: string;
      label?: string;
      shape?: NodeShape;
      colorIndex?: number;
    }
  | { type: "deleteNode"; nodeId: string }
  | { type: "addEdge"; source: string; target: string; label?: string }
  | { type: "deleteEdge"; edgeId: string };

/**
 * Validates that a raw (flat, loosely-typed) action from the model actually
 * carries the fields its `type` requires, narrowing it to `DesignAction`.
 * Returns `null` for an action missing a required field — dropped rather
 * than applied, since the schema itself can no longer guarantee this (see
 * `rawActionSchema`'s comment on why it isn't a discriminated union).
 */
function normalizeAction(action: RawAction): DesignAction | null {
  switch (action.type) {
    case "addNode":
      if (!action.nodeId || !action.label || !action.shape || action.colorIndex === undefined) return null;
      return {
        type: "addNode",
        nodeId: action.nodeId,
        label: action.label,
        shape: action.shape,
        colorIndex: action.colorIndex,
      };
    case "moveNode":
      if (!action.nodeId || action.x === undefined || action.y === undefined) return null;
      return { type: "moveNode", nodeId: action.nodeId, x: action.x, y: action.y };
    case "resizeNode":
      if (!action.nodeId || action.width === undefined || action.height === undefined) return null;
      return { type: "resizeNode", nodeId: action.nodeId, width: action.width, height: action.height };
    case "updateNodeData":
      if (!action.nodeId) return null;
      return {
        type: "updateNodeData",
        nodeId: action.nodeId,
        label: action.label,
        shape: action.shape,
        colorIndex: action.colorIndex,
      };
    case "deleteNode":
      if (!action.nodeId) return null;
      return { type: "deleteNode", nodeId: action.nodeId };
    case "addEdge":
      if (!action.source || !action.target) return null;
      return { type: "addEdge", source: action.source, target: action.target, label: action.edgeLabel };
    case "deleteEdge":
      if (!action.edgeId) return null;
      return { type: "deleteEdge", edgeId: action.edgeId };
    default:
      return null;
  }
}

function buildPrompt(
  prompt: string,
  existingNodes: ExistingNodeContext[],
  existingEdges: ExistingEdgeContext[]
): string {
  return [
    "You are a system-design assistant that edits a shared architecture diagram on a canvas.",
    "Translate the user's request into a short, ordered list of canvas actions.",
    "",
    "Rules:",
    "- Only use the 6 allowed shapes and the 8-color palette (by index) already described in the schema.",
    "- Do not invent positions for new nodes (addNode) — layout is computed separately. Only moveNode needs explicit x/y, and only when the user is asking to reposition something relative to what's already on the canvas.",
    "- To connect or edit an existing node/edge, use its real id from the canvas context below. To connect nodes you're creating in this same plan, use the `nodeId` you gave them in their own addNode action.",
    "- Keep labels short and specific (e.g. \"API Gateway\", not \"The API Gateway service that handles requests\").",
    "- If the request only asks to edit/move/delete existing elements, don't add unrelated new nodes.",
    "",
    `Current canvas — ${existingNodes.length} node(s), ${existingEdges.length} edge(s):`,
    JSON.stringify({ nodes: existingNodes, edges: existingEdges }),
    "",
    `User request: ${prompt}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Deterministic layout for newly-added nodes — spacing rules are enforced in
// code rather than trusted from the model's own sense of pixel geometry.
// ---------------------------------------------------------------------------

const LAYOUT_COLUMNS = 3;
const LAYOUT_GAP_X = 260;
const LAYOUT_GAP_Y = 200;

function computeNewNodePositions(
  existingNodes: ExistingNodeContext[],
  count: number
): { x: number; y: number }[] {
  const originY =
    existingNodes.length > 0
      ? Math.max(...existingNodes.map((node) => node.position.y + (node.height ?? 0))) + LAYOUT_GAP_Y
      : 0;

  return Array.from({ length: count }, (_, index) => ({
    x: (index % LAYOUT_COLUMNS) * LAYOUT_GAP_X,
    y: originY + Math.floor(index / LAYOUT_COLUMNS) * LAYOUT_GAP_Y,
  }));
}

// ---------------------------------------------------------------------------
// Node/edge id generation — same scheme as `lib/canvas.ts`'s client-side
// `createNodeId`/`createEdgeId` (shape/prefix + timestamp + counter), kept
// local since this runs in the background task's own process.
// ---------------------------------------------------------------------------

let nodeIdCounter = 0;
function generateNodeId(shape: NodeShape): string {
  nodeIdCounter += 1;
  return `${shape}-${Date.now()}-${nodeIdCounter}`;
}

let edgeIdCounter = 0;
function generateEdgeId(source: string, target: string): string {
  edgeIdCounter += 1;
  return `edge-${source}-${target}-${Date.now()}-${edgeIdCounter}`;
}

const EDGE_MARKER_END = { type: "arrowclosed", color: "rgba(225, 225, 235, 0.7)" };

/**
 * Applies a generated plan to the room's `flow` storage — the exact same
 * Liveblocks Storage tree `useLiveblocksFlow` reads/writes on the client
 * (default `storageKey: "flow"`), via the Node SDK's `mutateStorage` instead
 * of a bespoke storage shape. Node/edge ids referenced from the plan are
 * resolved through `idMap`: existing ids pass through unchanged, and ids
 * created earlier in the same plan (`addNode`'s `nodeId`) resolve to their
 * real generated id.
 */
async function applyDesignPlan(
  roomId: string,
  actions: DesignAction[],
  existingNodes: ExistingNodeContext[]
): Promise<void> {
  const idMap = new Map<string, string>(existingNodes.map((node) => [node.id, node.id]));
  const addNodeCount = actions.filter((action) => action.type === "addNode").length;
  const newPositions = computeNewNodePositions(existingNodes, addNodeCount);
  let newNodeIndex = 0;

  await liveblocks.mutateStorage(roomId, ({ root }) => {
    let flow = root.get("flow");
    if (!flow) {
      flow = new LiveObject({ nodes: new LiveMap(), edges: new LiveMap() });
      root.set("flow", flow);
    }
    const nodesMap = flow.get("nodes");
    const edgesMap = flow.get("edges");

    // `LiveObject`'s `update` method makes it invariant in its generic
    // parameter, so a freshly-constructed `new LiveObject({...})` — whose
    // shape TypeScript infers from just the fields we pass — never
    // structurally satisfies `LiveMap.set`'s expected type (the full,
    // mostly-optional `LiveblocksNode`/`LiveblocksEdge` shape derived from
    // React Flow's own `Node`/`Edge` types). That expected shape is meant
    // for reading storage back out, not for hand-constructing writes, so
    // each plain object below is built to match it at runtime (same fields
    // `components/editor/canvas.tsx`'s `addNode`/`handleConnect` write) and
    // cast once at the `LiveMap.set`/`LiveObject.set` call site.
    type StoredNode = NonNullable<ReturnType<typeof nodesMap.get>>;
    type StoredEdge = NonNullable<ReturnType<typeof edgesMap.get>>;

    for (const action of actions) {
      switch (action.type) {
        case "addNode": {
          const size = NODE_DEFAULT_SIZES[action.shape];
          const position = newPositions[newNodeIndex] ?? { x: 0, y: 0 };
          newNodeIndex += 1;

          const id = generateNodeId(action.shape);
          idMap.set(action.nodeId, id);

          const newNode = new LiveObject({
            id,
            type: "canvasNode",
            position,
            width: size.width,
            height: size.height,
            data: new LiveObject({
              label: action.label,
              color: NODE_COLORS[action.colorIndex].fill,
              shape: action.shape,
            }),
          });
          nodesMap.set(id, newNode as unknown as StoredNode);
          break;
        }
        case "moveNode": {
          const id = idMap.get(action.nodeId);
          const node = id ? nodesMap.get(id) : undefined;
          node?.set("position", { x: action.x, y: action.y });
          break;
        }
        case "resizeNode": {
          const id = idMap.get(action.nodeId);
          const node = id ? nodesMap.get(id) : undefined;
          if (node) {
            node.set("width", action.width);
            node.set("height", action.height);
          }
          break;
        }
        case "updateNodeData": {
          const id = idMap.get(action.nodeId);
          const node = id ? nodesMap.get(id) : undefined;
          const data = node?.get("data");
          if (data) {
            if (action.label !== undefined) data.set("label", action.label);
            if (action.shape !== undefined) data.set("shape", action.shape);
            if (action.colorIndex !== undefined) data.set("color", NODE_COLORS[action.colorIndex].fill);
          }
          break;
        }
        case "deleteNode": {
          const id = idMap.get(action.nodeId);
          if (id) nodesMap.delete(id);
          break;
        }
        case "addEdge": {
          const sourceId = idMap.get(action.source);
          const targetId = idMap.get(action.target);
          if (sourceId && targetId) {
            const id = generateEdgeId(sourceId, targetId);
            const newEdge = new LiveObject({
              id,
              type: "canvasEdge",
              source: sourceId,
              target: targetId,
              sourceHandle: null as string | null,
              targetHandle: null as string | null,
              markerEnd: EDGE_MARKER_END,
              data: new LiveObject({ label: action.label ?? "" }),
            });
            edgesMap.set(id, newEdge as unknown as StoredEdge);
          }
          break;
        }
        case "deleteEdge": {
          edgesMap.delete(action.edgeId);
          break;
        }
      }
    }
  });
}

// ---------------------------------------------------------------------------

/**
 * Interprets a design prompt with Gemini and applies the result to the
 * room's shared canvas — see `context/architecture-context.md`'s "AI
 * Generation Model" and `context/feature-specs/23-design-agent-logic.md`.
 */
export const designAgentTask = task({
  id: "design-agent",
  run: async (payload: DesignAgentPayload) => {
    const { prompt, roomId } = payload;

    try {
      // The room is normally created lazily on first Liveblocks auth (see
      // `app/api/liveblocks-auth/route.ts`) once a user actually opens the
      // canvas — but this task can in principle run for a room nobody has
      // opened yet, and `setPresence`/`broadcastEvent`/`mutateStorage` all
      // 404 against a room that doesn't exist. `getOrCreateRoom` is a no-op
      // if it's already there, so this is safe to call unconditionally.
      await liveblocks.getOrCreateRoom(roomId, { defaultAccesses: ["room:write"] });

      await Promise.all([
        publishStatus(roomId, "started", "Reading the current canvas…"),
        setAiPresence(roomId, true, null),
      ]);

      const { nodes: existingNodes, edges: existingEdges } = await readCanvasContext(roomId);

      await publishStatus(roomId, "thinking", "Planning the architecture…");

      const { output: plan } = await generateText({
        model: google("gemini-flash-latest"),
        output: Output.object({ schema: designPlanSchema }),
        prompt: buildPrompt(prompt, existingNodes, existingEdges),
      });

      const actions = plan.actions
        .map(normalizeAction)
        .filter((action): action is DesignAction => action !== null);
      const droppedCount = plan.actions.length - actions.length;

      logger.log("Design plan generated", {
        actionCount: actions.length,
        droppedCount,
        summary: plan.summary,
      });

      if (actions.length === 0) {
        throw new Error("The generated plan had no valid actions after validation.");
      }

      await Promise.all([
        publishStatus(roomId, "generating", plan.summary),
        setAiPresence(roomId, true, existingNodes[0]?.position ?? { x: 0, y: 0 }),
      ]);

      await applyDesignPlan(roomId, actions, existingNodes);

      await publishStatus(roomId, "complete", plan.summary);

      return { summary: plan.summary, actionCount: actions.length, droppedCount };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        // The model responded, but the response didn't validate against
        // `designPlanSchema` — logging the raw text it actually produced is
        // the only way to tell whether that's a one-off flub or a schema
        // Gemini can't reliably satisfy at all.
        logger.error("Design agent failed: model response didn't match schema", {
          text: error.text,
          cause: error.cause instanceof Error ? error.cause.message : String(error.cause),
        });
      } else {
        // `LiveblocksError` (thrown by the Node SDK on any non-2xx REST
        // response) carries an HTTP `status` and optional `details` that
        // `error.message` alone doesn't always surface — log both when
        // present so a REST-level failure (bad room id, auth, validation)
        // isn't just an empty message in the run log.
        const message = error instanceof Error ? error.message : String(error);
        const status =
          error instanceof Error && "status" in error ? (error as { status?: number }).status : undefined;
        const details =
          error instanceof Error && "details" in error
            ? (error as { details?: string }).details
            : undefined;
        logger.error("Design agent failed", { error: message, status, details });
      }
      await publishStatus(roomId, "error", "Something went wrong generating the design.").catch(
        () => {}
      );
      throw error;
    } finally {
      await clearAiPresence(roomId).catch(() => {});
    }
  },
});
