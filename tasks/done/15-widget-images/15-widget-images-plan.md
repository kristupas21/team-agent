# Build Plan: Widget Background Images on Dashboard Widget Cards

## Overview
One new module (`src/lib/widget-images.ts`) defines the typed widget-to-image mapping. One component (`DashboardWidgetCard.tsx`) rewires to consume the mapping by optional `imageKey` prop, gains a fixed `h-40` height, and renders an absolutely-positioned `next/image` at bottom-right with the spec's blend / hover-filter classes. One call-site (`dashboard/page.tsx`) passes `imageKey="tasks"`. One new test file (`widget-images.test.ts`) asserts the map. The existing widget-card test extends from 4 → 9 cases.

## Reuse

- `src/lib/auth.ts`, `auth.config.ts`, `errors.ts`, `tasks.ts`, `users.ts`, `password.ts`, `db.ts`, `env.ts`, `utils.ts`, `redirect-rules.ts` — unchanged.
- `src/lib/validation/*.ts` — unchanged.
- `src/actions/*.ts` — unchanged.
- `src/models/*.ts` — unchanged.
- `src/middleware.ts` — unchanged.
- `src/components/ui/Card.tsx`, `Button.tsx`, `buttonClass.ts`, `Input.tsx`, `Textarea.tsx` — unchanged.
- `src/components/features/TaskCard.tsx`, `TasksList.tsx`, `TaskForm.tsx`, `MainHeader.tsx`, `MainHeaderNav.tsx`, `SignInForm.tsx`, `SignUpForm.tsx` — unchanged.
- All page files except `dashboard/page.tsx` — unchanged.
- `vitest.config.mts`, `package.json`, `tsconfig.json`, `tailwind.config.ts`, `globals.css` — unchanged. No new deps.
- Image asset `public/img/cat.png` (500×500, 287 KB) — already in place from brief preparation.
- All existing tests except `DashboardWidgetCard.test.tsx` — unchanged.

## Files to Create

### `src/lib/widget-images.ts`
- **Path**: `src/lib/widget-images.ts`
- **Type**: module (config / constants)
- **Purpose**: central widget-to-image map. The single source of truth for which image each dashboard widget displays. Extending to a new widget means adding one row.
- **Exports**:
  - `WIDGET_IMAGES` — `Record<string, WidgetImageEntry>` keyed by widget identifier. Initial entries: `tasks` → `cat.png` (500×500, alt='').
  - `WidgetImageKey` — type derived from `keyof typeof WIDGET_IMAGES`.
  - `WidgetImageEntry` — type for each map value: `Readonly<{ src: string; alt: string; width: number; height: number }>`.
- **Reference pattern**: no exact precedent in the codebase. Closest pattern: `src/components/ui/buttonClass.ts` — a typed map keyed by string with `as const` discipline. The new file follows the same `Record<…> as const` shape so `keyof typeof` derives the union cleanly.

### `__tests__/lib/widget-images.test.ts`
- **What it covers**:
  - Case 1: "WIDGET_IMAGES.tasks has src `/img/cat.png`, empty alt, and 500×500 dimensions". Single assertion per field via `toEqual`.
  - Case 2: "WidgetImageKey covers all entries in WIDGET_IMAGES". This is a compile-time fact, but a runtime sanity check: assert that `Object.keys(WIDGET_IMAGES)` is non-empty and that every key is a valid string. (Documents the contract; if a future refactor breaks the `as const` discipline, this test surfaces it.)
- **Reference pattern**: `__tests__/lib/auth-config.test.ts` — small structural assertion file for a module exporting constants. Same style: direct import, no mocks, `expect(...).toBe(...)` form.

### `__tests__/components/features/DashboardWidgetCard.test.tsx` (extended, not new — listed in Files to Modify)

## Files to Modify

### `src/components/features/DashboardWidgetCard.tsx`
- **What changes**: full rewrite (small file). New shape:
  - Import `Image` from `next/image`.
  - Import `WIDGET_IMAGES`, type `WidgetImageKey` from `@/lib/widget-images`.
  - Extend `DashboardWidgetCardProps` with optional `imageKey?: WidgetImageKey`.
  - Add a derived `image = imageKey ? WIDGET_IMAGES[imageKey] : undefined` lookup.
  - Update Card consumer className from `'group h-full cursor-pointer transition-colors hover:bg-neutral-900 md:max-w-none'` to `'group relative h-40 cursor-pointer overflow-hidden transition-colors hover:bg-neutral-900 md:max-w-none'`. The four deltas: drop `h-full`, add `relative`, add `h-40`, add `overflow-hidden`.
  - Title `<h3>` gains `relative z-10` in addition to its existing classes.
  - Render `<Image>` BEFORE the `<h3>` (DOM order) when `image` is truthy. Classes on the image: `'absolute left-[60%] top-[50%] h-auto w-32 opacity-60 mix-blend-multiply transition group-hover:grayscale group-hover:brightness-150'`. Props: `src={image.src}`, `alt={image.alt}`, `width={image.width}`, `height={image.height}`.
  - No `'use client'` directive (this is still a server component — `Link`, `Image`, and `Card` are all server-compatible).
- **Why**: realises ACs 3, 4, 5, 6, 7, 8, 9.

### `src/app/(main)/(private)/dashboard/page.tsx`
- **What changes**: one prop addition on the existing `DashboardWidgetCard` instance: `imageKey="tasks"`. Final usage: `<DashboardWidgetCard href="/dashboard/tasks" title="Tasks" imageKey="tasks" />`.
- **Why**: AC 10.

### `__tests__/components/features/DashboardWidgetCard.test.tsx`
- **What changes**: extend from 4 → 9 cases.
  - Existing 4 cases unchanged in shape:
    1. "renders the title as a heading" — pass `href="/dashboard/tasks" title="Tasks"`. No `imageKey`. Still asserts heading present.
    2. "renders as a Link pointing at the provided href" — assert Link `href`. No image involvement.
    3. "applies the dark-hover styling tokens to the heading and the card surface" — existing assertions on `group-hover:text-neutral-50` and `group`, `hover:bg-neutral-900` still hold.
    4. "does NOT render a description, an 'Updated' date line, or a Delete button" — existing.
  - 5 new cases (matching spec Assumption 18):
    5. "renders the mapped image when imageKey is provided" — pass `imageKey="tasks"`. Assert `screen.getByRole('img')` exists, has `alt=''` (so RTL queries it by `role="img"` not by alt-text), and its `src` attribute contains `cat.png` (next/image rewrites the URL but the source filename ends up in the query string).
    6. "applies the blend / hover-filter classes to the image" — assert image classList contains `opacity-60`, `mix-blend-multiply`, `group-hover:grayscale`, `group-hover:brightness-150`.
    7. "positions the image absolutely at left-[60%] top-[50%]" — assert image classList contains `absolute`, `left-[60%]`, `top-[50%]`.
    8. "applies the fixed h-40 height to the Card surface" — assert the rendered Card root has class `h-40`. The Card root is the heading's `parentElement` (per the existing test pattern at case 3).
    9. "does NOT render any image when imageKey is omitted, but still applies the fixed h-40 height" — pass `href` and `title` only. Assert `screen.queryByRole('img')` returns null. Assert the Card root still has `h-40`.
- **Reference pattern**: the existing file at `__tests__/components/features/DashboardWidgetCard.test.tsx` and the broader `__tests__/components/features/*.test.tsx` conventions. No new mocks needed (no `next/navigation` involvement; no router hooks). `next/image` does NOT need a mock — in JSDOM under vitest it renders an `<img>` tag with the same src as a query-string parameter (Next.js's default behaviour in non-production). Test querying via `getByRole('img')` works.

## Data Flow

- Server-side: `dashboard/page.tsx` (server component) renders `<DashboardWidgetCard imageKey="tasks" .../>`.
- `DashboardWidgetCard` (server component) looks up `WIDGET_IMAGES["tasks"]` synchronously at render time. The lookup is a pure object access — no async, no I/O.
- The looked-up entry's `src` is passed to `next/image`, which handles the actual HTTP fetch on the client (or static at build).
- No client-side mutation of the mapping. No state.

## State Management

- Server state: n/a (no data fetching this task).
- Client UI state: none. `DashboardWidgetCard` remains a server component.
- Global state: none.

## Types

In `src/lib/widget-images.ts`:
```ts
export type WidgetImageEntry = Readonly<{
  src: string
  alt: string
  width: number
  height: number
}>

export const WIDGET_IMAGES = {
  tasks: { src: '/img/cat.png', alt: '', width: 500, height: 500 },
} as const satisfies Readonly<Record<string, WidgetImageEntry>>

export type WidgetImageKey = keyof typeof WIDGET_IMAGES
```

Notes on type discipline:
- `satisfies` (not `:`) gives us literal-narrowed inference for `WIDGET_IMAGES` so `keyof typeof WIDGET_IMAGES` is `'tasks'` (not `string`). When new keys land, the union grows automatically.
- The `Readonly<Record<...>>` constraint guarantees every entry conforms to `WidgetImageEntry`.

In `src/components/features/DashboardWidgetCard.tsx`:
```ts
import type { WidgetImageKey } from '@/lib/widget-images'

type DashboardWidgetCardProps = Readonly<{
  href: string
  title: string
  imageKey?: WidgetImageKey
}>
```

## File Tree

```
src/
  app/(main)/(private)/dashboard/
    page.tsx                                ← MODIFY (add imageKey prop)
  components/features/
    DashboardWidgetCard.tsx                 ← MODIFY (rewrite to new shape)
  lib/
    widget-images.ts                        ← NEW (widget → image mapping)

__tests__/
  components/features/
    DashboardWidgetCard.test.tsx            ← MODIFY (4 → 9 cases)
  lib/
    widget-images.test.ts                   ← NEW (2 cases)

public/
  img/
    cat.png                                 ← already present (500×500, 287 KB)
  images/
    cat.png                                 ← already present (raw, gitignored)
```

## Build Order

1. **Create `src/lib/widget-images.ts`** with the map + types. Standalone module; no consumers yet.
2. **Edit `src/components/features/DashboardWidgetCard.tsx`** — full rewrite per the structural spec above. After this step, the dashboard page still compiles (the new `imageKey` prop is optional).
3. **Edit `src/app/(main)/(private)/dashboard/page.tsx`** — add `imageKey="tasks"`. Intermediate `npx tsc --noEmit` — expect clean.
4. **Create `__tests__/lib/widget-images.test.ts`** — 2 cases. Run scoped: `npm run test:run -- __tests__/lib/widget-images.test.ts`.
5. **Edit `__tests__/components/features/DashboardWidgetCard.test.tsx`** — keep existing 4 cases, add 5 new cases. Run scoped: `npm run test:run -- __tests__/components/features/DashboardWidgetCard.test.tsx`.
6. **Verify**: `npx tsc --noEmit`, `npx next lint`, `npm run test:run`, `npx next build`. All four must exit 0. Route table unchanged from `14-minor-rework`.
7. **Diagnostic sweep**: `mcp__ide__getDiagnostics` clean.
8. **Build artefacts**: write `tasks/widget-images-build-summary.md`, `widget-images-test-results.md`, `widget-images-review.md`.
