import { clerkClient } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import type { CollaboratorSummary } from "@/types/collaborator";

/**
 * Lists a project's collaborators, enriched with Clerk display name/avatar
 * where a matching Clerk user exists for the stored email. Collaborators
 * are stored by email only (no local user table) — Clerk is the source of
 * truth for name/avatar, looked up in one batch call.
 */
export async function listCollaborators(
  projectId: string
): Promise<CollaboratorSummary[]> {
  const collaborators = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });

  if (collaborators.length === 0) return [];

  const emails = collaborators.map((c) => c.email);
  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({
    emailAddress: emails,
    limit: emails.length,
  });

  // `emailAddress` filtering on the Backend API is a partial match, so
  // re-verify each returned user actually has one of the exact emails we
  // asked for before trusting it as a match.
  const wanted = new Set(emails.map((email) => email.toLowerCase()));
  const byEmail = new Map<string, { name: string | null; imageUrl: string | null }>();
  for (const user of users) {
    const match = user.emailAddresses.find((address) =>
      wanted.has(address.emailAddress.toLowerCase())
    );
    if (!match) continue;
    byEmail.set(match.emailAddress.toLowerCase(), {
      name: user.fullName,
      imageUrl: user.hasImage ? user.imageUrl : null,
    });
  }

  return collaborators.map((collaborator) => {
    const enriched = byEmail.get(collaborator.email.toLowerCase());
    return {
      id: collaborator.id,
      email: collaborator.email,
      name: enriched?.name ?? null,
      imageUrl: enriched?.imageUrl ?? null,
    };
  });
}
