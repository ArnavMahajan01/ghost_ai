import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const existing = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.ownerId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name || name.length > 120) {
    return Response.json({ error: "Name is required and small in length" }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { name },
  });

  return Response.json(project);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const existing = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.ownerId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.project.delete({ where: { id: projectId } });

  return new Response(null, { status: 204 });
}
