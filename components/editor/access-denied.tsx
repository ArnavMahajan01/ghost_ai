import { Lock } from "lucide-react";
import Link from "next/link";

export function AccessDenied() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-base px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-dim">
        <Lock className="h-5 w-5 text-brand" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-medium text-copy-primary">
          Access denied
        </h1>
        <p className="text-sm text-copy-muted">
          You don&apos;t have access to this project, or it doesn&apos;t
          exist.
        </p>
      </div>
      <Link
        href="/editor"
        className="text-sm text-brand underline underline-offset-4 hover:text-brand/80"
      >
        Back to editor
      </Link>
    </div>
  );
}
