# Test Results: Private Routes + Styling Refresh

## Summary
0 tests written. 19 existing tests still passing.

Deliberate per the spec (Assumption 13). The runtime smoke matrix run by the builder covers the redirect + cookie behaviour that unit tests would otherwise own.

```
$ npm run test:run
 ✓ __tests__/components/ui/Card.test.tsx   (3 tests)
 ✓ __tests__/components/ui/Input.test.tsx  (9 tests)
 ✓ __tests__/components/ui/Button.test.tsx (7 tests)

 Test Files  3 passed (3)
      Tests  19 passed (19)
```

No regressions, no new tests. The Tailwind hex change had zero effect on the test assertions because the tests target class names, not computed colours.

## Coverage Verified By Other Means

The builder's runtime smoke (documented in `private-routes-and-styling-build-summary.md` § "Verification Run") covers all the ACs that unit tests would otherwise own:

| AC | Verified by |
|---|---|
| 1 — middleware shape | Static-file check + runtime smoke |
| 2-7 — redirect matrix (8 cases) | Live curl matrix: every case matches the spec |
| 8-9 — dashboard renders with `Welcome, {name}.` + `This is your dashboard.` + Sign Out | Live GET with admin session → page rendered |
| 10 — home page is sync, no signed-in branch | Code inspection + `next build` route table shows `○` (static) for `/` |
| 11-12 — sign-in/sign-up pages have no `auth()` call | Code inspection |
| 13 — `signInAction` uses `redirectTo: '/dashboard'` | Code inspection + live POST returned 303 with redirect header to `/dashboard` |
| 14 — `signUpAction` uses `redirectTo: '/dashboard'` | Code inspection |
| 15 — `SignInForm` has no `useRouter`, no `router.push` | Static grep |
| 16-17 — Copse font + Tailwind sans chain | Code inspection in `layout.tsx` and `tailwind.config.ts` |
| 18 — body computed font-family | Tailwind's compiled CSS contains the `font-sans` utility resolving to `var(--font-copse)` first |
| 19-20 — palette hexes in `tailwind.config.ts` and computed | Compiled CSS check: `bg-primary-500 → rgb(127 170 163)` matches `#7faaa3`; same for secondary, neutral-50, danger-500 |
| 21 — existing 19 tests still pass | `npm run test:run` |
| 22-23 — `autoFocus` on Name inputs | Code inspection (both `SignInForm` and `SignUpForm`) |
| 24 — `document.activeElement` is the Name input on `/sign-in` page load | Not verified — would require a browser-based check. The HTML `autoFocus` attribute is the native mechanism and works in all evergreen browsers. |
| 25 — code layout (visual rhythm) | Code inspection of modified files |
| 26 — forbidden-pattern compliance | Static greps for `any`, `<a `, `<img`, `next/router`, `window.location`, `React.`, `Readonly<{}>` — all zero. `'use client'` count unchanged at 4 (SignInForm, SignUpForm, Button, Input). |
| 27 — build & quality gates | Builder ran all four (`tsc`, `lint`, `test:run`, `next build`). |
| 28 — IDE diagnostics | `mcp__ide__getDiagnostics` clean |
| 29 — runtime smoke matrix | Recorded in the build summary. |

## Failing Tests
None.

## Bugs Found
**Three issues caught by the mandatory runtime smoke that static checks missed:**

1. `middleware.ts` at project root was silently ignored under the `src/` layout. Static checks didn't catch it. Fixed by moving to `src/middleware.ts`.
2. After the move, the imported `auth` from `@/lib/auth` dragged MongoDB driver into the Edge runtime, breaking middleware compilation. Fixed via the Auth.js v5 split-config pattern (`auth.config.ts` for edge, `auth.ts` for full).
3. The original `signInAction` had a broad `try { ... signIn(...) } catch {}` that would have swallowed the new `NEXT_REDIRECT` throw introduced by switching from `redirect: false` to `redirectTo`. Reshaped into a narrow try around `countUsers()` only, plus a separate try around `signIn(...)` that uses `isRedirectError(err)` to re-throw redirects.

All three are documented in the build summary's "Diagnostic discovery during the runtime smoke" section. The first two led to two new rules in CLAUDE.md (middleware location + split-config); the third is the third instance of "wrap-around-signIn-must-not-swallow-NEXT_REDIRECT" lesson going back to the original cookie-clear bug in `04-basic-styling`.

## Recommendation for Future Tests

When test debt is addressed, the highest-leverage additions for this task's surface would be:

1. **Middleware unit test** — mock `auth` and exercise the four redirect paths. The middleware is pure logic over `req.auth` + `req.nextUrl.pathname`; very testable.
2. **`isRedirectError(err)` unit** — assertion against a synthetic `NEXT_REDIRECT`-shaped error vs a `CredentialsSignin`-shaped error.
3. **Dashboard page RTL** — render with a stubbed `auth()` returning a user; assert the heading copy contains the user's name.
4. **`signInAction` unit** — mock `countUsers` + `signIn`; cover the four outcome paths (Zod fail, count-zero, redirect success, wrong-password failure).

The runtime smoke caught the regressions that mattered; unit tests would lock the behaviour in.

## `vitest.config.mts` Note
`passWithNoTests` remains absent (removed in `04-basic-styling`). Zero new tests means the existing 19 must all keep passing — which they do. Suite is green.
