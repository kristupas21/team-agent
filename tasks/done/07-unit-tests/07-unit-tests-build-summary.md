# Build Summary: Unit Tests — Catch the Bugs, Not Smoke-Tests

## Files Created

### Production-code helpers (refactor-only, no behaviour change)
- `src/lib/errors.ts` — exports `isRedirectError(err: unknown): boolean` and `isDuplicateKeyError(err: unknown): boolean`. Bodies byte-identical to the previous local-function copies in `src/actions/signIn.ts` and `src/actions/signUp.ts`.
- `src/lib/redirect-rules.ts` — exports `decideRedirect(req)` and a private `DecideRedirectInput` type. Pure function over `{ auth: Session | null, nextUrl: { pathname }, url }`. No `next-auth` runtime import (only the `Session` type, which is type-only). See Deviations.

### Test files (8 new)
- `__tests__/test-utils/redirect-error.ts` — `makeRedirectError(target?: string)` produces a synthetic `NEXT_REDIRECT`-shaped error.
- `__tests__/lib/errors.test.ts` — 11 cases covering both predicates with positive, negative, null, undefined, and wrong-shape inputs.
- `__tests__/lib/validation/signIn.test.ts` — 6 cases covering the signIn schema rules + happy path.
- `__tests__/lib/validation/signUp.test.ts` — 5 cases covering the signUp schema rules + happy path.
- `__tests__/lib/auth-config.test.ts` — 4 structural assertions (no `adapter` key, JWT strategy, empty providers, callback functions present). Locks in the edge-safe split-config that prevents the Edge-runtime crypto bug from re-appearing.
- `__tests__/middleware.test.ts` — 10 `decideRedirect` cases covering the 8-case redirect matrix + 2 nested-path pass-through cases.
- `__tests__/actions/signIn.test.ts` — 6 cases. Includes the critical "NEXT_REDIRECT propagates rather than being swallowed" assertion (the bug-catch case).
- `__tests__/actions/signUp.test.ts` — 5 cases. Includes the same NEXT_REDIRECT-propagation assertion.
- `__tests__/components/features/SignInForm.test.tsx` — 6 RTL cases (render, autoFocus, empty submit, valid submit, action-returns-failure, pending state).
- `__tests__/components/features/SignUpForm.test.tsx` — 6 RTL cases (mirror of SignInForm with sign-up bounds and duplicate-error text).

## Files Modified

- `src/actions/signIn.ts` — added `import { isRedirectError } from '@/lib/errors'`; removed the local `isRedirectError` function. No behavioural change.
- `src/actions/signUp.ts` — added `import { isDuplicateKeyError } from '@/lib/errors'`; removed the local `isDuplicateKeyError` function. No behavioural change.
- `src/middleware.ts` — slimmed. Now imports `decideRedirect` from `@/lib/redirect-rules` and wires it into the `auth((req) => ...)` wrapper. No behavioural change at the middleware-runtime level (same matcher, same redirect rules).
- `CLAUDE.md` — Testing Rules section rewritten per spec. New top-of-section policy ("Unit tests are the default coverage mechanism") with the three motivating bug classes. New subsections: "Categories that require tests", "Mocking conventions", "Smoke matrices". The existing "Stack", "Test file location", "Vitest config", "npm scripts" subsections preserved (with minor wording polish).
- `agents/reviewer-agent.md` — one new bullet at the bottom of "Test quality" making missing tests for any mandatory category a Blocker.

## Files NOT Modified
- `vitest.config.mts`, `vitest.setup.ts`, `package.json` — unchanged. The new tests reuse the existing jsdom + vite-tsconfig-paths + RTL + user-event setup.
- All other production source files.
- All previously-existing test files (`Button.test.tsx`, `Card.test.tsx`, `Input.test.tsx`) — unchanged. They keep passing.

## Deviations

1. **`decideRedirect` moved from `src/middleware.ts` to `src/lib/redirect-rules.ts`.** The plan placed the helper inside `middleware.ts`. The first test run failed because importing from `@/middleware` transitively loads `next-auth`, which has an internal `import 'next/server'` that Vitest's resolver cannot resolve (it expects `next/server.js`). Two options were possible:
   - Mock `next-auth` in `middleware.test.ts`.
   - Extract `decideRedirect` to a module without a `next-auth` runtime import.
   Picked the second — cleaner separation between pure redirect logic and framework wiring, no per-test-file mock boilerplate, and the resulting module makes the test surface match the spec's intent ("Extract the decision into a named function so it can be unit-tested without the Auth.js wrapper"). The middleware now imports `decideRedirect` from the new module. Behaviour at the live middleware-runtime level is unchanged. CLAUDE.md's testing-categories section was updated to reflect this idiomatic structure ("Extract the decision into a named function ... in a module with no `next-auth` runtime import").

2. **One additional category in CLAUDE.md** beyond what the plan enumerated: **"Structural constraints"** — covers the `authConfig` no-adapter assertion in `auth-config.test.ts`. Added to make the category list match what was actually written.

## Ambiguities
None required `// NOTE:` markers. Three minor implementation calls handled inline:

- **`vi.mocked(signIn).mockResolvedValueOnce(undefined as never)`** — the Auth.js `signIn` overload signature is typed `Promise<...>` with a complex return; `as never` short-circuits the type check for the test path that asserts a successful return (which is unreachable in practice, kept for symmetry).
- **`getByLabelText(/password/i)`** instead of `getByRole('textbox', { name: /password/i })` — password inputs are NOT in the `textbox` role; RTL exposes them only via label-text query. Documented inline.
- **`Promise<never>(() => {})`** — the canonical "never-resolves" pending-state mock for the loading-state test. The cast is required because `vi.mocked(...).mockReturnValueOnce(pending)` expects the mocked function's return type. Used `as never` to bypass the inference.

## Known Issues

- **`SignInForm.test.tsx` "renders root error" test** uses an unmocked `signInAction` resolving to `{ success: false, error: ... }`. The form's `react-hook-form` infrastructure adds a small async tick before the error appears — handled with `await screen.findByText(...)`.
- **Pre-existing `bcryptjs` audit warnings** still emit — out of scope.
- **Pre-existing `next lint` deprecation warning** still emits — out of scope.
- **`mongoose` mocked at top of action tests.** Without it, importing `src/actions/signUp.ts` transitively loads `src/models/User.ts` which calls `mongoose.model(...)` at module load. Worked perfectly; documented in CLAUDE.md's Mocking conventions subsection.
- **No runtime smoke this task.** This is intentional per the spec — the middleware tests cover the 8-case redirect matrix that the previous task's smoke owned. The whole point of the task is that unit tests replace smoke for these surfaces.

## Verification Run

- `npx tsc --noEmit` → exit 0, no diagnostics.
- `npm run lint` → "No ESLint warnings or errors".
- `npm run test:run` → **78/78 passing across 12 files** (19 existing + 59 new). Distribution:
  - `errors.test.ts`: 11
  - `validation/signIn.test.ts`: 6
  - `validation/signUp.test.ts`: 5
  - `auth-config.test.ts`: 4
  - `middleware.test.ts`: 10
  - `actions/signIn.test.ts`: 6
  - `actions/signUp.test.ts`: 5
  - `SignInForm.test.tsx`: 6
  - `SignUpForm.test.tsx`: 6
  - Existing: Button 7, Input 9, Card 3
- `npx next build` → exit 0. Route topology unchanged: `○ /`, `○ /_not-found`, `ƒ /api/auth/[...nextauth]`, `ƒ /dashboard`, `○ /sign-in`, `○ /sign-up`, `ƒ Middleware (85.3 kB)`.
- `mcp__ide__getDiagnostics` → no diagnostics in any source or test file.

### The three bug classes — coverage

| Bug | Caught by |
|---|---|
| `signInAction` broad try/catch swallows `NEXT_REDIRECT` | `__tests__/actions/signIn.test.ts` — "re-throws when signIn throws a NEXT_REDIRECT-shaped error". A regression would fail this assertion. |
| Middleware silently absent under `src/` layout | Indirectly — `__tests__/middleware.test.ts` imports `decideRedirect` from `@/lib/redirect-rules` and would fail at import resolution if the source vanished. The companion `src/middleware.ts` wiring failure is still a filesystem-level concern; for that, the new CLAUDE.md rule documents the location, and the reviewer enforces it. |
| Edge-runtime Mongoose import via `auth.ts` | `__tests__/lib/auth-config.test.ts` — "does NOT include an adapter". A regression that adds the adapter back would fail this assertion before the dev server is even started. |
