export interface Project {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "collaborator";
}
