import { get } from "@vercel/blob";

import { prisma } from "@/lib/prisma";
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access";

/**
 * Streams a generated spec's Markdown content — the only route that ever
 * touches `ProjectSpec.filePath`/Vercel Blob directly. Used both for actual
 * downloads (a real navigation, which honors `Content-Disposition`) and for
 * the sidebar's preview modal (a `fetch()` read of the same response body,
 * which ignores that header) — see `context/feature-specs/29-spec-ui-integration.md`,
 * which deliberately doesn't ask for a second read-only endpoint.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; specId: string }> }
) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, specId } = await params;
  const access = await checkProjectAccess(projectId, identity);

  if (!access) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const spec = await prisma.projectSpec.findUnique({ where: { id: specId } });

  // Same "not found and wrong project both read as 404" non-disclosure
  // pattern `checkProjectAccess` already uses — a spec id valid for a
  // *different* project shouldn't reveal that it exists at all.
  if (!spec || spec.projectId !== projectId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const blobResult = await get(spec.filePath, { access: "private", useCache: false }).catch(
    () => null
  );

  if (!blobResult?.stream) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(blobResult.stream, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="spec-${specId}.md"`,
    },
  });
}
