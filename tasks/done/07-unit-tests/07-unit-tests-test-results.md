# Test Results: Unit Tests — Catch the Bugs, Not Smoke-Tests

## Summary
**78 tests passing across 12 files** (was 19 across 3). 59 new tests landed, 0 failing.

This is the first task whose primary deliverable IS test files. The test agent's role here flips slightly: instead of writing the tests (the builder did, because they are the task), the test agent verifies the new suite covers what the spec requires and reports.

```
$ npm run test:run
 ✓ __tests__/lib/errors.test.ts                       (11 tests)
 ✓ __tests__/lib/validation/signIn.test.ts            (6 tests)
 ✓ __tests__/lib/validation/signUp.test.ts            (5 tests)
 ✓ __tests__/lib/auth-config.test.ts                  (4 tests)
 ✓ __tests__/middleware.test.ts                       (10 tests)
 ✓ __tests__/actions/signIn.test.ts                   (6 tests)
 ✓ __tests__/actions/signUp.test.ts                   (5 tests)
 ✓ __tests__/components/features/SignInForm.test.tsx  (6 tests)
 ✓ __tests__/components/features/SignUpForm.test.tsx  (6 tests)
 ✓ __tests__/components/ui/Button.test.tsx            (7 tests)
 ✓ __tests__/components/ui/Card.test.tsx              (3 tests)
 ✓ __tests__/components/ui/Input.test.tsx             (9 tests)

 Test Files  12 passed (12)
      Tests  78 passed (78)
```

## Coverage of Acceptance Criteria

| AC | Coverage |
|---|---|
| 1 — ~71 passing tests across ~11 files | **Exceeded**: 78 across 12. |
| 2 — `src/lib/errors.ts` exports both predicates | Verified by import in `errors.test.ts`. |
| 3 — `signIn.ts` imports `isRedirectError`, no local copy | Code inspection + `errors.test.ts` import. |
| 4 — `signUp.ts` imports `isDuplicateKeyError`, no local copy | Same. |
| 5 — `middleware.ts` extracted decision into a named function | Verified by `middleware.test.ts` importing `decideRedirect`. The function ended up in `src/lib/redirect-rules.ts` (documented deviation; same intent). |
| 6 — validation/signIn.test covers the 6 behaviours | Verified (5 rules + happy path = 6). |
| 7 — validation/signUp.test covers the 5 behaviours | Verified. |
| 8 — errors.test covers both predicates with positive/negative/null/undefined/wrong-shape | Verified (11 cases). |
| 9 — auth-config.test asserts the 4 structural properties | Verified (4 cases — all four properties asserted). |
| 10 — signIn action test covers 6 branches including the NEXT_REDIRECT propagation | Verified. The bug-catch case (`signIn throws NEXT_REDIRECT → action re-throws`) is test #4 in the file. |
| 11 — signUp action test covers 5 outcomes including duplicate-key | Verified. |
| 12 — middleware test covers every case from the 10-case `decideRedirect` matrix | Verified. |
| 13 — SignInForm RTL test covers 6 behaviours including autoFocus | Verified. |
| 14 — SignUpForm RTL test covers 6 behaviours | Verified. |
| 15 — CLAUDE.md Testing Rules section contains the policy, categories, and smoke subsections | Verified by reading the file. |
| 16 — reviewer-agent.md "Test quality" has the new Blocker bullet | Verified. |
| 17 — `tsc`, `lint`, `next build` all exit 0 | Verified. |
| 18 — IDE diagnostics clean | Verified. |
| 19 — No `any`, no bare `<a>`, etc. in test files | Static grep clean (the builder included the test files in the sweep). |
| 20 — 8 redirect matrix cases unit-tested | Verified — middleware test has 8 explicit redirect cases + 2 nested-path pass-throughs. |

All 20 ACs met.

## The three bug classes — coverage map

| Bug | Test | Assertion |
|---|---|---|
| signInAction broad try/catch swallows NEXT_REDIRECT | `__tests__/actions/signIn.test.ts` → "re-throws when signIn throws a NEXT_REDIRECT-shaped error" | `await expect(signInAction(...)).rejects.toThrow(/NEXT_REDIRECT/)` |
| Edge-runtime Mongoose import via auth.ts | `__tests__/lib/auth-config.test.ts` → "does NOT include an adapter" | `expect('adapter' in authConfig).toBe(false)` |
| Middleware silently absent under `src/` layout | (filesystem-level — see Notes) | CLAUDE.md rule + reviewer Blocker policy. |

The first two are now ungetabledable as a unit-test regression. The third is harder to catch as a unit test (the file's location is what matters, not its contents); the safeguard is documentation + reviewer enforcement.

## Failing Tests
None.

## Bugs Found During Test Writing
None. The refactors (extracting predicates to `src/lib/errors.ts`, extracting `decideRedirect` to `src/lib/redirect-rules.ts`) are behaviour-preserving; the existing production code was correct, just needed to be made testable.

One **architectural finding**, surfaced by the first failing test run: importing anything from `src/middleware.ts` drags `next-auth` into the test bundle, which Vitest cannot resolve (`Cannot find module 'next/server'`). Resolution: extract the pure decision logic to a separate module without a `next-auth` runtime import. Documented as a deviation and reflected in CLAUDE.md's Testing Rules.

## Recommendation for Future Tasks
- **Server-component page tests** are still missing. The HomePage, SignInPage, SignUpPage, DashboardPage are all small markup-only renders that wrap a Card + content. They could be tested by importing the component and rendering it with a stubbed `auth()`. Out of scope for this task; sensible follow-up if the team wants belt-and-braces.
- **Coverage thresholds** could now be added to `vitest.config.mts` (`coverage.thresholds: { lines: 70, ... }`) since the suite is meaningfully populated. Out of scope; would benefit from one task to wire up.
- **A small CI step** to run `npm run test:run` on every PR (if/when CI is set up) would lock in the suite's value.

## Vitest Config Note
`passWithNoTests` remains absent (default `false` per CLAUDE.md). Any future task that accidentally deletes all tests will fail `npm run test:run` loudly. With 78 tests in the suite, this guardrail is now meaningful.
