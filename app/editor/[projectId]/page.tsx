import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { EditorShell } from "@/components/editor/editor-shell";
import { getProjectForViewer, getUserProjects } from "@/lib/projects";

export default async function WorkspacePage(
  props: PageProps<"/editor/[projectId]">
) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { projectId } = await props.params;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  const [activeProject, { owned, shared }] = await Promise.all([
    getProjectForViewer(projectId, userId, email),
    getUserProjects(userId, email),
  ]);

  if (!activeProject) {
    notFound();
  }

  return (
    <EditorShell
      ownedProjects={owned}
      sharedProjects={shared}
      activeProject={activeProject}
    />
  );
}
