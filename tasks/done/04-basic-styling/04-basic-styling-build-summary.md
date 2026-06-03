# Build Summary: Basic Styling

## Files Created

### Components
- `src/components/ui/Card.tsx` — server component. Base classes `w-full rounded-lg border border-neutral-200 bg-white p-6 md:max-w-md`; consumer `className` merged via `cn()`.
- `src/components/ui/Button.tsx` — client component (`'use client'`). Variants `primary` | `secondary` | `danger`. `loading` forces `disabled`, sets `aria-busy="true"`, swaps children for the literal `"Loading..."`. Imports the variant class set from `./buttonClass`.
- `src/components/ui/buttonClass.ts` — **server-safe** module (no `'use client'`). Owns `ButtonVariant`, the base + variant class strings, and the `buttonClass(variant, extras?)` helper. Imported by `Button.tsx` *and* by `src/app/page.tsx` (the server component that renders the Sign In link). See Deviations for why.
- `src/components/ui/Input.tsx` — client component (`'use client'`). Wrapped in `forwardRef<HTMLInputElement, InputProps>` with `displayName = 'Input'`. Variants `primary` | `secondary` | `danger`. `error` overrides the variant to `'danger'` and renders a `<p className="mt-1 text-base text-danger-500">{error}</p>` immediately after the input.

### Tests
- `__tests__/components/ui/Card.test.tsx` — 3 tests.
- `__tests__/components/ui/Button.test.tsx` — 7 tests.
- `__tests__/components/ui/Input.test.tsx` — 9 tests.

Total: **19 tests**, all passing.

## Files Modified

- `tailwind.config.ts` — extended `theme.extend` with the five-token palette (`primary`/`secondary`/`neutral`/`danger`/`success`), `fontFamily.sans` pointing at `var(--font-inter)`, and rescaled `fontSize` + `spacing` so every used token's rem value is multiplied by 1.6 (so `text-base` still emits 16 px against the 10 px root, `p-4` still emits 16 px, etc.).
- `src/styles/globals.css` — prepended `html { font-size: 62.5%; }` ahead of the Tailwind imports.
- `src/app/layout.tsx` — added `next/font/google` Inter with `variable: '--font-inter'`; applied the variable to `<html>` and added `bg-neutral-50 font-sans text-base text-neutral-900` to `<body>`.
- `src/app/page.tsx` — wrapped the centred content in `<Card>`. Switched the Sign Out `<button>` to `<Button variant="primary">`. Switched the Sign In `<Link>` to use `buttonClass('primary', 'mt-6')` so it shares the exact same visual class set as a primary Button without a second variant authoring surface. `text-gray-600` → `text-neutral-500` (new palette).
- `src/app/(auth)/sign-in/page.tsx` — added the centring `<main>` wrapper and a `<Card>` around `<SignInForm />`.
- `src/app/(auth)/sign-in/SignInForm.tsx` — replaced the two manual `<input>`s with `<Input>` (passing `formState.errors.<field>?.message` to the `error` prop, so the per-field message rendering lives inside `Input` now). Replaced the manual `<button>` with `<Button type="submit" variant="primary" loading={formState.isSubmitting}>`. Removed the two now-redundant per-field `<p>` elements that previously rendered the messages.
- `vitest.config.mts` — removed the `passWithNoTests: true` line.

## Deviations

1. **`buttonClass` extracted to its own module** (`src/components/ui/buttonClass.ts`). The plan placed `buttonClass` as a named export on `Button.tsx`. That works for `tsc`, `lint`, RTL tests, and `next build`, but **fails at SSR runtime**: importing any symbol from a `'use client'` module into a server component (`src/app/page.tsx`) makes Next.js treat the symbol as a client-only reference. Calling it during server render throws `Attempted to call buttonClass() from the server but buttonClass is on the client. It's not possible to invoke a client function from the server`. Caught by `npm run dev` + a curl on `/`, which returned HTTP 500. Fix: a new server-safe module `src/components/ui/buttonClass.ts` (no `'use client'` directive) owns `ButtonVariant`, the variant class map, and `buttonClass()`. Both `Button.tsx` and `page.tsx` import from it. Single source of truth for variants is preserved.
2. **`Button` uses the same `buttonClass` helper internally**. The component body calls `buttonClass(variant, className)` rather than reconstructing the variant lookup inline. Keeps the helper and the Button itself byte-identical on the classes side and means a future variant tweak only needs to land in one place.
3. **`aria-busy={loading || undefined}`** rather than `aria-busy={loading}`. The DOM attribute serialises `false` to the string `"false"`, which is non-idiomatic; passing `undefined` removes the attribute entirely when not loading. This matches the spec's "set `aria-busy="true"` when loading" without leaving a stray `aria-busy="false"` in the DOM otherwise.

## Ambiguities

None that required `// NOTE:` comments. The plan was precise enough that judgment calls were limited to the two stylistic micro-choices above.

## Known Issues

- **Border-radius shrinkage**: Tailwind's `borderRadius` scale is rem-based and was *not* overridden. `rounded-md` (0.375 rem default) and `rounded-lg` (0.5 rem default) now render at 62.5 % of their previous pixel sizes. This is cosmetic only — the spec requires `text-base` and `p-4` parity (AC #4) but does not call out border-radius. Acceptable for this pass; reviewer can flag if visually unacceptable.
- **`shadow-sm` on `Input` still uses the Tailwind default** (px-based, not rem-based). Unaffected by the rebase, but worth noting that it isn't part of any audited scale.
- **Pre-existing `next lint` deprecation warning** still emits — out of scope.
- **`bcryptjs` npm audit warnings** still surface — out of scope.
- **`__tests__/components/ui/.gitkeep`** is still present alongside the new test files. Harmless; can be removed in a future tidy.

## Verification Run

- `npx tsc --noEmit` — exit 0, no diagnostics.
- `npm run lint` — "No ESLint warnings or errors".
- `npm run test:run` — **19 tests passed across 3 files** (Card 3 / Button 7 / Input 9). Exit 0.
- `npx next build` — succeeded. Route set unchanged: `ƒ /`, `ƒ /sign-in`, `ƒ /api/auth/[...nextauth]`, `○ /_not-found`. `/sign-in` First Load JS grew from 126 kB to 133 kB and the home page from 102 kB to 113 kB — accountable to the new component bundle plus the larger Tailwind output from the extended theme.
- `npm run dev` + `curl http://localhost:3000/` and `curl http://localhost:3000/sign-in` — both returned HTTP 200 (after the `buttonClass` extraction deviation; first attempt returned 500 with the cross-boundary error noted under Deviations).
- `mcp__ide__getDiagnostics` — no diagnostics in any `src/` or `__tests__/` file. The errors surfaced are all in `tasks/basic-styling-plan.md` (the markdown plan file) where the IDE parses TS/CSS code blocks inside prose as actual code. Cosmetic, cleared on archive.

## Tailwind Class Audit

Per build-order step 11, grepped the entire `/src` tree for size-related class usages:

```
mt-1, mt-4, mt-6, p-4, p-6, px-3, px-4, py-2, space-y-4, text-4xl
(plus text-base via the layout default)
```

Every value above appears in the new `tailwind.config.ts` override scale. No utility falls back to the un-overridden Tailwind default. The `min-h-screen` (height: `100vh`) is unaffected by the rebase.

## Manual Smoke (for the user)

`docker compose up -d` and `npm run dev`, then:

1. Visit `/` signed-out — styled card with heading + paragraph + Sign In link styled as a primary button.
2. Click Sign In → arrive on `/sign-in` — card with the form, labels above each `<Input>`, primary `<Button>` submit.
3. Submit empty — per-field errors render in danger colour under each input. Submit button label is `Sign In`.
4. Submit `admin` + `pw123` (6 chars, non-matching) — request reaches the server, returns `Invalid name or password.` in danger colour below the submit.
5. Submit correct admin credentials → redirected to `/`.
6. Signed-in `/` — styled card showing `"Welcome, admin"`, `"You're signed in."`, and a primary Sign Out button. No standalone name line.
7. **Click Sign Out** → page **re-renders immediately to the signed-out state** (the bug fix).
8. Resize to ~375 px → card fills width with the `p-4` page gutter. Resize to ≥ 768 px → card caps at `md:max-w-md` and stays centred.
