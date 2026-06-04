# Review: Unit Tests — Catch the Bugs, Not Smoke-Tests

## STATUS: PASS

## Acceptance Criteria Check

- [x] 1 — `npm run test:run` exits 0 and reports **78 passing tests across 12 files** (target was ~71/~11; exceeded).
- [x] 2 — `src/lib/errors.ts` exports both `isRedirectError(err: unknown): boolean` and `isDuplicateKeyError(err: unknown): boolean`. Bodies byte-identical to the previous local copies in the action files.
- [x] 3 — `src/actions/signIn.ts` imports `isRedirectError` from `@/lib/errors`. The local function declaration is gone.
- [x] 4 — `src/actions/signUp.ts` imports `isDuplicateKeyError` from `@/lib/errors`. The local function declaration is gone.
- [x] 5 — The redirect decision is extracted into a named function `decideRedirect` — landed in `src/lib/redirect-rules.ts` (deviation from the plan's `src/middleware.ts` placement; documented). `src/middleware.ts` imports from the new module. Behaviour is identical at the middleware-runtime level.
- [x] 6 — `__tests__/lib/validation/signIn.test.ts` covers the 6 behaviours from the spec: empty name, whitespace name, oversize name, empty password, oversize password, valid input.
- [x] 7 — `__tests__/lib/validation/signUp.test.ts` covers the 5 behaviours: short name, oversize name, short password, oversize password, valid input.
- [x] 8 — `__tests__/lib/errors.test.ts` covers both predicates with positive, negative, null, undefined, and wrong-shape inputs (11 cases total).
- [x] 9 — `__tests__/lib/auth-config.test.ts` asserts the four structural properties: `'adapter' in authConfig === false`, `session.strategy === 'jwt'`, `providers.length === 0`, callbacks are functions.
- [x] 10 — `__tests__/actions/signIn.test.ts` covers six branch outcomes — including the **critical bug-catch case**: `await expect(signInAction(...)).rejects.toThrow(/NEXT_REDIRECT/)` when `signIn` throws a redirect-shaped error.
- [x] 11 — `__tests__/actions/signUp.test.ts` covers five outcomes including the duplicate-key path (`code === 11000` → `"Username is already taken."`) and the NEXT_REDIRECT propagation assertion.
- [x] 12 — `__tests__/middleware.test.ts` covers all 10 cases from the `decideRedirect` matrix (5 signed-out + 5 signed-in), including the 8 cases from the previous task's runtime smoke plus the 2 nested-path pass-throughs.
- [x] 13 — `__tests__/components/features/SignInForm.test.tsx` covers the six behaviours including autoFocus (`document.activeElement === Name input` after render).
- [x] 14 — `__tests__/components/features/SignUpForm.test.tsx` covers the six behaviours including the duplicate-username error rendering.
- [x] 15 — `CLAUDE.md` "Testing Rules" section contains the top-of-section policy ("Unit tests are the default coverage mechanism") with the three motivating bug classes; the "Categories that require tests" subsection lists all six categories from the spec; the "Smoke matrices" subsection clarifies when smoke is appropriate. Verified by reading the file.
- [x] 16 — `agents/reviewer-agent.md` "Test quality" subsection has the new Blocker bullet: "Mandatory categories must be covered. If a server action, validation schema, middleware module, or predicate wrapping a framework error lands in the diff without a corresponding unit test in the same task, that's a Blocker."
- [x] 17 — `tsc --noEmit` exit 0; `npm run lint` exit 0; `npx next build` exit 0 with the route topology unchanged.
- [x] 18 — `mcp__ide__getDiagnostics` returns no diagnostics in any source or test file.
- [x] 19 — Static sweep: zero `: any`, zero bare `<a `, zero `<img`, zero `next/router`, zero `window.location`, zero `Readonly<{}>`, zero `React.` namespace references. `'use client'` count unchanged at 4.
- [x] 20 — The 8 redirect-matrix cases from the previous task's runtime smoke are unit-tested in `__tests__/middleware.test.ts`. Verified case-by-case against the build summary's table.

All 20 ACs met.

## Plan Compliance

- All planned production-code refactors landed: `src/lib/errors.ts` created; both actions import from it.
- The middleware refactor landed; the only deviation is the location of `decideRedirect` (architect put it inside `src/middleware.ts`; builder moved to `src/lib/redirect-rules.ts` after the first test run revealed the `next-auth` → `next/server` Vitest-resolution issue). The deviation is properly documented in the build summary and reflected in CLAUDE.md's Categories guidance ("in a module with no `next-auth` runtime import"). Better outcome than the plan would have produced.
- All 8 planned test files exist. The synthetic-redirect helper (`__tests__/test-utils/redirect-error.ts`) is the single source of truth for the NEXT_REDIRECT shape.
- CLAUDE.md and the reviewer agent updates landed per the spec.
- No runtime smoke — by design.

## Code Quality

- TypeScript strict; no `any` even in test files.
- Test files follow the visual-rhythm conventions from CLAUDE.md (blank line after `render(...)`, blank between element lookup and assertions, grouped `expect`s within a single behaviour).
- Mocks are declared at the top of each file via `vi.mock(...)` — hoisted by Vitest. No global setup mutations.
- The `Promise<never>(() => {})` pending-state pattern is used consistently in both form tests for the loading-state assertion.
- The `makeRedirectError` helper is reused across three test files, with no inline duplication of the error shape.
- The `mongoose` mock at the top of action tests prevents the User model's module-load `mongoose.model(...)` call from failing in jsdom — documented in CLAUDE.md's Mocking conventions.
- `Test Behaviour Specifications` in the spec map cleanly onto test names ("re-throws when signIn throws a NEXT_REDIRECT-shaped error", "does NOT include an adapter", etc.).

## Blockers
None.

## Notes (non-blocking)

1. **The `decideRedirect` extraction to `src/lib/redirect-rules.ts`** is the load-bearing deviation. The plan placed it inside `src/middleware.ts`; the test couldn't import from there because `next-auth` → `next/server` failed Vitest's resolver. The fix is cleaner than the plan: pure logic isolated from framework wiring. Worth carrying forward as a pattern.
2. **Server-component page tests** are not part of this task — the dashboard, sign-in, and sign-up pages are markup-only renders that wrap a Card + content. Sensible follow-up but explicitly scoped out.
3. **Coverage thresholds** are not enforced. The suite is now meaningful (78 tests over ~14 production source files) but no `coverage.thresholds` config is set. Adding one (e.g. `lines: 70`) is a small follow-up.
4. **The `auth-config.test.ts` "providers length 0" assertion** depends on the edge-safe `authConfig` not having providers spliced in by `auth.ts`. The current architecture spreads `authConfig` and adds `providers` at the `NextAuth(...)` call site, so the stored `authConfig.providers` stays empty. If someone ever mutates `authConfig` after-the-fact, the test catches it.
5. **The `mongoose` mock** at the top of each action test file is somewhat boilerplate-y. Could be hoisted to a shared `__tests__/test-utils/mongoose-mock.ts` in a future tidy. Not necessary today.
6. **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.
7. **`SignInForm.test.tsx`'s "renders root error" case** technically depends on `react-hook-form` flushing the `setError('root', ...)` call before the assertion. Handled cleanly via `await screen.findByText(...)`. If `react-hook-form` ever changes its timing model, that assertion is the canary.

## Approved Files

- New: `src/lib/errors.ts`, `src/lib/redirect-rules.ts`, plus the 8 new test files (plus `__tests__/test-utils/redirect-error.ts`).
- Modified: `src/actions/signIn.ts`, `src/actions/signUp.ts`, `src/middleware.ts`, `CLAUDE.md`, `agents/reviewer-agent.md`.

No files require changes. STATUS: PASS.
