import { clerkClient } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import type { CollaboratorSummary } from "@/types/collaborator";

// The Clerk Backend API's `emailAddress` filter accepts at most 100 values
// per request, so larger collaborator lists have to be looked up in batches.
const CLERK_EMAIL_BATCH_SIZE = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Lists a project's collaborators, enriched with Clerk display name/avatar
 * where a matching Clerk user exists for the stored email. Collaborators
 * are stored by email only (no local user table) — Clerk is the source of
 * truth for name/avatar, looked up in batches of at most 100 emails.
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

  // Clerk enrichment is best effort — the collaborator rows themselves are
  // already persisted in Postgres, so a Clerk outage or lookup failure
  // shouldn't fail the whole request (POST would otherwise report an
  // invitation as failed even though it succeeded, and a retry would then
  // 409 on the unique constraint; GET would be unavailable outright).
  const byEmail = new Map<string, { name: string | null; imageUrl: string | null }>();
  try {
    const client = await clerkClient();
    const batches = await Promise.all(
      chunk(emails, CLERK_EMAIL_BATCH_SIZE).map((batch) =>
        client.users.getUserList({ emailAddress: batch, limit: batch.length })
      )
    );
    const users = batches.flatMap(({ data }) => data);

    // `emailAddress` filtering on the Backend API is a partial match, so
    // re-verify each returned user actually has one of the exact emails we
    // asked for before trusting it as a match.
    const wanted = new Set(emails.map((email) => email.toLowerCase()));
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
  } catch (error) {
    console.error("Clerk collaborator enrichment failed", error);
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
