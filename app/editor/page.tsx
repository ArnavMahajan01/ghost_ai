import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { EditorShell } from "@/components/editor/editor-shell";
import { getUserProjects } from "@/lib/projects";

export default async function EditorHomePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  const { owned, shared } = await getUserProjects(userId, email);

  return <EditorShell ownedProjects={owned} sharedProjects={shared} />;
}
