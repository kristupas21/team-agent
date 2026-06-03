# Spec: Basic Styling

## Summary
The project's first design pass plus its first real test suite, plus a small bug fix. Three things ship together: (1) the Sign Out form on `/` re-renders the page to the signed-out branch after the action runs; (2) a global typography/colour baseline (10 px root + a five-token palette wired through Tailwind); (3) three reusable UI primitives — `Button`, `Input`, `Card` — applied to the home page and the sign-in page, with Vitest + React Testing Library unit tests for each. `vitest.config.mts` loses `passWithNoTests: true` once tests exist. No new routes, no new auth surface, no new business logic.

## Assumptions

1. **Sign-out fix**: add `revalidatePath('/')` from `next/cache` inside `signOutAction`, after `signOut({ redirect: false })`. This is the minimal change — keeps the action void-returning, lets the existing `<form action={signOutAction}>` binding stay as-is, and forces the home server component to re-fetch and re-render after the cookie clears. The alternative — `redirect('/')` — would also work but adds an extra request.
2. **Tailwind base scale strategy**: keep all of Tailwind's named tokens (`text-base`, `text-lg`, `p-4`, etc.) producing the same *visual* pixel sizes as before. Achieved by setting `html { font-size: 62.5% }` and extending `tailwind.config.ts` `theme.fontSize` and `theme.spacing` so each token's rem value is multiplied by 1.6. (E.g. `text-base` now emits `1.6rem` against a 10 px root → still 16 px visual.) Spacing utilities (`p-`, `m-`, `gap-`, `w-`, `h-`) are scaled the same way. This means consumers of Tailwind tokens write the same class names and see the same visual sizes, but the underlying CSS values are rem-based against a 10 px root.
3. **Font family**: `next/font/google` → Inter, exposed as a CSS variable `--font-inter` and applied to `<body>` via `className={inter.variable}` plus a `font-sans` fallback chain that puts `var(--font-inter)` first. Configured in `src/app/layout.tsx`. Tailwind's `theme.extend.fontFamily.sans` is updated to read `var(--font-inter)`.
4. **Colour palette** — five tokens, three steps each (`-50`, `-500`, `-700`). Exact hexes:
   - `primary`: `-50 #eff6ff`, `-500 #2563eb`, `-700 #1d4ed8` (blue family)
   - `secondary`: `-50 #f5f3ff`, `-500 #7c3aed`, `-700 #5b21b6` (violet family)
   - `neutral`: `-50 #f9fafb`, `-200 #e5e7eb`, `-500 #6b7280`, `-700 #374151`, `-900 #111827` (extended to five steps because the surface/border/text spectrum needs it)
   - `danger`: `-50 #fef2f2`, `-500 #dc2626`, `-700 #b91c1c`
   - `success`: `-50 #f0fdf4`, `-500 #16a34a`, `-700 #15803d`
   These are declared in `tailwind.config.ts` under `theme.extend.colors`. No CSS variables for the palette — Tailwind utilities are the single source of truth, per CLAUDE.md.
5. **Card component** is a server-component-friendly shell (no event handlers, no state). It accepts `children` and an optional `className` so consumers can override the surface in edge cases (additional spacing, alignment, etc.); the override merges via `cn()`. The base look: white background (`bg-white`), rounded corners (`rounded-lg`), 1 px `neutral-200` border, 1.5 rem padding scaled (`p-6`), no shadow at the default level. Mobile: `w-full` minus page gutter; desktop: `md:max-w-md`.
6. **Button component** has variants `primary` | `secondary` | `danger` (default `primary`) plus `loading` and the full `<button>` native attribute set. When `loading` is truthy: `disabled` is forced true, `aria-busy="true"` is set, and the button's *text content* is replaced — original children hidden, the literal string `"Loading..."` rendered instead. No spinner SVG, no icon library introduced. CSS `disabled` (lower opacity, `cursor-not-allowed`) and `loading` (same plus the label swap) look visibly distinct because the label changes.
7. **Input component** has variants `primary` | `secondary` | `danger` (default `primary`) plus `disabled` and an optional `error` prop. When `error` is a non-empty string, the input visually flips to the `danger` variant *regardless* of the explicit variant prop, and the error message renders as a `<p>` immediately after the input. When `error` is empty/undefined, the explicit variant wins. `Input` uses `React.forwardRef` so `react-hook-form`'s `register(...)` continues to work (`SignInForm` is the existing consumer).
8. **`Button` and `Input` are client components** (`'use client'`) because their consumers attach `onClick` / `onChange` / `ref` and `formState.isSubmitting`. **`Card` is a server component** (no directive) — it has no interactivity. This satisfies CLAUDE.md's "directive at the deepest interactive leaf" rule.
9. **Sign-in form integration**: the two manual `<input>`s become `<Input>` with `{...register('name')}` / `{...register('password')}` spread on them; the submit `<button>` becomes `<Button type="submit" variant="primary" loading={formState.isSubmitting}>Sign In</Button>`. Field-level errors come via the existing react-hook-form `formState.errors.<field>.message` — they are passed to `Input`'s `error` prop. The root error stays as a `<p>` below the submit, styled with `text-danger-500`.
10. **Home-page integration**: the centred content sits inside `<Card>`. The Sign Out branch's `<button>` becomes `<Button variant="primary">Sign Out</Button>`. The Sign In branch's `<Link href="/sign-in">` is wrapped in a `<Button>`-shaped style — implementation is a `<Link>` that takes the **same Tailwind classes** as `Button variant="primary"` (the "Notes for spec-agent" alternative B). No `asChild` slot is introduced. Reason: a single styled `<Link>` is simpler than introducing slot composition for one site.
11. **Page-level layout**: the existing centred-flex wrapper on `/` (`<main className="flex min-h-screen items-center justify-center">`) is preserved. The same wrapper is added to `/sign-in/page.tsx` (today the page renders the form bare). Card lives inside the wrapper. Page background gains a neutral fill (`bg-neutral-50`) so the white Card has contrast.
12. **Spacing inside the Card**: a small consistent vertical rhythm via Tailwind's `space-y-*` utilities; exact stack chosen per page.
13. **No CVA / no new variant library**. Variant maps are hand-rolled as plain `Record<Variant, string>` and merged via `cn()`. Variant strings stay short enough that this is more readable than a CVA setup for three components.
14. **Tests** — Vitest + RTL + `@testing-library/jest-dom` + `@testing-library/user-event`. Files: `__tests__/components/ui/Button.test.tsx`, `Input.test.tsx`, `Card.test.tsx`. Coverage spec is enumerated under Acceptance Criteria.
15. **`vitest.config.mts`**: `passWithNoTests: true` is removed. The flag is no longer needed; if a future change accidentally deletes all tests, the suite now correctly fails rather than passing silently.
16. **Field-level error message colour**: `text-danger-500` (`#dc2626`). Same for the root error string. No background, no border around the message — same plain-text style as before but coloured.
17. **Disabled visual**: 60 % opacity (`opacity-60`) plus `cursor-not-allowed`. Applied uniformly across `Button` and `Input` disabled states.
18. **Focus visible**: every interactive component (`Button`, `Input`) gets a 2 px ring (`focus-visible:ring-2`) in the primary token (or danger when in error state) so keyboard navigation reads.
19. **Mobile breakpoint**: Tailwind's default `md` (≥ 768 px). No custom breakpoints introduced.
20. **No accessibility deep-dive**, beyond `aria-busy` on loading buttons, semantic elements, and the existing `<label>` wrapping in the sign-in form.

## Open Questions
None remaining — all the choices above are well-defended given the brief; if the user wants to override any single hex, font, or specific class, they can do so as a one-line change after the spec.

## Routes / Pages

| Path | File | Title | Purpose |
|---|---|---|---|
| `/` (modify) | `src/app/page.tsx` | "Next.js App" (metadata unchanged) | Same signed-in/signed-out switching as before, now wrapped in `<Card>`. Sign Out button switches to `<Button>`. Sign In link switches to a styled `<Link>` carrying the same Tailwind classes as `Button variant="primary"`. Page background is `bg-neutral-50`. |
| `/sign-in` (modify) | `src/app/(auth)/sign-in/page.tsx` | "Sign In" (metadata unchanged) | The page gains the same centring `<main>` wrapper as `/`. The form sits inside a `<Card>`. |
| `/sign-in` (modify) | `src/app/(auth)/sign-in/SignInForm.tsx` | n/a | Manual `<input>`/`<button>` become `<Input>`/`<Button>`. Pending state and field/root errors map through the new component props. |

No new routes.

## Data

### Data Types

```ts
// src/components/ui/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react'
type ButtonVariant = 'primary' | 'secondary' | 'danger'
export type ButtonProps = Readonly<
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    children: ReactNode
    variant?: ButtonVariant
    loading?: boolean
  }
>
```

```ts
// src/components/ui/Input.tsx
import type { InputHTMLAttributes } from 'react'
type InputVariant = 'primary' | 'secondary' | 'danger'
export type InputProps = Readonly<
  InputHTMLAttributes<HTMLInputElement> & {
    variant?: InputVariant
    error?: string
  }
>
```

```ts
// src/components/ui/Card.tsx
import type { HTMLAttributes, ReactNode } from 'react'
export type CardProps = Readonly<
  HTMLAttributes<HTMLDivElement> & {
    children: ReactNode
  }
>
```

No other types introduced. The colour and size tokens live in `tailwind.config.ts` and are referenced via Tailwind utility class names — they do not appear in TypeScript code.

### API Endpoints
No new endpoints. No server actions added. `signOutAction` gains a single `revalidatePath('/')` call.

### Dependencies (added)
None. `next/font/google` is part of `next`. `class-variance-authority` is deliberately *not* introduced.

## Components

| Name | Type | Purpose | Props |
|---|---|---|---|
| `Button` (new) | client component | Reusable button with variants and loading state. | `ButtonProps` as above. |
| `Input` (new) | client component | Reusable text input with variants and error state. Forwards `ref`. | `InputProps` as above. |
| `Card` (new) | server component | Padded surface; centred-content container. | `CardProps` as above. |
| `HomePage` (modify) | server component | Wraps content in `<Card>`; switches buttons to `<Button>` and `<Link>` styled like `Button`. | none |
| `SignInPage` (modify) | server component | Adds centring `<main>` and `<Card>` around `<SignInForm />`. | none |
| `SignInForm` (modify) | client component | Inputs become `<Input>`; submit button becomes `<Button>` with `loading={formState.isSubmitting}`. | none |
| `RootLayout` (modify) | server component | Loads `next/font/google` Inter, applies the font variable to `<body>`, switches the body background to `neutral-50`. | unchanged |

## User Interactions

### Bug fix: sign out (now re-renders correctly)
1. Signed-in user clicks Sign Out on `/`.
2. Form submits to `signOutAction` on the server.
3. The action awaits `signOut({ redirect: false })`, then calls `revalidatePath('/')`.
4. Next.js re-fetches the home page. The new render sees no session and produces the signed-out branch — heading `"Hello there"`, paragraph `"Please sign in to continue."`, Sign In link styled as a button.

### Happy path: sign in (visual change only)
1. User on `/` (signed-out) sees the styled card with the Sign In button.
2. Click → navigate to `/sign-in` → card with the form, properly centred.
3. Submit empty → per-field error messages styled in danger colour render under each input.
4. Submit valid → button shows `"Loading..."` while pending → success → `router.push('/')` → home renders signed-in card.

### Visual behaviour: variants and states
- A button rendered with `variant="primary"` has the primary background, white text. Hover: a darker primary. Disabled or loading: 60 % opacity, `cursor-not-allowed`, no hover change. Loading: text content swaps to `"Loading..."`, `aria-busy="true"`.
- A button rendered with `variant="secondary"` has the secondary background, white text. Same disabled/loading semantics.
- A button rendered with `variant="danger"` has the danger background, white text. Same disabled/loading semantics.
- An input rendered with default variant has a 1 px neutral border. Focus-visible: 2 px primary ring.
- An input rendered with `error="<msg>"` flips its visual to danger regardless of the explicit variant, and a `<p>` renders the message below it in danger colour.
- An input rendered with `disabled` has 60 % opacity, `cursor-not-allowed`, no focus ring.

## States

### `/` home page
- **Signed-out**:
  - Background: `bg-neutral-50`.
  - Centred `<Card>` containing: heading `"Hello there"` (`text-4xl font-semibold`, unchanged classes), paragraph `"Please sign in to continue."` (`mt-4 text-base text-neutral-500` — the previous `text-gray-600` becomes `text-neutral-500` from the new palette), then a `<Link href="/sign-in">Sign In</Link>` with the same visual classes as `<Button variant="primary">` (`mt-6 inline-block …`).
- **Signed-in**:
  - Same wrapper + Card. Heading reads `"Welcome, {name}"`. Paragraph `"You're signed in."`. The Sign Out button is a `<Button variant="primary">` inside the existing `<form action={signOutAction}>`. No standalone `<p>{name}</p>` (matches the prior task).
- **Loading / Error**: not applicable. The home page reads the session synchronously in a server component.

### `/sign-in` page
- **Initial (signed-out)**:
  - Background: `bg-neutral-50` (inherited from layout — see Assumption 11; or applied to a wrapper `<main>` here too).
  - Centred `<Card>` containing the form.
  - Form: two `<Input>`s (name, password) with their labels; a primary `<Button type="submit">` reading `"Sign In"`. No errors visible.
- **Field error**: the failing `<Input>` shows the error message immediately below it in danger colour; the danger border replaces the primary border.
- **Submitting**: inputs are `disabled`; submit `<Button>` is `loading={true}` (text becomes `"Loading..."`, `aria-busy="true"`, non-interactive).
- **Server error**: a `<p>` below the submit button renders the error message (`"Invalid name or password."`) in danger colour.
- **Success**: form unmounts on navigation to `/`.
- **Already signed in**: never renders — server `redirect('/')` fires first (unchanged).

### Component-level states
- Tested in unit tests, not pages. See Acceptance Criteria below.

## Acceptance Criteria

### Bug fix
1. Given a signed-in user on `/`, when they click Sign Out, then the page re-renders to the signed-out branch (`"Hello there"` heading + `"Please sign in to continue."` paragraph + Sign In styled link) without any manual refresh, and the session cookie is cleared.

### Global styling
2. Given `src/styles/globals.css`, when inspected, then the `html` selector sets `font-size: 62.5%`.
3. Given `tailwind.config.ts`, when inspected, then `theme.extend.colors` declares exactly the keys `primary`, `secondary`, `neutral`, `danger`, `success` with the exact hex values specified under Assumption 4, and `theme.extend.fontSize` / `theme.extend.spacing` override Tailwind's defaults so each token's rem value is multiplied by 1.6 (e.g. `base: '1.6rem'`, `lg: '1.8rem'`, `4: '1.6rem'`, etc.).
4. Given the home page rendered in a browser, when measured, then `text-base` renders at 16 px and `p-4` produces 16 px of padding — visually identical to a 16 px root baseline.
5. Given `src/app/layout.tsx`, when inspected, then it imports `Inter` from `next/font/google`, declares it with a `variable: '--font-inter'`, applies the variable to `<body>`, and sets `bg-neutral-50` on `<body>` (or an equivalent root container).
6. Given Tailwind's `theme.extend.fontFamily.sans`, when inspected, then it puts `var(--font-inter)` first.

### Components — `Button`
7. Given `src/components/ui/Button.tsx`, when read, then it exports a default `Button` component and a named `ButtonProps` type matching the shape under Data Types.
8. Given `<Button>Click</Button>`, when rendered, then the DOM has a `<button>` with text content `"Click"` and the `primary` variant's class set.
9. Given `<Button variant="secondary">x</Button>` and `<Button variant="danger">x</Button>`, when rendered, then each carries the variant-specific class set.
10. Given `<Button disabled>x</Button>`, when rendered, then the button has `disabled` attribute, `opacity-60`, `cursor-not-allowed`, and `onClick` does NOT fire when clicked.
11. Given `<Button loading>x</Button>`, when rendered, then the button has `disabled` attribute, `aria-busy="true"`, text content is `"Loading..."` (the children `x` is hidden), and `onClick` does NOT fire when clicked.
12. Given `<Button onClick={fn}>x</Button>` with neither `disabled` nor `loading`, when clicked, then `fn` is called exactly once.

### Components — `Input`
13. Given `src/components/ui/Input.tsx`, when read, then it exports a default `Input` component wrapped in `forwardRef` and a named `InputProps` type matching the shape under Data Types.
14. Given `<Input placeholder="Name" />`, when rendered, then the DOM has an `<input>` with the `primary` variant's class set and the placeholder applied.
15. Given `<Input variant="secondary" />` and `<Input variant="danger" />`, when rendered, then each carries the variant-specific class set.
16. Given `<Input disabled />`, when rendered, then the input has the `disabled` attribute and `opacity-60`, `cursor-not-allowed`.
17. Given `<Input error="Bad input" />`, when rendered, then the input carries the `danger` variant's class set (regardless of the explicit `variant` prop, which we don't set in this case) AND a `<p>` element with text content `"Bad input"` renders immediately after the input.
18. Given `<Input variant="primary" error="Bad" />` (an explicit non-danger variant alongside a non-empty error), when rendered, then the input still carries the `danger` variant class set (error wins).
19. Given `<Input ref={ref} />`, when rendered, then `ref.current` is the underlying `<input>` element.
20. Given `<Input onChange={fn} />`, when the user types, then `fn` is called with each change.

### Components — `Card`
21. Given `src/components/ui/Card.tsx`, when read, then it exports a default `Card` component and a named `CardProps` type.
22. Given `<Card>content</Card>`, when rendered, then the DOM has a `<div>` containing `"content"` with the base classes (`bg-white`, `rounded-lg`, `border`, `border-neutral-200`, `p-6`, `w-full`, `md:max-w-md`).
23. Given `<Card className="extra">x</Card>`, when rendered, then the consumer-provided class is merged via `cn()` and present alongside the base classes (e.g. `class*="extra"`).
24. `Card` has no `'use client'` directive (it is a server component).

### Page integration
25. Given the home page rendered with no session, when inspected, then the heading, paragraph, and Sign In element are wrapped inside a single `<Card>` element which itself sits inside the centred `<main>` flex wrapper.
26. Given the home page rendered with a session, when inspected, then the Sign Out element is a `<Button>` component rendered inside the existing `<form action={signOutAction}>` and inside the same `<Card>`. The Sign In `<Link>` does NOT appear in this branch.
27. Given the sign-in page, when inspected, then a centred `<main>` wrapper contains a `<Card>`, which contains `<SignInForm />`.
28. Given `<SignInForm>`, when read, then both `<input>` elements have been replaced with `<Input>` and the `<button>` has been replaced with `<Button>`. The `formState.isSubmitting` is passed to `<Button>` as `loading={...}`. The per-field error messages are passed to `<Input>` as `error={formState.errors.<field>?.message}` and are no longer rendered manually below each input.

### Tests
29. Given the test suite, when `npm run test:run` runs, then it executes the Button / Input / Card test files and exits 0. There are at least 6 passing tests for `Button`, at least 8 passing tests for `Input`, and at least 3 passing tests for `Card`.
30. Given `vitest.config.mts`, when inspected, then `passWithNoTests: true` is absent. `npm run test:run` must succeed because tests pass, not because the empty-collection case is excused.

### Forbidden-pattern compliance (carried forward from prior reviews)
31. Given the codebase, when grep'd, then no `any`, no bare `<a>` for internal routes, no `<img>`, no `next/router`, no `window.location`, no `React.*` namespace reference, no `Readonly<{}>` (empty prop type), and exactly one `'use client'` per leaf interactive component (`SignInForm.tsx`, `Button.tsx`, `Input.tsx`).
32. Given `src/app/page.tsx` and `src/app/(auth)/sign-in/page.tsx`, when grep'd, then `'use client'` does NOT appear (both remain server components).
33. Given `src/components/ui/Card.tsx`, when grep'd, then `'use client'` does NOT appear.

### Build & quality
34. Given `tsc --noEmit`, `npm run lint`, `npm run test:run`, `npx next build`, when each runs, then each exits 0 with no warnings or errors. `next build` route topology is unchanged from the prior task (`/`, `/sign-in`, `/api/auth/[...nextauth]`, `/_not-found`).
35. Given `mcp__ide__getDiagnostics`, when called against `/src` and `/__tests__`, then no diagnostics surface in any source file. False positives in task markdown are not a regression.

### Responsive
36. Given the home page rendered at a viewport width of 375 px (mobile), when inspected, then the `<Card>` is full-width minus the page gutter, the heading + paragraph + button remain centred and readable, and no horizontal scroll appears.
37. Given the home page rendered at a viewport width of ≥ 768 px (desktop), when inspected, then the `<Card>` has a maximum width (`md:max-w-md`) and remains centred horizontally.

## Notes for Downstream Agents
- **Architect**: keep variant class maps simple — a plain `Record<Variant, string>` per component. Resist the urge to introduce CVA; three small components do not justify the dep.
- **Builder**: when wiring `Input` to `react-hook-form`, the `{...register(...)}` spread must come *before* `ref={ref}` so RHF's own ref still wins; with `forwardRef` the standard pattern is to accept `ref` as the second arg and pass it through alongside the spread. Test #19 confirms ref-forwarding works.
- **Builder**: `aria-busy` is the only ARIA attribute introduced here; everything else is semantic HTML or comes "for free" via labels in the existing markup.
- **Builder**: when removing `passWithNoTests`, don't add any other config keys — the only diff in `vitest.config.mts` is deleting that one line.
- **Reviewer**: AC #4 ("`text-base` renders at 16 px") is the linchpin for the rem-base strategy. If the Tailwind theme is not extended correctly, the page will visually shrink to 62.5 % — easy to spot, hard to forget. Verify in `tailwind.config.ts`.
- **Reviewer**: AC #11 ("loading swaps text to `Loading...`") and AC #17–18 (`error` overrides variant) are the two pieces of subtle component behaviour most likely to drift in implementation. Worth a focused check.
