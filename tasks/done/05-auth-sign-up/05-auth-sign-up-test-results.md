# Test Results: Auth — Sign Up

## Summary
0 tests written. 19 existing tests still passing.

Deliberate, per the spec (Assumption 17). The `04-basic-styling` task introduced tests for the three design-system primitives (Button / Input / Card). Auth-flow tests were not added then and are not added here — the precedent set in `auth-sign-in` / `auth-sign-in-update` continues.

```
$ npm run test:run
 ✓ __tests__/components/ui/Card.test.tsx   (3 tests)
 ✓ __tests__/components/ui/Input.test.tsx  (9 tests)
 ✓ __tests__/components/ui/Button.test.tsx (7 tests)

 Test Files  3 passed (3)
      Tests  19 passed (19)
```

No regressions. Spec AC #16 (`npm run test:run` exits 0) verified.

## Coverage Verified By Other Means

The builder ran a full runtime smoke against the live dev server + MongoDB. The runtime checks (documented in `auth-sign-up-build-summary.md` § "Runtime smoke") cover the ACs that unit tests would otherwise own:

| AC | Verified by |
|---|---|
| 1 — home shows both links | `curl /` grep'd for both hrefs |
| 2 — Sign Up link navigates | href confirmed in markup |
| 3 — schema shape | static-file check |
| 4 — sign-up page renders form | `curl /sign-up` → 200 |
| 5–9 — client validation messages | not tested in this task; spec messages are direct Zod outputs |
| 10 — duplicate username → root error | live POST returned `{"success":false,"error":"Username is already taken."}` |
| 11 — happy path: insert + session + redirect | live POST returned 303 with `Set-Cookie: authjs.session-token`; subsequent `curl /` showed "Welcome, alice<unique>"; `/api/auth/session` confirmed the user |
| 12 — submitting state | structural in `SignUpForm` (same shape as `SignInForm`) |
| 13 — signed-in user redirected | `curl /sign-up` with session cookie → 307 → `/` |
| 14 — `'use client'` only in expected files | static grep |
| 15 — forbidden patterns absent | static grep |
| 16 — tsc/lint/test/build green | builder ran all four |
| 17 — IDE diagnostics clean | `mcp__ide__getDiagnostics` |
| 18 — error branches | code inspection in `signUp.ts` |
| 19 — no pre-existence check | code inspection (no `findUserByName` call in `signUp.ts`) |
| 20 — uses `hashPassword` from `@/lib/password` | code inspection |
| 21 — no plaintext logging | code inspection (no log statement in `signUp.ts`) |

ACs 5–9 (client-side validation messages) are *not* directly tested. They are direct Zod outputs from `signUpSchema` — the messages are baked into the schema string literals. If they regress, the regression would land in `src/lib/validation/signUp.ts` itself; reviewer covers via static-file check.

## Failing Tests
None.

## Bugs Found
None during code review or runtime smoke. The runtime exercise specifically targeted the high-risk areas (the redirect after cookie-set, the duplicate-key error path) and both behaved as the spec required.

## Recommendation for Future Tests

When test debt is addressed, the highest-leverage additions for this feature would be:

1. **`signUpAction` unit** — mock `createUser` + `signIn`. Cases:
   - Valid input → calls `createUser` then `signIn` exactly once each.
   - Duplicate-key error → returns `{ success: false, error: 'Username is already taken.' }`.
   - Other DB error → returns `{ success: false, error: 'Something went wrong. Please try again.' }`.
   - Tampered (e.g. 3-char password slipped past the client) → returns `{ success: false, error: 'Something went wrong. Please try again.' }`.
   - Critical: `signIn` is called and its thrown `NEXT_REDIRECT` is NOT swallowed.

2. **`signUpSchema` unit** — 5+ assertions:
   - 4-char name fails with `"Name must be at least 5 characters."`
   - 65-char name fails with `"Name is too long."`
   - 4-char password fails with `"Password must be at least 5 characters."`
   - 129-char password fails with `"Password is too long."`
   - Valid input passes.

3. **`SignUpForm` RTL** — mirror the `SignInForm` test recommendation from `auth-sign-in-update`. Single render + interactions: empty submit, valid submit (mocked action), action-returns-failure → root error.

All three are essentially free to add now that the `04-basic-styling` task established the Vitest + RTL infrastructure. The runtime smoke run by this task's builder validated the integration, but unit-level coverage would protect against future regressions.

## `vitest.config.mts` Note

`passWithNoTests` remains absent (removed in `04-basic-styling`). Adding zero tests in this task means the suite ran ONLY the existing 19 cases. If those 19 ever go to zero (e.g. mass file deletion), `npm run test:run` will correctly fail — the guardrail set up in the previous task continues to do its job.
