# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Feature: Clerk Authentication (context/feature-specs/03-auth.md)

## Current Goal

- Next feature spec in `context/feature-specs/`.

## Completed

- 01-design-system.md: shadcn/ui initialized (components.json, style base-nova); added button, card, dialog, input, tabs, textarea, scroll-area to `components/ui/*` (unmodified post-install); lucide-react installed; `lib/utils.ts` `cn()` helper generated; `app/globals.css` dark-only palette wired to `context/ui-context.md` tokens (bg-base/surface/elevated/subtle, copy-primary/secondary/muted/faint, brand, accent-dim, ai, ai-text, error/success/warning) and mapped onto shadcn's semantic tokens; `<html>` forced to `dark` class in `app/layout.tsx`. Verified: `tsc --noEmit`, `next build`, `eslint .` all clean; smoke-tested every installed component import + `cn()` then removed the scratch page.
- 02-editor.md: `components/editor/editor-navbar.tsx` — fixed-height (`h-14`) top bar, left/centre/right sections, left holds a sidebar toggle button swapping `PanelLeftOpen`/`PanelLeftClose` on `isSidebarOpen`, right section left empty, `bg-surface` + `border-b border-surface-border`. `components/editor/project-sidebar.tsx` — floating overlay (`absolute`, doesn't push layout), slides in/out via `translate-x` transition on `isOpen`, header with "Project" title + close button, shadcn `Tabs` ("My Projects" / "Shared") each with an empty placeholder state, full-width `New Project` button with `Plus` icon pinned to the bottom. `components/ui/dialog.tsx` restyled to the modal token pattern from `context/ui-context.md` (`rounded-3xl` content/footer, stronger `backdrop-blur-sm` overlay); Title/Description/Footer sub-components already existed from shadcn install and are untouched — no actual dialog instances built yet. Wired `EditorNavbar` + `ProjectSidebar` into `app/page.tsx` as the editor shell with sidebar-open state. Verified: `tsc --noEmit`, `eslint .`, `next build` all clean.
- 03-auth.md: installed `@clerk/ui`. `proxy.ts` (root, Next 16's rename of `middleware.ts`) runs `clerkMiddleware` with a protected-first `createRouteMatcher` built from `NEXT_PUBLIC_CLERK_SIGN_IN_URL`/`NEXT_PUBLIC_CLERK_SIGN_UP_URL` (added to `.env` — Clerk's own conventional var names, not invented) as the only public routes; everything else runs `auth.protect()`. `app/layout.tsx` wraps `{children}` in `ClerkProvider` (inside `<body>`, per current Clerk SDK placement) with `appearance.theme: dark` from `@clerk/ui/themes` and every `appearance.variables` color/font/radius entry pointed at the app's existing `--*` CSS custom properties from `app/globals.css` — no hardcoded colors, including `colorModalBackdrop` via `color-mix()` off `--bg-base`. `components/auth/auth-layout.tsx` — two-panel layout (`grid lg:grid-cols-2`): left panel (`hidden lg:flex`) has a compact `Ghost` logo mark + wordmark, a one-line tagline, and a text-only feature list (no cards, no gradients, no hero); right panel centers the Clerk form; small screens collapse to form-only. `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx` render `<SignIn />`/`<SignUp />` inside `AuthLayout`. Editor content moved from `app/page.tsx` to `app/editor/page.tsx` (unchanged otherwise); `app/page.tsx` is now a server component that awaits `auth()` and redirects — authenticated to `/editor`, unauthenticated to `/sign-in` (the proxy also catches unauthenticated `/` and `/editor` before the page runs, since only sign-in/up are public). `UserButton` added to `EditorNavbar`'s right section (default Clerk menu/profile flows, untouched). Verified: `tsc --noEmit`, `eslint .`, `next build` all clean; smoke-tested with `next dev` — unauthenticated `/` and `/editor` both 307 to `/sign-in`, `/sign-in` renders 200 with the two-panel layout.
- 03-auth.md follow-up (visual pass against a reference screenshot): reworked `components/auth/auth-layout.tsx` to a true 50/50 `lg:grid-cols-2` split with `bg-subtle` on the left panel (vs. `bg-base` on the right) so the two halves read as distinct surfaces; left panel now carries a bold two-line headline, a description paragraph, and an icon-marked feature list (`Sparkles`/`Share2`/`FileText` in `bg-accent-dim` chips — icons only, no bordered/shadowed cards) plus a footer copyright line, replacing the earlier plain-text-only version. Added `components/logo.tsx` (brand-colored mark + "Ghost AI" wordmark) reused for the panel header. Verified visually with a Playwright screenshot of `/sign-in` (Chromium installed ad hoc via `npm install --no-save playwright`, not added as a project dependency) confirming Geist Sans renders throughout, including inside the Clerk widget.

## In Progress

- None yet.

## Next Up

- Next feature spec in `context/feature-specs/` (center canvas / React Flow integration is implied by `context/ui-context.md`'s Canvas section but not yet speced).

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Add decisions that affect the system design or data model.

## Session Notes

- 02-editor.md contained several literal typos that were corrected rather than followed verbatim: file paths `components/editor/editor-nafbar.tsx` and `component/editor/product-projects-sidebar.tsx` → `components/editor/editor-navbar.tsx` and `components/editor/project-sidebar.tsx`; icon name `PanelLeftCLose` → `PanelLeftClose` (verified against the installed `lucide-react` exports). All functional requirements (sections, tabs, buttons, slide-in behaviour, dialog token pattern) were implemented as written.
- 03-auth.md said to "define public routes using the existing sign-in and sign-up env vars" but `.env` only had the publishable/secret keys — `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` were added since those are Clerk's own conventional var names (not invented), which the spec separately requires ("do not rename or invent new ones").
