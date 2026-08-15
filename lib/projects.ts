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
