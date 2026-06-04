# Task: Unit Tests — Catch the Bugs, Not Smoke-Tests

## Description
The last task (`06-private-routes-and-styling`) was saved by a mandatory dev-server smoke matrix because three classes of bugs slipped past `tsc`, `npm run lint`, and `npx next build`. That's a sign the test coverage is wrong, not that smoke matrices are a sustainable workflow. This task fills the gaps with real Vitest unit tests, removes the smoke-test mandate from the default pipeline (smoke becomes optional / only when necessary), and updates CLAUDE.md so future tasks reach for unit tests by default instead of leaning on a dev-server check.

## The three bugs the new tests must catch

1. **`signInAction`'s broad `try { ... await signIn(...) } catch {}`** swallowed the `NEXT_REDIRECT` thrown by Auth.js v5 when `redirectTo` is set. The user-visible symptom: sign-in succeeds at the cookie-set level but the action returns `{ success: false, error: GENERIC_ERROR }`, and the user stays on `/sign-in` with the generic error. Static checks were silent. A unit test that mocks `signIn` to throw a `NEXT_REDIRECT`-shaped error and asserts the action re-throws (rather than returning `{ success: false }`) would have caught it.
2. **Middleware silently absent at project root under `src/` layout.** Filesystem-level — Next.js looks at `src/middleware.ts` first when `src/app` exists. A unit test can't directly assert "the dev server picks up the file", but it CAN exercise the middleware export so a regression of `src/middleware.ts` becoming `middleware.ts` would surface as a Vitest import resolution error from a known good path.
3. **Edge-runtime import chain** dragging Mongoose into the middleware bundle. A unit test can't catch the runtime explosion, but it can lock in the split-config architecture: assert that `src/lib/auth.config.ts` exports an `authConfig` with the expected shape (no `adapter`, no DB-touching providers) and that `src/middleware.ts` imports from `auth.config`, not from `@/lib/auth`. A static-source check at test time is enough to flag a future regression.

Beyond catching these three, the suite needs to cover what the last task's runtime smoke matrix currently owns: redirect rules, validation schemas, both server actions' branch logic.

## Scope

### In scope
- **Vitest + RTL unit tests for the following modules**:
  - `src/lib/validation/signIn.ts` — every rule produces the expected message string.
  - `src/lib/validation/signUp.ts` — same.
  - `src/actions/signIn.ts` — branch coverage: Zod failure, count-zero, valid-and-redirected (assert the redirect throw propagates), wrong-password (assert the generic error returns), unrelated server error.
  - `src/actions/signUp.ts` — branch coverage: Zod failure, duplicate-key (`code === 11000`) returns `"Username is already taken."`, other DB error returns generic, valid-and-redirected propagates.
  - `src/middleware.ts` — the four redirect rules and the two pass-through cases. Mock `req.auth` and `req.nextUrl.pathname`.
  - `src/components/features/SignInForm.tsx` — RTL: empty submit → per-field errors; valid submit → action called once; action-returns-failure → root error rendered; pending state disables inputs and button label changes; `autoFocus` is present on the name input.
  - `src/components/features/SignUpForm.tsx` — RTL: same shape of cases for sign-up (note: sign-up's `Name must be at least 5 characters.` is the only "required" message at min(5); no separate `Name is required.` like sign-in has).
  - **Split-config sanity** — a small static test that imports `src/lib/auth.config.ts` and asserts it does NOT include an `adapter` key. This is the "structure regression catch" for bug #3.
- **CLAUDE.md updates** under Testing Rules: pivot the precedent from "tests deferred" to "unit tests are the default coverage mechanism, and the categories below are mandatory targets". Add a rule about when smoke matrices are appropriate (rare and case-specific) and when they are not (most tasks). Reference the three bug classes from this task so future agents understand the motivation.
- **Remove the "mandatory runtime smoke" framing from how downstream agents think about pipelines.** Smoke is still a tool when the change category genuinely needs it (Edge runtime, middleware bundle composition, cookie + redirect in a brand-new shape). It is not a default.

### Out of scope
- Server-component page tests (`HomePage`, `SignInPage`, `SignUpPage`, `DashboardPage`). They're mostly markup; the redirect logic now lives in middleware and is unit-tested separately. Their markup is partly covered by the form RTL tests below. Out of scope to keep this task focused; a follow-up can add them if the team wants belt-and-braces.
- E2E / Playwright tests.
- Integration tests against the live MongoDB container.
- Any change to runtime behaviour. Tests only; the production code stays as-is (excepting a possible tiny refactor if any helper needs to be exported for testability — flag in the spec).
- Coverage reporting / minimum-thresholds setup.

## Test Files to Add
Rough sketch — architect produces the precise list and contents.

- `__tests__/lib/validation/signIn.test.ts`
- `__tests__/lib/validation/signUp.test.ts`
- `__tests__/actions/signIn.test.ts`
- `__tests__/actions/signUp.test.ts`
- `__tests__/middleware.test.ts`
- `__tests__/components/features/SignInForm.test.tsx`
- `__tests__/components/features/SignUpForm.test.tsx`
- `__tests__/lib/auth-config.test.ts` — small structural check (split-config doesn't include adapter).

The existing 19 tests (`Button`, `Input`, `Card`) stay as-is.

## Mocking Conventions to Establish

The previous test files (`Button`, `Input`, `Card`) had no mocks because the components were pure. The new tests need mocks. The architect / builder picks the exact shape, but the categories are:

- **`signIn` / `signOut` / `auth` from `next-auth`** — mock the module. For action tests, mock so a controllable `signIn` can throw `NEXT_REDIRECT`-shaped errors, `CredentialsSignin`-shaped errors, or arbitrary other errors.
- **`next/cache` `revalidatePath`** — mock to no-op; assert call count where relevant (e.g. `signOutAction` calls it).
- **`next/navigation` `redirect`** — mock to throw a synthetic `NEXT_REDIRECT`-shaped error so the test can assert it propagates.
- **MongoDB-backed helpers** (`findUserByName`, `createUser`, `countUsers`) — mock the `@/lib/users` module. No real DB calls.
- **`hashPassword` / `verifyPassword`** — mock `@/lib/password` if relevant (most action tests don't need to exercise bcrypt itself).
- **`useRouter` / `usePathname`** — mock `next/navigation` for form tests.

The mocking conventions appendix in `agents/test-agent.md` already covers most of this; the architect should reuse those patterns and extend where needed.

## CLAUDE.md Changes
Update the **Testing Rules** section:

- Replace the current "tests are written for unit/component scope" with a stronger framing: unit tests are the default coverage mechanism for any logic that is prone to runtime-only failure. Reference the three bug categories from this task as motivating examples.
- Add a "Categories that require tests" subsection listing: server actions (every branch), validation schemas, middleware, predicates that wrap framework errors (e.g. `isRedirectError`, `isDuplicateKeyError`), client form components with state machines.
- Add a "Smoke matrices" subsection: smoke is appropriate when the change introduces a new Edge runtime entry, modifies the middleware bundle composition, or wires up a cookie + redirect pattern for the first time. Otherwise smoke is not required.
- Soften the existing "no tests yet" precedent — that was a starting state, not a policy. From now on, the tasks default to writing tests for the categories above.

The Reviewer agent (`agents/reviewer-agent.md`) may also need a small update to its "Test quality" subsection so the reviewer specifically checks that the new tests target the categories listed in CLAUDE.md.

## Folder / File Touch Points
Rough sketch — architect produces the precise list.

- 8 new test files (paths above).
- `CLAUDE.md` — Testing Rules section rewrite.
- `agents/reviewer-agent.md` — small update to "Test quality" so reviewers check the new mandatory categories.
- `vitest.config.mts` — likely unchanged. `passWithNoTests` was already removed; the existing jsdom + paths setup covers the new tests. The architect should confirm.
- `package.json` — likely unchanged. Vitest + RTL + user-event are already installed.

Potentially:
- `src/actions/signIn.ts` — if `isRedirectError` needs to be exported for direct testing instead of testing it via the action's outer surface. The architect picks — direct unit test of the predicate is simpler than asserting it via action call shapes.
- `src/actions/signUp.ts` — same observation for `isDuplicateKeyError`.

## Done Criteria
- New tests exist under the planned paths.
- `npm run test:run` exits 0 and reports >= 19 + N tests passing, where N is the new test count (target: ~40+ new tests across the eight files).
- Each of the three bug classes has at least one test that would have caught it:
  - A test for `signInAction` that asserts the `NEXT_REDIRECT` propagates rather than being swallowed.
  - A test for `middleware.ts` import resolution (importing from `@/middleware` or `../src/middleware` from the test file works without runtime errors).
  - A test that asserts `authConfig` from `src/lib/auth.config.ts` does NOT include an `adapter` key.
- The redirect matrix that the last task's runtime smoke covered (8 cases) is now unit-tested: 8 middleware test cases assert the same outcomes against mocked `req.auth` + `path`.
- `tsc --noEmit`, `npm run lint` exit 0.
- `npx next build` exits 0 (no production-build regression).
- CLAUDE.md "Testing Rules" reflects the new policy. The reviewer agent's "Test quality" check references the mandatory categories.
- Smoke matrices are no longer described as a default-mandatory step in any agent file or in CLAUDE.md.

## What This Task Does NOT Include
- New production code or behaviour changes (except trivial export visibility changes if needed for testability).
- Server-component page tests.
- E2E tests / Playwright.
- Coverage thresholds or CI wiring.
- A retroactive smoke-test removal from already-archived task docs.

## Notes for the Spec-Agent

- **The three bug categories are the most important framing.** Lead the spec with them. If a reviewer reads the spec a year from now, the first thing they should see is "these tests exist because these bugs slipped past static checks."
- **Smoke matrices have a place.** Don't write CLAUDE.md as if smoke is forbidden — it's appropriate when (a) the change introduces a new Edge runtime entry, (b) the change modifies the middleware bundle composition, or (c) the change is a new cookie + redirect pattern. The point is that unit tests cover everything else.
- **`isRedirectError` and `isDuplicateKeyError` should be testable directly.** If they're currently local-function in the action files, exporting them (or moving to a small `src/lib/errors.ts`) is acceptable. Architect's call.
- **Vitest mock patterns** for `next/navigation` `redirect` are tricky because `redirect` is meant to throw. The mock should throw a synthetic Error with `digest: 'NEXT_REDIRECT;...'` so the tests can use the real `isRedirectError(err)` predicate against the mocked throw. The architect/builder should establish this pattern once and reuse it.
- **The reviewer agent update is intentional.** Without it, future reviewers might still accept tasks with no tests for the mandatory categories.
- **`__tests__/middleware.test.ts` placement.** Middleware lives at `src/middleware.ts`, not in `app` or `lib`. The test path `__tests__/middleware.test.ts` (top-level) mirrors the source location. Architect can also choose `__tests__/lib/middleware.test.ts` if mirroring under `lib` reads better — but the source isn't under `lib`. Recommendation: top-level `__tests__/middleware.test.ts`.
