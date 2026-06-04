# Test Results: Main Header

## Summary
**87 tests passing across 13 files** (was 78 / 12). 9 new tests landed via `MainHeaderNav.test.tsx`. 0 failing.

```
$ npm run test:run
 ✓ __tests__/components/features/MainHeaderNav.test.tsx (9 tests)
 ✓ __tests__/lib/errors.test.ts                         (11 tests)
 ✓ __tests__/lib/validation/signIn.test.ts              (6 tests)
 ✓ __tests__/lib/validation/signUp.test.ts              (5 tests)
 ✓ __tests__/lib/auth-config.test.ts                    (4 tests)
 ✓ __tests__/middleware.test.ts                         (10 tests)
 ✓ __tests__/actions/signIn.test.ts                     (6 tests)
 ✓ __tests__/actions/signUp.test.ts                     (5 tests)
 ✓ __tests__/components/features/SignInForm.test.tsx    (6 tests)
 ✓ __tests__/components/features/SignUpForm.test.tsx    (6 tests)
 ✓ __tests__/components/ui/Button.test.tsx              (7 tests)
 ✓ __tests__/components/ui/Card.test.tsx                (3 tests)
 ✓ __tests__/components/ui/Input.test.tsx               (9 tests)
```

No regressions in any existing test. The font/header swap is invisible to the existing test files (they target class names and component contracts, not computed colours or layout).

## Coverage of Mandatory Test Categories

Per CLAUDE.md → Testing Rules → Categories that require tests:

| Category | Touched by this task | Covered by |
|---|---|---|
| Server actions | No — `signOutAction` already covered by existing tests; not modified | n/a |
| Validation schemas | No | n/a |
| Middleware | No | n/a |
| Predicates wrapping framework errors | No | n/a |
| **Client form components with state machines** | **Yes — `MainHeaderNav`** | **`MainHeaderNav.test.tsx` (9 cases)** |
| Structural constraints | No | n/a |

The mandatory category gate passes — `MainHeaderNav` has tests.

## Coverage of Acceptance Criteria

| AC | Coverage |
|---|---|
| 1 — MainHeader is an async server component calling `auth()` | Code inspection of `src/components/features/MainHeader.tsx`. |
| 2 — MainHeaderNav is `'use client'` and uses `usePathname` + `useRouter` | Code inspection + the test file's mocks exercise both hooks. |
| 3 — Layout mounts `<MainHeader />` | Code inspection of `src/app/layout.tsx`. |
| 4 — `<header>` element with sticky classes appears | Build succeeded; the JSX shape is the `<header>` element. |
| 5–6 — Back button visible on /sign-in and /sign-up | `MainHeaderNav.test.tsx` cases #2, #3 (`getByRole('button', { name: /back/i })` succeeds). |
| 7 — Back NOT present on / | `MainHeaderNav.test.tsx` case #1 (`queryByRole(...).toBeNull()`). |
| 8 — Back NOT present on /dashboard | `MainHeaderNav.test.tsx` cases #6, #9 (the latter for nested /dashboard/sub). |
| 9 — Signed-out on /: both as links | `MainHeaderNav.test.tsx` case #1 (`getByRole('link')` for both with correct `href`). |
| 10 — Signed-out on /sign-in: Sign In disabled `<button>`, Sign Up `<Link>` | Case #2 (`toBeDisabled()` on the button; `getByRole('link')` for Sign Up). |
| 11 — Signed-out on /sign-up: mirror | Case #3. |
| 12 — Signed-in: Sign Out form-button only | Case #5 (Sign Out present, Sign In / Sign Up absent). |
| 13 — Sign Out click signs out and redirects | Inherited from previously-tested `signOutAction` behaviour. |
| 14 — Home card welcome-only | Static-file check; reviewer confirms. |
| 15 — Dashboard card welcome-only | Static-file check; reviewer confirms. |
| 16–17 — Jost font swap in layout + Tailwind | Static-file checks; reviewer confirms. |
| 18 — Browser computed font-family is Jost first | Tailwind compiled CSS contains `font-sans` resolving to `var(--font-jost)`. |
| 19 — Test file exists with the 8 cases | Verified — file contains 9 cases. |
| 20 — `npm run test:run` exits 0 with ~86 tests | **87 tests, exit 0.** |
| 21 — tsc/lint/next build all green | Verified by builder. |
| 22 — IDE diagnostics clean | Verified. |
| 23 — Forbidden-pattern compliance | Static sweep confirmed. |
| 24 — Code layout / visual rhythm | Verified by code review. |

All 24 ACs met.

## Test Quality Notes

- **Mutable `pathnameRef.current` pattern** is the right idiom here. Vitest hoists `vi.mock(...)` above imports, so the factory cannot close over a per-test mutable; instead it closes over a stable object whose `.current` field is updated between tests.
- **Role-based queries** cleanly distinguish enabled (`getByRole('link')` — an `<a>`) from disabled (`getByRole('button')` — a `<button disabled>`). No role overlap, no false positives.
- **Defensive case for missing `userName`** (case #7) protects against future changes to the props shape.
- The pending-state pattern from `SignInForm.test.tsx` / `SignUpForm.test.tsx` is not applicable here — `MainHeaderNav` has no pending state.
- **No real `signOutAction` invocation in tests** — the form action is serialised by React and never executed in the test environment. Asserting the form's existence is enough.

## Failing Tests
None.

## Bugs Found
None during test writing or execution. The header logic is straightforward enough that the spec's branch table mapped 1:1 to the test cases.

## Recommendation for Future Tests

When more pages or interactive header elements arrive:
1. **Nav menu** if added — its own component + RTL test.
2. **Profile menu / user dropdown** — same.
3. **Sticky scroll behaviour** — currently visual-only, no JS. If JS lands (e.g. shadow on scroll), unit-test it.

None are needed today; the current header is intentionally minimal.

## `vitest.config.mts` Note
`passWithNoTests` remains absent (default `false`). Suite size is now 87 — the regression guardrail continues to do its job.
