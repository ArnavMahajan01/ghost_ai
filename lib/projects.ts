import { prisma } from "@/lib/prisma";
import type { ProjectSummary } from "@/types/project";

/**
 * Server-side data helper for the editor home / workspace pages. Fetches
 * owned and shared (collaborator) projects for the current user directly
 * via Prisma — used from Server Components for the initial render, so
 * there's no client-side fetch on first load.
 */
export async function getUserProjects(
  userId: string,
  email: string | null
): Promise<{ owned: ProjectSummary[]; shared: ProjectSummary[] }> {
  const [owned, shared] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
    email
      ? prisma.project.findMany({
          where: { collaborators: { some: { email } } },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    owned: owned.map((project) => ({ ...project, role: "owner" as const })),
    shared: shared.map((project) => ({
      ...project,
      role: "collaborator" as const,
    })),
  };
}

/**
 * Fetches a single project for the workspace page, scoped to viewers who
 * either own it or are a collaborator on it. Returns `null` if the project
 * doesn't exist or the current user has no access to it.
 */
export async function getProjectForViewer(
  projectId: string,
  userId: string,
  email: string | null
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      collaborators: email ? { where: { email }, select: { id: true } } : false,
    },
  });

  if (!project) return null;

  const isOwner = project.ownerId === userId;
  const isCollaborator = (project.collaborators?.length ?? 0) > 0;

  if (!isOwner && !isCollaborator) return null;

  const role: ProjectSummary["role"] = isOwner ? "owner" : "collaborator";

  return { id: project.id, name: project.name, role };
}
