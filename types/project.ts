export type ProjectRole = "owner" | "collaborator";

export interface ProjectSummary {
  id: string;
  name: string;
  role: ProjectRole;
}
