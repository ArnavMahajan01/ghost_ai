import { get, put } from "@vercel/blob";

import { prisma } from "@/lib/prisma";
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access";
import type { CanvasSnapshot } from "@/types/canvas";

// Stable per-project pathname (not the default random-suffixed one) so every
// save overwrites the same blob instead of leaving old snapshots orphaned —
// Prisma's `canvasJsonPath` only ever needs to track one URL per project.
function canvasBlobPathname(projectId: string): string {
  return `projects/${projectId}/canvas.json`;
}

function isCanvasSnapshot(value: unknown): value is CanvasSnapshot {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as CanvasSnapshot).nodes) &&
    Array.isArray((value as CanvasSnapshot).edges)
  );
}

/** Uploads the latest canvas JSON to Vercel Blob and stores its URL on the project record. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const access = await checkProjectAccess(projectId, identity);

  if (!access) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  if (!isCanvasSnapshot(body)) {
    return Response.json({ error: "Invalid canvas payload" }, { status: 400 });
  }

  // `private` — this project's Blob store is configured for private access
  // only; `public` is rejected outright. Reading a private blob back
  // (the GET handler below) needs the `get()` helper instead of a plain
  // `fetch()`, since the URL alone isn't enough to authenticate the read.
  const blob = await put(canvasBlobPathname(projectId), JSON.stringify(body), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  await prisma.project.update({
    where: { id: projectId },
    data: { canvasJsonPath: blob.url },
  });

  return Response.json({ url: blob.url });
}

/** Reads the project's saved blob URL from Prisma, then fetches the canvas JSON from Vercel Blob. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const access = await checkProjectAccess(projectId, identity);

  if (!access) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { canvasJsonPath: true },
  });

  if (!project?.canvasJsonPath) {
    return Response.json({ nodes: [], edges: [] } satisfies CanvasSnapshot);
  }

  const blobResult = await get(project.canvasJsonPath, { access: "private", useCache: false }).catch(
    () => null
  );

  if (!blobResult?.stream) {
    return Response.json({ nodes: [], edges: [] } satisfies CanvasSnapshot);
  }

  const snapshot = await new Response(blobResult.stream).json().catch(() => null);

  if (!isCanvasSnapshot(snapshot)) {
    return Response.json({ nodes: [], edges: [] } satisfies CanvasSnapshot);
  }

  return Response.json(snapshot);
}
