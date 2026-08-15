import type { Project } from "@/types/project";

export const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    name: "Checkout Service",
    slug: "checkout-service",
    role: "owner",
  },
  {
    id: "2",
    name: "Auth Gateway",
    slug: "auth-gateway",
    role: "owner",
  },
  {
    id: "3",
    name: "Notification Pipeline",
    slug: "notification-pipeline",
    role: "collaborator",
  },
];
