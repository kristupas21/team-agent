# Widget Images Fix — Tune Card Height and Image Positioning

## Description

Quick visual tweak to `DashboardWidgetCard`. The user dialled in the desired look in devtools; this task ports those exact values into the codebase.

User-confirmed values from devtools:
- Card height: `16rem` (was `10rem` / `h-40`).
- Image: `width: 30rem`, `left: unset`, `right: -5rem`, `top: 15%` (was `width: 8rem`, `left: 60%`, `top: 50%`).

The brief explicitly asks for a fast, focused fix — no scope creep, no regression-testing rituals beyond the essentials.

## Scope

### In scope
- `src/components/features/DashboardWidgetCard.tsx`: update the Card height token and the image positioning + size classes to match the devtools-confirmed values.
- `__tests__/components/features/DashboardWidgetCard.test.tsx`: update the two affected assertions (the position-classes test and the fixed-height test) to match the new values. No new cases.

### Out of scope
- Any change to `widget-images.ts`, `cat.png`, or the dashboard page.
- Any change to other components, primitives, actions, middleware, etc.
- Re-evaluating the blend / hover-filter classes (those still work — only position and size change).

## Target Classes

### Card className
Was: `'group relative h-40 cursor-pointer overflow-hidden transition-colors hover:bg-neutral-900 md:max-w-none'`

New: `'group relative h-64 cursor-pointer overflow-hidden transition-colors hover:bg-neutral-900 md:max-w-none'`

(Only `h-40` → `h-64`. `h-64` = `16rem` in Tailwind. The rest is unchanged.)

### Image className
Was: `'absolute left-[60%] top-[50%] h-auto w-32 opacity-60 mix-blend-multiply transition group-hover:grayscale group-hover:brightness-150'`

New: `'absolute -right-20 top-[15%] h-auto w-[30rem] opacity-60 mix-blend-multiply transition group-hover:grayscale group-hover:brightness-150'`

Mapping:
- `left-[60%]` → removed (replaced by `right`-anchored positioning).
- `top-[50%]` → `top-[15%]`.
- `w-32` (8rem) → `w-[30rem]`.
- Added `-right-20` (which is `right: -5rem` in Tailwind, since `20 × 0.25rem = 5rem`).

The image's negative `right` (`-5rem`) means it extends 5rem past the right edge of the Card. `overflow-hidden` on the Card crops it. That's intentional — the cat illustration peeks out of the right side, creating the "partial background" effect at a much larger visual scale.

## Tests to Update

### `__tests__/components/features/DashboardWidgetCard.test.tsx`

- Test 7 ("positions the image absolutely at left-[60%] top-[50%]") — rename to reflect the new position, and update the assertion classes:
  - Was: `toHaveClass('absolute', 'left-[60%]', 'top-[50%]')`.
  - New: `toHaveClass('absolute', '-right-20', 'top-[15%]')`.
- Test 8 ("applies the fixed h-40 height to the Card surface") — rename and update:
  - Was: `toHaveClass('h-40')`.
  - New: `toHaveClass('h-64')`.
- Test 9 ("does NOT render any image when imageKey is omitted, but still applies the fixed h-40 height") — update the height assertion:
  - Was: `toHaveClass('h-40')`.
  - New: `toHaveClass('h-64')`.

That's 3 in-place assertion updates. No new cases. Case count stays at 9.

## Open Questions

None worth flagging. The user has given exact values from devtools; the spec-agent just transcribes them into Tailwind tokens. If a "different styling approach would be better" surfaces during implementation (per the draft), the builder may swap mechanisms (e.g. `transform: translate(...)` instead of `top`/`right`) as long as the final rendered position matches the devtools spec exactly. Lean: keep the simple absolute positioning + arbitrary Tailwind values — fastest path, smallest diff.

## Done Criteria

- `DashboardWidgetCard` Card surface has `h-64` (16rem tall).
- Image has `absolute`, `-right-20`, `top-[15%]`, `w-[30rem]`, plus the unchanged blend / hover-filter classes.
- `image className` no longer contains `left-[60%]` or `top-[50%]` or `w-32`.
- `npm run test:run`, `tsc --noEmit`, `npx next lint`, `npx next build` all green.
- Suite total stays at 165 / 23 (no new cases, just in-place updates).

## What This Task Does NOT Include

- New widgets, new images, new mapping entries.
- Refactoring `widget-images.ts` or `DashboardWidgetCard`'s prop surface.
- Visual regression smoke beyond eyeballing during `npm run dev` if desired.
- Any change unrelated to the Card height / image position+size.
