# Task: Basic Styling

## Description
Three things in one shipping unit: (1) fix a stale-UI bug after sign-out; (2) introduce the project's first real visual design — global typography baseline, a small fixed colour palette, mobile-first responsive layout; (3) extract reusable Button, Input, and Card components and apply them across the existing pages. This is also the first task where we lift the "no tests yet" precedent — extracted components ship with unit tests covering their variants and states.

## Scope

### In scope
- **Bug fix**: clicking Sign Out on the home page makes the server action run but leaves the UI rendering the signed-in branch (admin name + Sign Out button still visible). Page should re-render to the signed-out branch after the action resolves.
- **Global typography baseline**: set `html { font-size: 62.5% }` so `1rem = 10px`. Use rems throughout for font sizes and spacing. Adjust the Tailwind theme so existing utility classes still produce visually correct sizes against the new base (e.g. the default `text-base` no longer renders at 10px).
- **Colour palette**: a small fixed set of tokens — `primary`, `secondary`, `neutral`, `danger`, `success` — declared once and referenced everywhere. No light/dark theming, no runtime swapping.
- **Apply the new styles to the existing pages**: home page and `/sign-in` page. The placeholder copy and structure from prior tasks stays; only the visual treatment changes.
- **Extract three reusable components** under `src/components/ui/`:
  - `Button` — variants `primary` | `secondary` | `danger`. Handles `disabled` and a `loading` state (label change + non-interactive while loading).
  - `Input` — variants `primary` | `secondary` | `danger`. Handles `disabled` and an `error` state (visual cue + accepts an error message rendered nearby).
  - `Card` — no variants; padded container with a consistent surface/border treatment.
- **Use the extracted components** on the home page (Sign Out becomes `<Button variant="primary">`; the Sign In `<Link>` becomes a `<Link>` styled as a `Button` or a `<Button asChild>`-style pattern — the spec-agent decides) and on the sign-in page (the two `<input>`s become `<Input>`s; the submit `<button>` becomes a `<Button>`). The whole sign-in form sits inside a `<Card>`. The home page content sits inside a `<Card>` too (so both pages share a consistent centred surface).
- **Responsive**: mobile-first. Pages must read and behave well at typical mobile widths (~375 px) and scale up cleanly to desktop. Card width adapts; type and spacing remain comfortable on both.
- **Unit tests** for the three extracted components, in `/__tests__/components/ui/` mirroring `/src/components/ui/`. Cover every variant and every documented state.
- **Remove `passWithNoTests: true`** from `vitest.config.mts` now that real tests exist — `npm run test:run` should succeed because tests actually pass, not because the empty-collection case is excused.

### Out of scope
- Dark mode / theming.
- A design-system inventory beyond Button / Input / Card. No `Modal`, `Tooltip`, `Tabs`, etc. in this task.
- Forms beyond sign-in. There are no other forms today.
- Icon libraries. If a variant calls for an icon, use plain SVG inline or skip it.
- Storybook / Chromatic / visual regression tooling.
- Accessibility audit beyond the basics (semantic elements, `aria-disabled` where it falls out naturally, focus styles). A11y deep-dive is a future task.
- E2E tests — same precedent.

## Bug Fix — Sign Out UI Refresh
The shipped `signOutAction` calls `signOut({ redirect: false })` from Auth.js and returns. The server action infrastructure does not automatically invalidate the home page's data when the action is bound to a `<form action={...}>` that *targets the same page*; the cookie clears but the page does not re-fetch. Fix this. The spec-agent picks the mechanism (most likely a `revalidatePath('/')` call inside `signOutAction`, or alternatively a `redirect('/')` after `signOut`). The user-visible behaviour after the fix:

1. Click Sign Out from the signed-in home page.
2. The page re-renders, no flash of stale UI, and shows the signed-out branch (Hello there + Please sign in to continue. + Sign In button).

## Styling Foundation

### Rem baseline
- `:root` / `html` gets `font-size: 62.5%` in `src/styles/globals.css`.
- All component-level sizes use rems (or Tailwind utilities that resolve to rems against the new base).
- Tailwind's default theme assumes a 16 px base. Changing the base to 10 px would shrink every default utility to 62.5 % of its intended visual size. The spec-agent or architect must either:
  - extend the Tailwind theme so the named tokens (`text-base`, `text-lg`, etc.) emit the same *visual* sizes as before, or
  - declare new project-specific size tokens (`text-body`, `text-heading`, …) and use those everywhere.
  Either is acceptable; the spec-agent picks the simpler one for this codebase.

### Colour palette
- Tokens: `primary`, `secondary`, `neutral`, `danger`, `success`. Declared in the Tailwind config under `theme.extend.colors` so utilities like `bg-primary`, `text-danger`, `border-neutral-200` are available.
- Each token needs at least three steps (e.g. `-50`, `-500`, `-700`) so backgrounds, body text, and borders can come from the same scale. The spec-agent picks the exact hex values.
- Where the palette is referenced from JSX, use Tailwind classes — never inline hex strings. Per CLAUDE.md.

### Typography
- Use `next/font` (per CLAUDE.md "Next.js Best Practices"). Pick one variable / sans-serif font; configure it once in `src/app/layout.tsx`. The spec-agent picks the family (Inter is a safe default).
- Heading vs body sizes come from the Tailwind theme — no inline `style` props.

### Spacing
- Continue using Tailwind's spacing scale. If the rem-base change shifts the visual sizes, extend the theme rather than peppering arbitrary values.

### Responsive approach
- Mobile-first. Base utility classes target mobile; `md:` and `lg:` layer up for desktop.
- Per CLAUDE.md "Responsive design is mobile-first".
- The Card width on mobile fills available width minus a small horizontal gutter; on desktop it caps at a comfortable reading width (the spec-agent picks the exact max).

## Component API Sketches

The spec-agent and architect refine the exact shapes. Below is the *direction*, not a final contract.

### `Button`
- Props (rough): `variant: 'primary' | 'secondary' | 'danger'` (default `'primary'`), `loading?: boolean`, `disabled?: boolean`, plus the full set of native `<button>` attributes.
- Behaviour: when `loading` is true, the button is non-interactive and the label is replaced (or appended) to indicate the action is in flight. The CSS `disabled` state and the `loading` state look distinct enough to tell apart.
- States to render and test: default, hover, active/pressed, focus, disabled, loading. Tests cover at least default, disabled, loading, and each variant.

### `Input`
- Props (rough): `variant: 'primary' | 'secondary' | 'danger'` (default `'primary'`), `disabled?: boolean`, `error?: string`, plus native `<input>` attributes (including `type`, `name`, `value`, `onChange`).
- Behaviour: when `error` is non-empty, the variant flips to `danger` visually and the error string renders as plain text adjacent to the input. When `disabled` is true, interactions are blocked and the visual conveys it. Forward `ref` so `react-hook-form`'s `register(...)` continues to work.
- States to render and test: default, disabled, error (with the message rendered), and each variant.

### `Card`
- Props (rough): `children: ReactNode`, plus optional native `<div>` attributes (`className` if we want to allow consumer overrides, or none if we forbid that). The spec-agent picks.
- Behaviour: a padded surface with rounded corners and a subtle border or shadow. No variants. Same look on mobile and desktop, just a different width.

### Composition rules
- Component prop types use the CLAUDE.md `Readonly<>` pattern — `type ButtonProps = Readonly<{ ... }>`, etc.
- Component files: `Button.tsx`, `Input.tsx`, `Card.tsx` in `src/components/ui/`. Each file exports a default and a named `*Props` type.
- All three are client-component candidates; the spec-agent decides. (Note: a stateless `Card` could be a server component; `Button` with `onClick` and `Input` with `onChange` need `'use client'`.)
- Class composition uses `cn()` from `src/lib/utils.ts`. No string concatenation.

## Applying to Existing Pages

### Home page (`src/app/page.tsx`)
- Wrap the existing content in `<Card>`.
- The Sign Out form's `<button>` becomes a `<Button variant="primary">`.
- The Sign In `<Link>` either becomes a `<Button>` rendered as a link (spec-agent's call) or is wrapped in a styled element that resembles the Button visually but stays semantically a `<a>`. Internal navigation must still go through `next/link` per CLAUDE.md.

### Sign-in page (`src/app/(auth)/sign-in/page.tsx` + `SignInForm.tsx`)
- Wrap the form in `<Card>` so it has a consistent surface.
- The two `<input>`s become `<Input>`s. The submit `<button>` becomes a `<Button type="submit" variant="primary" loading={formState.isSubmitting}>`. The `Sign Out` rule above continues to apply on the home page after sign-in.
- Per-field error messages and the root error still render as plain text — but they now use the colour palette (`text-danger` or equivalent) instead of unstyled black.

## Tests

This is the first task that ships unit tests. Setup:

- Test files live under `__tests__/components/ui/`, mirroring `src/components/ui/`. Each file named `<ComponentName>.test.tsx`.
- Stack: Vitest + `@testing-library/react` + `@testing-library/jest-dom` + `@testing-library/user-event` — all already installed.
- Coverage for each extracted component:
  - **`Button`**: renders children; each `variant` applies the expected class set; `disabled` blocks `onClick`; `loading` makes the element non-interactive and changes the label; ref-forwarding (if implemented) passes through.
  - **`Input`**: renders with default attributes; each `variant` applies the expected class set; `disabled` blocks user input; `error` shows the message and applies the danger styling; ref-forwarding works (so `react-hook-form` keeps working).
  - **`Card`**: renders children; classes preserved from defaults; optional consumer className merges (only if the architect allows that).
- Edge cases: every component renders sensibly with no optional props.
- Remove `passWithNoTests: true` from `vitest.config.mts`. The test suite must now actually pass to count.

## Folder / File Touch Points
Rough sketch — architect produces the precise list.

- `src/styles/globals.css` — `html { font-size: 62.5% }`, possibly CSS custom properties for the colour tokens if the spec-agent chooses that route instead of pure Tailwind.
- `tailwind.config.ts` — extend `theme.extend.colors` (and possibly `fontFamily`, `fontSize`, `spacing`) with the new palette and any compensating sizes.
- `src/app/layout.tsx` — `next/font` import and font variable applied to `<body>` (or `<html>`).
- `src/components/ui/Button.tsx` — new.
- `src/components/ui/Input.tsx` — new.
- `src/components/ui/Card.tsx` — new.
- `src/app/page.tsx` — wrap in Card; switch to new components.
- `src/app/(auth)/sign-in/page.tsx` — wrap in Card.
- `src/app/(auth)/sign-in/SignInForm.tsx` — switch to new components.
- `src/actions/signOut.ts` — add the post-sign-out invalidation that fixes the bug.
- `__tests__/components/ui/Button.test.tsx` — new.
- `__tests__/components/ui/Input.test.tsx` — new.
- `__tests__/components/ui/Card.test.tsx` — new.
- `vitest.config.mts` — remove `passWithNoTests: true`.
- `package.json` — add `next/font`'s underlying packages only if not auto-installed; `next/font` itself ships with Next. No new runtime deps expected unless the architect wants `@radix-ui/...` or `class-variance-authority` for variant management (left as a judgment call — the simpler path is `cn()` with explicit class maps).

## Done Criteria
- Clicking Sign Out on the home page returns the page to the signed-out branch with no manual refresh.
- `html` font-size is `62.5%`; the app's visual sizes do not look smaller than they did before (Tailwind theme adjusted).
- The five colour tokens (`primary`, `secondary`, `neutral`, `danger`, `success`) are declared once and referenced via Tailwind utilities throughout.
- `Button`, `Input`, `Card` exist under `src/components/ui/`, are used on the home page and the sign-in page, and follow CLAUDE.md conventions (Readonly prop type, no `any`, no bare `<a>`, no `React.*` namespace).
- Each extracted component has a test file covering every variant and every documented state.
- `vitest.config.mts` no longer carries `passWithNoTests: true`; the test suite passes because tests actually exist and pass.
- `tsc --noEmit`, `npm run lint`, `npm run test:run` all exit 0.
- `next build` succeeds; routes unchanged.
- Pages remain functional and look intentional at ~375 px and at desktop widths.

## What This Task Does NOT Include
- Theming, dark mode, multi-brand support.
- Component primitives beyond Button / Input / Card.
- Accessibility audit beyond the basics that fall out naturally.
- Icon system.
- Storybook / visual regression tools.
- E2E tests.
- New routes, new business logic, new auth surface.

## Notes for the Spec-Agent

- The bug fix is a small, surgical change; bundling it with this task keeps `signOutAction` and the home page consistent now that the home page is being touched anyway.
- For the rem baseline, the simplest pragmatic move is to **scale the Tailwind `fontSize` and `spacing` scales by 1.6** (so the default `text-base` still emits the same 16 px it always did against a 10 px root). The spec-agent should evaluate this against the alternative of redefining named tokens, and pick one.
- For variants, `class-variance-authority` is a popular helper. The architect may use it OR a hand-rolled `cn()` + class map — pick the simpler path for three small components. No need to introduce a new dep just for this.
- The Sign In link on the home page becoming "a button visually but a link semantically" is the spec-agent's call. Two reasonable shapes: (a) a Button component that accepts an `asChild` slot and renders its child with the Button styles; (b) a Link inside the Card directly styled with the same Tailwind classes as the primary Button. The latter is simpler and is probably right for this codebase.
- For tests, prefer behaviour over snapshot: assert observable outcomes (`getByRole`, `getByText`, `disabled` attribute, click handlers firing or not). Avoid snapshot diffs.
- Once tests land, this task should remove `passWithNoTests: true` so future tasks can't silently regress to zero tests.
