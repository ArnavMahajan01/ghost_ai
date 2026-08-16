interface GhostIconProps {
  className?: string;
}

/**
 * The app's brand mark — same shape as `app/icon.svg`/`assets/icon.svg`
 * (the site favicon/apple-icon), reused as a real component wherever the
 * app needs its own icon inline rather than a generic lucide one (the
 * shared `Logo`, the AI sidebar's "Ghost AI" branding).
 *
 * Body color follows `currentColor` (set it via a `text-*` className, same
 * convention every lucide icon in this codebase already uses) so it works
 * on any surface; the eyes are pinned to `--bg-base` so they read as
 * cutouts against the body regardless of what color that ends up being.
 */
export function GhostIcon({ className }: GhostIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 12a6 6 0 0 1 12 0v9l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z"
        fill="currentColor"
      />
      <circle cx="9.9" cy="12.6" r="1.15" fill="var(--bg-base)" />
      <circle cx="14.1" cy="12.6" r="1.15" fill="var(--bg-base)" />
    </svg>
  );
}
