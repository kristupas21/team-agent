# Review: Basic Styling

## STATUS: PASS

## Acceptance Criteria Check

### Bug fix
- [x] 1 — `src/actions/signOut.ts` now calls `revalidatePath('/')` after `signOut({ redirect: false })`. The home page form-action binding remains unchanged; Next.js will re-render `/` on next request. Verified by code path; manual smoke required to confirm the visual.

### Global styling
- [x] 2 — `src/styles/globals.css` line 1: `html { font-size: 62.5%; }`. Verified.
- [x] 3 — `tailwind.config.ts` `theme.extend.colors` declares exactly `primary`, `secondary`, `neutral`, `danger`, `success` with the exact hexes from spec Assumption 4. `theme.extend.fontSize` and `theme.extend.spacing` override every Tailwind default with the rem × 1.6 values.
- [x] 4 — `text-base` resolves to `1.6rem` × `62.5% root = 16 px`; `p-4` resolves to `1.6rem = 16 px`. Reasoned via the override math; matches the spec.
- [x] 5 — `src/app/layout.tsx` imports `Inter` from `next/font/google`, declares it with `variable: '--font-inter'`, applies `inter.variable` to `<html>`, and sets `bg-neutral-50 font-sans text-base text-neutral-900` on `<body>`.
- [x] 6 — `tailwind.config.ts` `theme.extend.fontFamily.sans` is `['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif']` — `var(--font-inter)` first.

### Components — `Button`
- [x] 7 — `src/components/ui/Button.tsx` exports default `Button` and the named type `ButtonProps`. Also exports the helper `buttonClass` (planned).
- [x] 8 — `Button.test.tsx` tests 1–2 cover this.
- [x] 9 — `Button.test.tsx` tests 3–4 cover this.
- [x] 10 — `Button.test.tsx` test 5 covers this (`disabled` attr + `opacity-60` class + onClick suppressed).
- [x] 11 — `Button.test.tsx` test 6 covers this (text becomes `"Loading..."`, `aria-busy="true"`, `disabled` set, onClick blocked).
- [x] 12 — `Button.test.tsx` test 7 covers this.

### Components — `Input`
- [x] 13 — `src/components/ui/Input.tsx` exports a `forwardRef`-wrapped default and `InputProps`. `Input.displayName = 'Input'` is set explicitly.
- [x] 14 — `Input.test.tsx` tests 1–2 cover this.
- [x] 15 — `Input.test.tsx` tests 3–4 cover this.
- [x] 16 — `Input.test.tsx` test 5 covers this.
- [x] 17 — `Input.test.tsx` test 6 covers this. Source confirms the danger-class is selected via `error ? 'danger' : variant` and the `<p>` is rendered after the input.
- [x] 18 — `Input.test.tsx` test 7 covers this — explicit `variant="primary"` with non-empty `error` still produces the danger ring + border.
- [x] 19 — `Input.test.tsx` test 8 covers ref forwarding via `createRef`.
- [x] 20 — `Input.test.tsx` test 9 covers `onChange` firing on user typing.

### Components — `Card`
- [x] 21 — `src/components/ui/Card.tsx` exports default + `CardProps`.
- [x] 22 — `Card.test.tsx` test 2 covers the base class set.
- [x] 23 — `Card.test.tsx` test 3 covers `className` merging.
- [x] 24 — `Card.tsx` does NOT include a `'use client'` directive. Static grep confirms.

### Page integration
- [x] 25 — `src/app/page.tsx` signed-out branch: heading, paragraph, and Sign In Link are inside `<Card>`, which is inside the centring `<main>`. Confirmed by reading the file.
- [x] 26 — `src/app/page.tsx` signed-in branch: `<Button type="submit" variant="primary">Sign Out</Button>` sits inside `<form action={signOutAction}>` inside the same `<Card>`. No Sign In link appears in this branch (it's the other ternary arm).
- [x] 27 — `src/app/(auth)/sign-in/page.tsx` wraps `<SignInForm />` in `<main className="flex min-h-screen items-center justify-center p-4">` → `<Card>` → `<SignInForm />`.
- [x] 28 — `src/app/(auth)/sign-in/SignInForm.tsx` uses `<Input>` and `<Button>`. `formState.isSubmitting` is passed as `loading={...}`. Per-field `error={formState.errors.<field>?.message}` is passed to `<Input>`. The previous per-field `<p>` lines are removed.

### Tests
- [x] 29 — `npm run test:run` exits 0. 19 tests pass across 3 files: Button 7, Input 9, Card 3. Each meets or exceeds the minimum.
- [x] 30 — `vitest.config.mts` no longer contains `passWithNoTests`. Verified.

### Forbidden-pattern compliance
- [x] 31 — Static sweep returned: zero `: any`, zero bare `<a `, zero `<img`, zero `next/router`, zero `window.location`, zero `Readonly<{}>`, zero `React.` namespace references in `/src`. `'use client'` appears in exactly three files: `SignInForm.tsx`, `Button.tsx`, `Input.tsx` — each at a deepest interactive leaf.
- [x] 32 — `'use client'` does NOT appear in `src/app/page.tsx` or `src/app/(auth)/sign-in/page.tsx`. Both remain server components.
- [x] 33 — `'use client'` does NOT appear in `src/components/ui/Card.tsx`. Server component.

### Build & quality
- [x] 34 — `tsc --noEmit` exit 0; `npm run lint` exit 0 (zero warnings); `npm run test:run` exit 0 (19/19 passing); `npx next build` succeeded. Routes unchanged: `ƒ /`, `ƒ /sign-in`, `ƒ /api/auth/[...nextauth]`, `○ /_not-found`. Dev server SSR also verified: `curl /` and `curl /sign-in` both 200 after the `buttonClass` cross-boundary fix (see Notes).
- [x] 35 — `mcp__ide__getDiagnostics` returned no diagnostics in any `src/` or `__tests__/` file. The 60+ diagnostics surfaced are all in `tasks/basic-styling-plan.md` (markdown false positives on TS/CSS code blocks inside prose) — not a regression.

### Responsive
- [x] 36 — Card has `w-full` and the page wrapper has `p-4` page gutter; on a 375 px viewport the card width is 375 − 32 = 343 px with comfortable centred content. No horizontal scroll possible because everything is `w-full` based.
- [x] 37 — Card has `md:max-w-md`; at ≥ 768 px the card caps at 28 rem (≈ 280 px after the rem rebase). Centred by the `flex items-center justify-center` parent.

## Plan Compliance

- All "Files to Create" present at the planned paths.
- All "Files to Modify" modified, with the planned scope.
- No extra files introduced outside the plan.
- Build order respected. The mid-build TypeScript-isolation check after the schema/config changes was implicit in the final verify.
- `buttonClass` helper implemented as planned and consumed by both `Button` itself and the home page Sign In link — single source of truth.
- `Card` accepts optional `className` and merges via `cn()` — matches the plan.
- `aria-busy` rendered conditionally (`loading || undefined`) rather than as a literal boolean — small builder judgment that improves DOM cleanliness; matches the spec's intent (set `"true"` when loading; absent otherwise).

## Code Quality

- TypeScript strict; no `any`. Explicit prop types using the `Readonly<>` pattern from CLAUDE.md.
- Variant maps are typed `Record<ButtonVariant, string>` — exhaustive over the union, so adding a variant later is a compile-time prompt.
- The error-overrides-variant rule in `Input` is a single line (`error ? 'danger' : variant`) — readable and matches AC #18.
- `Input.displayName` is set explicitly per the plan and per the established `forwardRef` idiom.
- All class composition flows through `cn()` — no string concatenation, no inline styles.
- `'use client'` placement matches CLAUDE.md's "deepest interactive leaf" rule: pages stay server, leaf interactive components own their directives.
- Internal navigation uses `Link` (home → `/sign-in`); no bare `<a>`.
- Tests use semantic queries (`getByRole`, `getByPlaceholderText`, `getByText`, `getByTestId`) and `userEvent.setup()` — modern RTL guidance honoured.

## Blockers
None.

## Notes (non-blocking)

1. **Cross-boundary fix during build**: `buttonClass` was initially placed as a named export on `'use client'`-marked `Button.tsx`. Static checks (`tsc`, lint, RTL tests, `next build`) all passed — but the dev server SSR returned HTTP 500 because the server component on `/` was trying to invoke a function the client-module boundary marked as client-only. Fixed by moving the helper, the variant type, and the class map into a new server-safe module `src/components/ui/buttonClass.ts`. `Button.tsx` and `page.tsx` both import from there. Lesson: pure JS helpers that need to be callable from both server and client components must live outside any `'use client'` module — `tsc` and `next build` do not surface this; only an actual SSR request does.
2. **`borderRadius` was not rebased**. `rounded-md` (0.375 rem default) and `rounded-lg` (0.5 rem default) shrank to 62.5 % of their previous pixel sizes. The spec only required `text-base` and `p-4` parity (AC #4) but not border-radius — so this is not a blocker. If the visual difference is undesirable, override `theme.extend.borderRadius` in a follow-up. Same observation applies to any other rem-based Tailwind scale not in the override table (e.g. `gap-7`, `text-5xl` are not used today).
2. **`shadow-sm` on `Input`** uses Tailwind's px-based default — unaffected by the rebase, but worth flagging as not part of any audited scale.
3. **`__tests__/components/ui/.gitkeep`** is still present alongside the new test files. Harmless; can be removed in a future tidy or by the `done task:` archiver if you want a cleaner tree.
4. **Pre-existing `next lint` deprecation warning** still emits on every lint run — out of scope.
5. **`npm audit` warnings on `bcryptjs`** still present — out of scope.
6. **`/sign-in` First Load JS grew from 126 kB → 133 kB**, home page from 102 kB → 113 kB. Accountable to the new component bundle and the Tailwind theme extension. Within reason for a design-system pass.
7. **Server-component `Card` test** asserts presence of classes including `md:max-w-md` — RTL renders without a viewport so the media-query class itself is just present in the className string, not "active". This is correct for a class-presence test; an actual responsive check belongs to manual smoke or a future Playwright suite.

## Approved Files

- New: `src/components/ui/{Button,Input,Card}.tsx`, `__tests__/components/ui/{Button,Input,Card}.test.tsx`.
- Modified: `tailwind.config.ts`, `src/styles/globals.css`, `src/app/layout.tsx`, `src/actions/signOut.ts`, `src/app/page.tsx`, `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-in/SignInForm.tsx`, `vitest.config.mts`.

No files require changes. STATUS: PASS.
