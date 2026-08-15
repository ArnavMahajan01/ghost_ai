import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  {
    params,
  }: { params: Promise<{ projectId: string; collaboratorId: string }> }
) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, collaboratorId } = await params;
  const access = await checkProjectAccess(projectId, identity);

  if (!access) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (access.role !== "owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const collaborator = await prisma.projectCollaborator.findUnique({
    where: { id: collaboratorId },
  });

  if (!collaborator || collaborator.projectId !== projectId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.projectCollaborator.delete({ where: { id: collaboratorId } });

  return new Response(null, { status: 204 });
}
