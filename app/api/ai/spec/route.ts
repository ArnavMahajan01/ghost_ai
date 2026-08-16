import { tasks } from "@trigger.dev/sdk";

import { prisma } from "@/lib/prisma";
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access";
import type { generateSpecTask } from "@/trigger/generate-spec";
import { generateSpecRequestSchema } from "@/types/tasks";

/**
 * Triggers spec generation and records the run so its token/ownership can
 * be checked later — same shape as `app/api/ai/design/route.ts`. The
 * request body has no `projectId` field at all (see
 * `generateSpecRequestSchema`'s comment) — the room's project access check
 * below is what resolves `roomId` into a trusted `projectId`, per the
 * spec's explicit "do not trust a client-supplied projectId."
 */
export async function POST(request: Request) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = generateSpecRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { roomId, chatHistory, nodes, edges } = parsed.data;

  const access = await checkProjectAccess(roomId, identity);

  if (!access) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const handle = await tasks.trigger<typeof generateSpecTask>("generate-spec", {
    projectId: access.id,
    roomId,
    chatHistory,
    nodes,
    edges,
  });

  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId: access.id,
      userId: identity.userId,
    },
  });

  return Response.json({ runId: handle.id });
}
