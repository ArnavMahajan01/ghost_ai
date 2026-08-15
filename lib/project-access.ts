import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import type { ProjectRole } from "@/types/project";

export interface ClerkIdentity {
  userId: string;
  email: string | null;
}

/**
 * Resolves the current Clerk identity (user id + primary email) for
 * server-side access checks. Returns `null` when signed out.
 */
export async function getCurrentIdentity(): Promise<ClerkIdentity | null> {
  const { userId } = await auth();

  if (!userId) return null;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  return { userId, email };
}

export interface ProjectAccess {
  id: string;
  name: string;
  role: ProjectRole;
}

/**
 * Checks whether the given identity can access a project — as the owner or
 * as a collaborator (matched by email). Returns `null` if the project
 * doesn't exist or the identity has no access, so callers can treat
 * "not found" and "not authorized" the same way (`AccessDenied`).
 */
export async function checkProjectAccess(
  projectId: string,
  identity: ClerkIdentity
): Promise<ProjectAccess | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      collaborators: identity.email
        ? { where: { email: identity.email }, select: { id: true } }
        : false,
    },
  });

  if (!project) return null;

  const isOwner = project.ownerId === identity.userId;
  const isCollaborator = (project.collaborators?.length ?? 0) > 0;

  if (!isOwner && !isCollaborator) return null;

  const role: ProjectRole = isOwner ? "owner" : "collaborator";

  return { id: project.id, name: project.name, role };
}
