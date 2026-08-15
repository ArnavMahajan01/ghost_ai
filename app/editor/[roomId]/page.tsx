import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/editor/access-denied";
import { EditorShell } from "@/components/editor/editor-shell";
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access";
import { getUserProjects } from "@/lib/projects";

export default async function WorkspacePage(
  props: PageProps<"/editor/[roomId]">
) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    redirect("/sign-in");
  }

  const { roomId } = await props.params;

  const [activeProject, { owned, shared }] = await Promise.all([
    checkProjectAccess(roomId, identity),
    getUserProjects(identity.userId, identity.email),
  ]);

  if (!activeProject) {
    return <AccessDenied />;
  }

  return (
    <EditorShell
      ownedProjects={owned}
      sharedProjects={shared}
      activeProject={activeProject}
    />
  );
}
