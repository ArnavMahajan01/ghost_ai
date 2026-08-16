import { auth } from "@trigger.dev/sdk";

import { prisma } from "@/lib/prisma";
import { getCurrentIdentity } from "@/lib/project-access";

interface DesignTokenRequestBody {
  runId: string;
}

function isDesignTokenRequestBody(value: unknown): value is DesignTokenRequestBody {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as DesignTokenRequestBody).runId === "string" &&
    (value as DesignTokenRequestBody).runId.trim().length > 0
  );
}

/** Mints a run-scoped public access token, after confirming the caller owns that run. */
export async function POST(request: Request) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!isDesignTokenRequestBody(body)) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const taskRun = await prisma.taskRun.findUnique({
    where: { runId: body.runId },
  });

  if (!taskRun || taskRun.userId !== identity.userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = await auth.createPublicToken({
    scopes: { read: { runs: [taskRun.runId] } },
  });

  return Response.json({ token });
}
