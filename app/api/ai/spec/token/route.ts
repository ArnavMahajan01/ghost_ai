import { auth } from "@trigger.dev/sdk";

import { prisma } from "@/lib/prisma";
import { getCurrentIdentity } from "@/lib/project-access";

interface SpecTokenRequestBody {
  runId: string;
}

function isSpecTokenRequestBody(value: unknown): value is SpecTokenRequestBody {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SpecTokenRequestBody).runId === "string" &&
    (value as SpecTokenRequestBody).runId.trim().length > 0
  );
}

/** Mints a run-scoped public access token for a spec-generation run, after confirming the caller owns that run. Same shape as `app/api/ai/design/token/route.ts`, but with the spec's explicit 1-hour expiration. */
export async function POST(request: Request) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!isSpecTokenRequestBody(body)) {
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
    expirationTime: "1h",
  });

  return Response.json({ token });
}
