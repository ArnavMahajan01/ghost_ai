import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="h-8 w-8 rounded-lg bg-brand" />
      <span className="text-lg font-semibold text-copy-primary">
        Ghost AI
      </span>
    </div>
  );
}
