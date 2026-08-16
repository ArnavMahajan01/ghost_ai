import { prisma } from "@/lib/prisma";
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access";

/**
 * Lists a project's generated specs — metadata only (`id`/`createdAt`, plus
 * a derived display `filename`), never `filePath`/the Blob URL itself. Per
 * `context/feature-specs/29-spec-ui-integration.md`'s "assume ProjectSpec
 * only provides metadata, content must be fetched separately" — the only
 * route that reads the Blob is the download route.
 */
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

  const specs = await prisma.projectSpec.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  return Response.json({
    specs: specs.map((spec) => ({
      id: spec.id,
      createdAt: spec.createdAt,
      filename: `spec-${spec.id}.md`,
    })),
  });
}
