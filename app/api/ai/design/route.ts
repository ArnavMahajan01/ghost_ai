import { tasks } from "@trigger.dev/sdk";

import { prisma } from "@/lib/prisma";
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access";
import type { designAgentTask } from "@/trigger/design-agent";

interface DesignRequestBody {
  prompt: string;
  roomId: string;
  projectId: string;
}

function isDesignRequestBody(value: unknown): value is DesignRequestBody {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as DesignRequestBody).prompt === "string" &&
    (value as DesignRequestBody).prompt.trim().length > 0 &&
    typeof (value as DesignRequestBody).roomId === "string" &&
    typeof (value as DesignRequestBody).projectId === "string"
  );
}

/** Triggers the design task and records the run so its token/ownership can be checked later. */
export async function POST(request: Request) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!isDesignRequestBody(body)) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const access = await checkProjectAccess(body.projectId, identity);

  if (!access) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const handle = await tasks.trigger<typeof designAgentTask>("design-agent", {
    prompt: body.prompt,
    roomId: body.roomId,
  });

  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId: body.projectId,
      userId: identity.userId,
    },
  });

  return Response.json({ runId: handle.id });
}
