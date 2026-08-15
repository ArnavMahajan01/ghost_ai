export interface CollaboratorSummary {
  id: string;
  email: string;
  /** Clerk display name, when a matching Clerk user was found for the email. */
  name: string | null;
  /** Clerk avatar URL, when a matching Clerk user was found for the email. */
  imageUrl: string | null;
}
