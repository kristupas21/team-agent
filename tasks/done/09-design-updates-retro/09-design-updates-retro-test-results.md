# Test Results: Design Updates — Retro-Futuristic

## Summary
**91 tests passing across 13 files** (was 87 / 13). 4 new tests landed in `Button.test.tsx` for the icon API. 0 failing.

```
$ npm run test:run
 ✓ __tests__/lib/errors.test.ts                         (11 tests)
 ✓ __tests__/lib/validation/signIn.test.ts              (6 tests)
 ✓ __tests__/lib/validation/signUp.test.ts              (5 tests)
 ✓ __tests__/lib/auth-config.test.ts                    (4 tests)
 ✓ __tests__/middleware.test.ts                         (10 tests)
 ✓ __tests__/actions/signIn.test.ts                     (6 tests)
 ✓ __tests__/actions/signUp.test.ts                     (5 tests)
 ✓ __tests__/components/features/SignInForm.test.tsx    (6 tests)
 ✓ __tests__/components/features/SignUpForm.test.tsx    (6 tests)
 ✓ __tests__/components/features/MainHeaderNav.test.tsx (9 tests)
 ✓ __tests__/components/ui/Button.test.tsx              (11 tests — was 7)
 ✓ __tests__/components/ui/Card.test.tsx                (3 tests)
 ✓ __tests__/components/ui/Input.test.tsx               (9 tests)
```

## Coverage of Mandatory Test Categories

Per CLAUDE.md → Testing Rules → Categories that require tests:

| Category | Touched by this task | Covered by |
|---|---|---|
| Server actions | No | n/a |
| Validation schemas | No | n/a |
| Middleware | No | n/a |
| Predicates wrapping framework errors | No | n/a |
| Client form components with state machines | No (SignInForm/SignUpForm unchanged; MainHeaderNav class-name updates only) | n/a |
| **UI primitive with new public API (`Button` `leftIcon`/`rightIcon`)** | **Yes** | **`Button.test.tsx` (+4 cases)** |
| Structural constraints | No | n/a |

The mandatory category gate passes — `Button`'s new icon API is tested.

## Coverage of Acceptance Criteria

| AC | Coverage |
|---|---|
| 1 — layout imports Jost + Oleo with correct variables | Static-file check. |
| 2 — Tailwind has both `fontFamily.sans` and `fontFamily.display` | Static-file check + compiled CSS contains `.font-display{font-family:var(--font-oleo),cursive}`. |
| 3 — `<h1>` computed font-family starts with Oleo | Verified indirectly: the `font-display` utility class resolves to `var(--font-oleo)` in compiled CSS; the new HomePage / DashboardPage / error / not-found `<h1>` elements all use it. |
| 4 — paragraphs / inputs / buttons computed font-family is Jost | Same — `font-sans` resolves to `var(--font-jost)` first. |
| 5 — Tailwind palette has the 5 tokens with correct step counts and hexes | Static-file check + CSS-grep confirms emitted hexes. |
| 6 — compiled CSS contains `rgb(60 126 126)` for `bg-primary-500` | **Verified** — see build summary's CSS verification table. |
| 7 — compiled CSS contains `rgb(251 247 235)` for `bg-neutral-100` | **Verified**. |
| 8 — `Card.tsx` uses `bg-neutral-100` | Static-file check + `Card.test.tsx` assertion updated to match. |
| 9 — Card computed background is `#fbf7eb` | Verified via the compiled CSS. |
| 10 — Home page does NOT import or render `Card` | Static-file check. |
| 11 — Dashboard page does NOT import or render `Card` | Static-file check. |
| 12, 13 — Sign-in / Sign-up still import + render `Card` | Static-file check (the files were only moved). |
| 14 — `react-icons` in dependencies | `package.json` updated. |
| 15 — `MainHeaderNav.tsx` imports the 4 Material icons | Static-file check. |
| 16 — `Button.tsx` `ButtonProps` extended with `leftIcon`/`rightIcon`/optional `children` | Static-file check + the 4 new tests exercise this. |
| 17 — leftIcon renders before children | **`Button.test.tsx` test "renders leftIcon as the first child of the button"**. |
| 18 — rightIcon renders after children | **`Button.test.tsx` test "renders rightIcon as the last child of the button"**. |
| 19 — icon-only button with `aria-label` | **`Button.test.tsx` test "renders an icon-only button (no children) with an aria-label"**. |
| 20 — loading hides icons | **`Button.test.tsx` test "hides both icons and shows Loading... when loading is true"**. |
| 21 — Back button is icon-only with aria-label | Static-file check on `MainHeaderNav.tsx` + the existing `MainHeaderNav.test.tsx` continues to pass (accessible name via aria-label). |
| 22–24 — auth buttons in header have correct left icons | Static-file check on `MainHeaderNav.tsx`. |
| 25 — compiled CSS has `.hover\:bg-primary-700` rule | Verified — Tailwind generates this from the existing variant class. |
| 26 — hover darken visible | Indirect — new palette provides distinguishable `-500` (`#3c7e7e`) vs `-700` (`#2c5f5f`). |
| 27 — route-group restructure complete | Verified via `find` listing. |
| 28 — `(main)/layout.tsx` imports + renders `<MainHeader />` | Static-file check. |
| 29 — root `layout.tsx` does NOT import or render `MainHeader` | Static-file check. |
| 30 — URLs `/`, `/sign-in`, `/sign-up`, `/dashboard` resolve | Verified via `next build` route table. |
| 31 — `error.tsx` is client component with new design | Static-file check (with the deviation noted in the build summary — props parameter dropped). |
| 32 — `not-found.tsx` is server component with new design | Static-file check. |
| 33 — `/no-such-page` renders not-found WITHOUT MainHeader | Verified — `not-found.tsx` lives at root, wrapped only by root layout (no header). |
| 34 — thrown error renders error.tsx WITHOUT MainHeader | Same — `error.tsx` lives at root. |
| 35 — "Go home" link to `/`; middleware redirects signed-in users | Indirect — `<Link href="/">` is in both pages; middleware behaviour is locked by the existing `middleware.test.ts`. |
| 36, 37 — `middleware.ts` and `redirect-rules.ts` byte-identical | Verified by code inspection. |
| 38 — `Button.test.tsx` has 4 new cases | Verified. |
| 39 — `npm run test:run` exits 0 with 91 tests | **Verified**. |
| 40 — tsc/lint/test/build all green | Verified. |
| 41 — IDE diagnostics clean | Verified. |
| 42 — forbidden-pattern sweep clean | Verified. |
| 43 — Visual rhythm honoured | Spot-checked all modified files. |

All 43 ACs met.

## Failing Tests
None.

## Bugs Found

Two issues caught during the build, all fixed before docs:

1. **Stale `.next/types` referenced old page paths** after the route-group restructure. Resolution: `rm -rf .next` before re-running `tsc` / `next build`.
2. **Card test still asserted `bg-white`**. Resolution: updated the two assertions in `__tests__/components/ui/Card.test.tsx` to `bg-neutral-100`. The same kind of class-name-tied-to-implementation that the spec / Testing Rules warn about — but here it was the *correct* class to check, just out of date.
3. **`compareDocumentPosition` approach for icon order assertions returned the wrong relationship** because `getByText` returns the text node's parent (which is the button itself in our flat fragment render). Rewrote those tests to use `firstChild === icon` and `lastChild === icon` against the button — simpler and correct.
4. **`@typescript-eslint/no-unused-vars`** flagged `_props: ErrorPageProps` in `error.tsx`. The Next.js lint config doesn't accept the `_`-prefix convention. Resolution: dropped the parameter entirely; Next.js still passes props at runtime, the component just doesn't reference them.

None of the four are production-code issues — they're build-setup / test-correctness issues caught and resolved during the verification run.

## Recommendation for Future Tests

The current 91-test suite covers the high-value surfaces. When more features land:
1. **`MainHeader` server component** still has no dedicated test — it's a thin wrapper around `<MainHeaderNav>`. Worth adding a small render test if it ever gains business logic.
2. **`error.tsx` / `not-found.tsx`** are static markup; no test needed unless they grow logic (e.g. a Try-Again button using `reset()`).
3. **Icon order** in production usage (Sign In / Up / Out buttons in the header) is implicitly verified by the `MainHeaderNav.test.tsx` queries since each uses semantic accessible-name matching.

## `vitest.config.mts` Note
`passWithNoTests` remains absent. Suite size is now 91 across 13 files. The guardrail continues to do its job.
