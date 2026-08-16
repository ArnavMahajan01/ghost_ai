import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { logger, metadata, schemaTask } from "@trigger.dev/sdk";

import { prisma } from "@/lib/prisma";
import { generateSpecPayloadSchema } from "@/types/tasks";
import type { ChatFeedMessage, SpecEdge, SpecNode } from "@/types/tasks";

/** Matches `context/architecture-context.md`'s Storage Model: "specs at `specs/{projectId}/{specId}.md`". */
function specBlobPathname(projectId: string, specId: string): string {
  return `specs/${projectId}/${specId}.md`;
}

/** Trims chat history to the most recent messages — enough conversational context without unbounded prompt growth. */
const MAX_CHAT_MESSAGES_IN_PROMPT = 30;

function buildPrompt(
  chatHistory: ChatFeedMessage[],
  nodes: SpecNode[],
  edges: SpecEdge[]
): string {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  const nodesSummary = nodes.length
    ? nodes
        .map((node) => `- ${node.data.label || "(untitled)"} [${node.data.shape}] (id: ${node.id})`)
        .join("\n")
    : "(no nodes on the canvas yet)";

  const edgesSummary = edges.length
    ? edges
        .map((edge) => {
          const source = nodesById.get(edge.source)?.data.label ?? edge.source;
          const target = nodesById.get(edge.target)?.data.label ?? edge.target;
          const label = edge.data?.label ? ` (${edge.data.label})` : "";
          return `- ${source} → ${target}${label}`;
        })
        .join("\n")
    : "(no connections on the canvas yet)";

  const recentChat = chatHistory.slice(-MAX_CHAT_MESSAGES_IN_PROMPT);
  const chatSummary = recentChat.length
    ? recentChat.map((message) => `${message.role === "user" ? message.sender : "Ghost AI"}: ${message.content}`).join("\n")
    : "(no chat history)";

  return [
    "You are a technical writer producing a Markdown system design specification from a collaborative architecture diagram and its design conversation.",
    "",
    "Write a clear, well-structured Markdown document with headings for at least: Overview, Components, Data Flow / Relationships, and any notable Design Decisions drawn from the conversation.",
    "Reference components by their actual labels from the diagram below. Do not invent components that aren't in the diagram.",
    "Output only the Markdown document — no commentary before or after it, no code fences wrapping the whole thing.",
    "",
    `Diagram components (${nodes.length}):`,
    nodesSummary,
    "",
    `Diagram connections (${edges.length}):`,
    edgesSummary,
    "",
    "Design conversation:",
    chatSummary,
  ].join("\n");
}

/**
 * Generates a Markdown technical spec from the current canvas graph and
 * chat context — see `context/architecture-context.md`'s "Spec Generation"
 * model and `context/feature-specs/27-spec-generation-flow.md`. Payload
 * validation is handled by `schemaTask` itself (a bad payload throws
 * `TaskPayloadParsedError` and skips retrying), matching this codebase's
 * existing Trigger.dev task patterns.
 */
export const generateSpecTask = schemaTask({
  id: "generate-spec",
  schema: generateSpecPayloadSchema,
  run: async (payload) => {
    const { projectId, roomId, chatHistory, nodes, edges } = payload;

    metadata.set("status", "reading-context");
    logger.log("Generating spec", {
      projectId,
      roomId,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      chatMessageCount: chatHistory.length,
    });

    metadata.set("status", "generating");

    const { text } = await generateText({
      model: google("gemini-flash-latest"),
      prompt: buildPrompt(chatHistory, nodes, edges),
    });

    metadata.set("status", "saving");

    // The spec id is generated up front (rather than left to Prisma's own
    // `@default(cuid())`) so it can double as the Blob pathname's unique
    // component before the row exists — same reasoning as the canvas
    // route's stable pathname, just per-spec instead of per-project since
    // specs accumulate rather than overwrite (see `context/feature-specs/28-spec-persistence-download.md`).
    const specId = randomUUID();
    const blob = await put(specBlobPathname(projectId, specId), text, {
      access: "private",
      contentType: "text/markdown",
      addRandomSuffix: false,
    });

    await prisma.projectSpec.create({
      data: { id: specId, projectId, filePath: blob.url },
    });

    metadata.set("status", "complete");

    return { markdown: text, specId };
  },
});
