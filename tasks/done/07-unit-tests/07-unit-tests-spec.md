# Spec: Unit Tests — Catch the Bugs, Not Smoke-Tests

## Summary
Add Vitest + React Testing Library unit tests covering the three bug categories that slipped past static checks in `06-private-routes-and-styling`, plus the surfaces the runtime smoke matrix currently owns. Then flip the project's testing precedent: unit tests become the default coverage mechanism; dev-server smoke matrices become an exception reserved for specific change categories. CLAUDE.md and the reviewer agent are updated to reflect the new policy. Eight new test files land; two small predicates (`isRedirectError`, `isDuplicateKeyError`) are extracted to a shared module so they can be unit-tested directly. No runtime behaviour change.

## Assumptions

1. **`isRedirectError(err)` and `isDuplicateKeyError(err)` move to `src/lib/errors.ts`** so they're testable in isolation and reusable. The current local-function copies in `src/actions/signIn.ts` and `src/actions/signUp.ts` are removed and replaced by an `import { isRedirectError, isDuplicateKeyError } from '@/lib/errors'`. No behavioural change — the bodies are byte-identical to today's.

2. **New test files mirror their source under `__tests__/`:**
   - `__tests__/lib/validation/signIn.test.ts`
   - `__tests__/lib/validation/signUp.test.ts`
   - `__tests__/lib/errors.test.ts`
   - `__tests__/lib/auth-config.test.ts` — split-config structural check
   - `__tests__/actions/signIn.test.ts`
   - `__tests__/actions/signUp.test.ts`
   - `__tests__/middleware.test.ts` — top-level, mirroring `src/middleware.ts`
   - `__tests__/components/features/SignInForm.test.tsx`
   - `__tests__/components/features/SignUpForm.test.tsx`

3. **Mock conventions** established as project-wide patterns by this task:
   - `vi.mock('@/lib/users', () => ({ findUserByName: vi.fn(), createUser: vi.fn(), countUsers: vi.fn() }))` — mock the DB helpers module wholesale; individual tests `vi.mocked(...)`-narrow their return values.
   - `vi.mock('@/lib/auth', () => ({ signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn(), handlers: {} }))` — full mock of the runtime auth module.
   - `vi.mock('@/lib/password', () => ({ hashPassword: vi.fn(), verifyPassword: vi.fn() }))` — mock the bcrypt wrappers so tests never touch the real bcryptjs cost-12 hashing.
   - `vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))` — mock the cache invalidation surface.
   - `vi.mock('next/navigation', () => ({ redirect: vi.fn((target: string) => { const err = new Error(`NEXT_REDIRECT;push;${target};307;`); ;(err as Error & { digest: string }).digest = `NEXT_REDIRECT;push;${target};307;`; throw err }), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/', useSearchParams: () => new URLSearchParams() }))` — the `redirect` mock throws a `NEXT_REDIRECT`-shaped error so tests can assert against the real `isRedirectError` predicate.
   - `vi.mock('mongoose', () => ({ default: { models: {}, model: vi.fn(), Schema: vi.fn() } }))` — at the **top** of `actions/signUp.test.ts` / `actions/signIn.test.ts` files that transitively pull `src/models/User.ts` through the action's imports. This prevents Mongoose's connection logic from initialising during test setup.
   - These mocks live inside each test file's `vi.mock` block — no global `setup` changes beyond what `vitest.setup.ts` already does. The architect picks whether to centralise common mocks in a small helper file.

4. **No environment changes.** `vitest.config.mts` stays as it is (jsdom env, vite-tsconfig-paths, no `passWithNoTests`). `package.json` stays as it is — Vitest, RTL, user-event are already installed.

5. **`isRedirectError` synthetic-error shape**: `new Error('NEXT_REDIRECT;push;/dashboard;307;')` with the `digest` property set to the same string. The real Next.js redirect throws an error whose `digest` starts with `'NEXT_REDIRECT'`. The predicate (assumption 1) checks this. Tests construct synthetic errors of this shape to exercise the action paths.

6. **No runtime behaviour change anywhere.** The only production-code touchpoint is the `isRedirectError` / `isDuplicateKeyError` extraction, which is a refactor with byte-identical behaviour.

7. **Form tests use the existing `Input` / `Button` components.** No new test utilities. `userEvent.setup()` is reused from the existing test files.

8. **The action tests use `vi.mocked(...).mockResolvedValue` / `.mockRejectedValueOnce`** to control the mocked module exports per test. Each test sets up its mocks at the top of the `it()` body and never relies on cross-test ordering.

9. **The middleware test does NOT import `src/middleware.ts` directly.** It cannot — the file's default export is the wrapped `auth((req) => ...)` function which depends on Auth.js's runtime context. Instead, the test asserts the *logic* of the redirect rules by exporting a small helper from middleware. Concretely:
   - Add `export function decideRedirect(req: { auth: { user?: { name?: string } } | null; nextUrl: { pathname: string }; url: string }): URL | undefined` to `src/middleware.ts` that contains the if/else logic.
   - The default-exported `auth((req) => ...)` becomes a thin wrapper: `const dest = decideRedirect(req); return dest ? Response.redirect(dest) : undefined`.
   - The unit test imports `decideRedirect` and exercises the 8 matrix cases against constructed inputs. This is the same pattern Auth.js v5 docs recommend for testing middleware logic.

10. **The split-config sanity test** (`__tests__/lib/auth-config.test.ts`) imports `authConfig` from `@/lib/auth.config` and asserts:
    - `'adapter' in authConfig === false`
    - `authConfig.session.strategy === 'jwt'`
    - `authConfig.providers.length === 0` — no providers in the edge-safe config; providers are added inside `src/lib/auth.ts` only.
    - `typeof authConfig.callbacks.jwt === 'function'` and `typeof authConfig.callbacks.session === 'function'`
    A future regression that adds the adapter back to `auth.config.ts` would re-introduce the Edge-runtime bug; this test catches it.

11. **`SignInForm` / `SignUpForm` RTL tests** use the same pattern as the existing `Button.test.tsx` / `Input.test.tsx` files: `render(<Form />)`, `userEvent` for interactions, `screen.getBy*` for queries, semantic-first (`getByRole('textbox')`, `getByRole('button')`). The action they call is mocked via `vi.mock('@/actions/signIn', () => ({ signInAction: vi.fn() }))`.

12. **Form tests cover the autoFocus assertion** — `expect(document.activeElement).toBe(getByRole('textbox', { name: /name/i }))` after render. RTL renders inside the test JSDOM; `autoFocus` should set `document.activeElement`.

13. **Form tests do NOT cover navigation** — `SignInForm` no longer calls `router.push`; the action's redirect handles it. The test asserts the action was called with the right args and that the form does not call `useRouter`-style navigation.

14. **CLAUDE.md changes** rewrite the **Testing Rules** section:
    - Replace the existing "Stack" + "What gets unit tested" + "What does NOT get unit tested" framing with a stronger top-of-section policy ("Unit tests are the default coverage mechanism").
    - Add a new **"Categories that require tests"** subsection listing the mandatory targets.
    - Add a new **"Smoke matrices"** subsection clarifying when smoke is appropriate (Edge runtime entry, middleware bundle composition, brand-new cookie + redirect pattern) and when it is not (every other task).
    - Keep the existing **"Vitest config"** and **"npm scripts"** subsections — they're factual.
    - Drop the "What does NOT get unit tested" bullet for server components — replaced by the categorical policy. Server components remain harder to test and that decision is left to the agent on a case-by-case basis.

15. **`agents/reviewer-agent.md`** gets one new bullet under **"Test quality"**: "Every category listed under CLAUDE.md → Testing Rules → Categories that require tests has at least one corresponding test in the diff. If a server action, validation schema, middleware module, or predicate wrapping a framework error lands without a unit test in the same PR, that's a Blocker."

16. **No changes to `agents/test-agent.md`** in this task. Its mocking conventions section already describes most of what the new files need; the reviewer-side enforcement (assumption 15) is the load-bearing change.

17. **Expected test count after this task**: 19 existing + ~52 new = ~71 total. Breakdown roughly:
    - `signIn.test.ts` (validation): 5 cases.
    - `signUp.test.ts` (validation): 5 cases.
    - `errors.test.ts`: 5 cases (`isRedirectError` + `isDuplicateKeyError` with a few shape variations each).
    - `auth-config.test.ts`: 4 cases (the four structural assertions from assumption 10).
    - `signIn.test.ts` (action): 6 cases (Zod fail, count-zero, valid+redirect-propagates, wrong-password returns generic, DB error returns generic, hostile input).
    - `signUp.test.ts` (action): 5 cases (Zod fail, duplicate-key returns specific, other DB error returns generic, valid+redirect-propagates, hostile input).
    - `middleware.test.ts`: 8 cases (the redirect matrix) + 2 pass-through cases.
    - `SignInForm.test.tsx`: 6 cases (empty submit, valid submit, action-returns-failure, pending-state, autoFocus, no useRouter).
    - `SignUpForm.test.tsx`: 6 cases (mirror).

    These counts are approximate; the architect may consolidate or split.

## Open Questions
None. The location of the predicates (assumption 1), the synthetic-redirect shape (assumption 5), and the `decideRedirect` middleware extraction (assumption 9) are the three implementation calls the spec-agent locks in. Anything else is detail.

## Routes / Pages
No new or modified routes.

## Data

### Data Types
No new types. The `decideRedirect` helper signature added to `src/middleware.ts` is internal.

### Dependencies
None added. Vitest, RTL, user-event, jsdom, `@hookform/resolvers` — all already installed.

### Environment Variables
None added.

## Components
No new or modified components. `SignInForm` and `SignUpForm` are unchanged at the production-code level — only tests are added.

## Production-Code Changes

The only production-code edits are refactor-only:

- **`src/lib/errors.ts` (new)** — exports `isRedirectError(err: unknown): boolean` and `isDuplicateKeyError(err: unknown): boolean`. Bodies identical to today's local copies.
- **`src/actions/signIn.ts`** — import `isRedirectError` from `@/lib/errors`; delete the local function. No behavioural change.
- **`src/actions/signUp.ts`** — import `isDuplicateKeyError` from `@/lib/errors`; delete the local function. No behavioural change.
- **`src/middleware.ts`** — add an exported `decideRedirect(...)` helper. The default-exported `auth((req) => ...)` wraps it.

## Test Behaviour Specifications

### `__tests__/lib/validation/signIn.test.ts`
- Empty name → `"Name is required."`
- Trim then name min(1) for whitespace-only input → `"Name is required."`
- 65-char name → `"Name is too long."`
- Empty password → `"Password is required."`
- 129-char password → `"Password is too long."`
- Valid input parses successfully and returns a `SignInInput`.

### `__tests__/lib/validation/signUp.test.ts`
- 4-char name → `"Name must be at least 5 characters."`
- 65-char name → `"Name is too long."`
- 4-char password → `"Password must be at least 5 characters."`
- 129-char password → `"Password is too long."`
- Valid input parses successfully and returns a `SignUpInput`.

### `__tests__/lib/errors.test.ts`
- `isRedirectError(err)`:
  - returns `true` for `{ digest: 'NEXT_REDIRECT;push;/dashboard;307;' }` shape (an `Error` with a string `digest` starting with `NEXT_REDIRECT`).
  - returns `false` for a bare `Error` with no `digest`.
  - returns `false` for an error whose `digest` doesn't start with `NEXT_REDIRECT`.
  - returns `false` for `null` and `undefined`.
- `isDuplicateKeyError(err)`:
  - returns `true` for `{ code: 11000 }` on an `Error`-instance.
  - returns `false` for `{ code: 11001 }`.
  - returns `false` for an error without a `code` property.

### `__tests__/lib/auth-config.test.ts`
- `'adapter' in authConfig` is `false`.
- `authConfig.session.strategy` is `'jwt'`.
- `authConfig.providers.length` is `0`.
- `typeof authConfig.callbacks.jwt === 'function'` and `typeof authConfig.callbacks.session === 'function'`.

### `__tests__/actions/signIn.test.ts`
- Schema fail (e.g. empty name) → returns `{ success: false, error: 'Invalid name or password.' }`. `signIn` is NOT called.
- `countUsers()` throws → returns generic.
- `countUsers()` returns 0 → returns generic; `signIn` is NOT called.
- Valid input + `signIn` throws a `NEXT_REDIRECT`-shaped error → the action **re-throws**. The test asserts via `expect(action(...)).rejects.toThrow(/NEXT_REDIRECT/)` (or similar).
- Valid input + `signIn` throws a `CredentialsSignin`-shaped error (no `digest`) → returns `{ success: false, error: 'Invalid name or password.' }`.
- Valid input + `signIn` resolves normally (impossible in practice, but the test exercises the path) → returns `{ success: true }`.

### `__tests__/actions/signUp.test.ts`
- Schema fail → returns `{ success: false, error: 'Something went wrong. Please try again.' }`. `createUser`, `signIn` are NOT called.
- Valid input + `createUser` throws `code === 11000` → returns `{ success: false, error: 'Username is already taken.' }`. `signIn` is NOT called.
- Valid input + `createUser` throws some other error → returns generic. `signIn` is NOT called.
- Valid input + `createUser` resolves + `signIn` throws `NEXT_REDIRECT` → the action **re-throws** (`signIn` is NOT wrapped in try/catch in `signUp.ts`).
- Valid input + `createUser` resolves + `signIn` resolves → returns `{ success: true }`.

### `__tests__/middleware.test.ts`
- `decideRedirect({ auth: null, nextUrl: { pathname: '/dashboard' }, url })` → `URL` to `/`.
- `decideRedirect({ auth: null, nextUrl: { pathname: '/dashboard/sub' }, url })` → `URL` to `/`.
- `decideRedirect({ auth: null, nextUrl: { pathname: '/' }, url })` → `undefined` (pass-through).
- `decideRedirect({ auth: null, nextUrl: { pathname: '/sign-in' }, url })` → `undefined`.
- `decideRedirect({ auth: null, nextUrl: { pathname: '/sign-up' }, url })` → `undefined`.
- `decideRedirect({ auth: { user: { name: 'admin' } }, nextUrl: { pathname: '/' }, url })` → `URL` to `/dashboard`.
- `decideRedirect({ auth: { user: { name: 'admin' } }, nextUrl: { pathname: '/sign-in' }, url })` → `URL` to `/dashboard`.
- `decideRedirect({ auth: { user: { name: 'admin' } }, nextUrl: { pathname: '/sign-up' }, url })` → `URL` to `/dashboard`.
- `decideRedirect({ auth: { user: { name: 'admin' } }, nextUrl: { pathname: '/dashboard' }, url })` → `undefined`.
- `decideRedirect({ auth: { user: { name: 'admin' } }, nextUrl: { pathname: '/dashboard/sub' }, url })` → `undefined`.

### `__tests__/components/features/SignInForm.test.tsx`
- Renders with two inputs (name + password) and a Sign In button.
- Empty submit blocks the action call and renders per-field error messages.
- Valid submit calls `signInAction` once with `{ name, password }`.
- When the action returns `{ success: false, error }`, the form shows a `<p>` with the error text.
- During submit (in flight), inputs and button are disabled and the button label is `"Loading..."`.
- On render, the name input is the focused element (`document.activeElement`).

### `__tests__/components/features/SignUpForm.test.tsx`
- Renders with two inputs (name + password) and a Sign Up button.
- Empty submit blocks the action call and renders the `"Name must be at least 5 characters."` + `"Password must be at least 5 characters."` per-field errors.
- Valid submit calls `signUpAction` once with `{ name, password }`.
- When the action returns `{ success: false, error: 'Username is already taken.' }`, the form shows that text.
- During submit, inputs and button disabled, button label `"Loading..."`.
- On render, the name input is the focused element.

## Acceptance Criteria

1. Given the codebase after this task, when `npm run test:run` runs, then it exits 0 and reports approximately **71 passing tests** (19 existing + ~52 new) across approximately **11 test files** (3 existing + 8 new). No failing tests.
2. Given `src/lib/errors.ts`, when read, then it exports `isRedirectError(err: unknown): boolean` and `isDuplicateKeyError(err: unknown): boolean`. The bodies match the predicates that previously lived in `src/actions/signIn.ts` and `src/actions/signUp.ts`.
3. Given `src/actions/signIn.ts`, when read, then it imports `isRedirectError` from `@/lib/errors` and does NOT declare a local `isRedirectError` function.
4. Given `src/actions/signUp.ts`, when read, then it imports `isDuplicateKeyError` from `@/lib/errors` and does NOT declare a local `isDuplicateKeyError` function.
5. Given `src/middleware.ts`, when read, then it exports a named `decideRedirect(req): URL | undefined` function whose body contains the redirect rules, and the default-exported `auth((req) => ...)` wraps `decideRedirect` (returning `Response.redirect(...)` if `decideRedirect` returns a URL, undefined otherwise).
6. Given `__tests__/lib/validation/signIn.test.ts`, when read, then it asserts at least the 6 behaviours listed under "Test Behaviour Specifications → signIn validation".
7. Given `__tests__/lib/validation/signUp.test.ts`, when read, then it asserts at least the 5 behaviours listed.
8. Given `__tests__/lib/errors.test.ts`, when read, then it covers both predicates with the listed positive and negative cases.
9. Given `__tests__/lib/auth-config.test.ts`, when read, then it asserts the four structural properties listed (no adapter, JWT strategy, empty providers, callback functions present).
10. Given `__tests__/actions/signIn.test.ts`, when read, then it covers the six branch outcomes listed, including the critical "NEXT_REDIRECT propagates rather than being swallowed" assertion.
11. Given `__tests__/actions/signUp.test.ts`, when read, then it covers the five outcomes listed, including the duplicate-key specific error path.
12. Given `__tests__/middleware.test.ts`, when read, then it asserts every case from the 10-case `decideRedirect` matrix.
13. Given `__tests__/components/features/SignInForm.test.tsx`, when read, then it covers the six behaviours listed including the autoFocus assertion.
14. Given `__tests__/components/features/SignUpForm.test.tsx`, when read, then it covers the six behaviours listed.
15. Given `CLAUDE.md`, when the "Testing Rules" section is read, then it contains:
    - A top-of-section sentence framing unit tests as the default coverage mechanism.
    - A "Categories that require tests" subsection listing: server actions (every branch), validation schemas, middleware, predicates wrapping framework errors, client form components with state machines.
    - A "Smoke matrices" subsection clarifying when smoke is appropriate (Edge runtime entry, middleware bundle composition, new cookie+redirect pattern) vs the default (unit tests cover it).
16. Given `agents/reviewer-agent.md` "Test quality" section, when read, then it contains a bullet stating that missing tests for a category listed in CLAUDE.md → Testing Rules → Categories that require tests is a Blocker.
17. Given `tsc --noEmit`, `npm run lint`, `npx next build`, when each is run, then each exits 0 with no regression.
18. Given `mcp__ide__getDiagnostics`, when called against `/src` and `/__tests__`, then no diagnostics surface in any source or test file.
19. Given the codebase, when grep'd, then no `any` types are introduced (test files included), no bare `<a>` for internal routes, no `<img>`, no `next/router`, no `window.location`, no `React.*` namespace, no `Readonly<{}>` empty type.
20. Given the redirect matrix that the previous task's runtime smoke covered (8 cases), when those same cases are run as unit tests, then all 8 pass.

## Notes for Downstream Agents

- **Architect**: the load-bearing structural choice is `decideRedirect` extraction. Without it, middleware is untestable in isolation. Make sure the spec's logic stays byte-equivalent to today's.
- **Architect**: pick one shape for the synthetic `NEXT_REDIRECT` error and use it consistently across `errors.test.ts`, `actions/signIn.test.ts`, `actions/signUp.test.ts`. Recommendation: `const err = new Error('NEXT_REDIRECT;push;/dashboard;307;'); ;(err as Error & { digest: string }).digest = 'NEXT_REDIRECT;push;/dashboard;307;'; throw err`. Possibly factor this into a tiny helper in a test-utils file.
- **Builder**: the action tests' `vi.mock('mongoose', ...)` is important — without it, importing `src/actions/signUp.ts` transitively loads `src/models/User.ts` which calls `mongoose.model(...)` at module load, which can fail in jsdom. Top-of-file `vi.mock('mongoose')` defangs this.
- **Builder**: when running RTL tests for forms, do not import the form's CSS / Tailwind — RTL doesn't apply styles. The tests assert class-name presence or attribute/text presence, not computed colours.
- **Reviewer**: the new "Test quality" rule in `agents/reviewer-agent.md` applies to *future* tasks. For this task itself, reviewer checks that the eight test files exist, the predicates are extracted, and CLAUDE.md is updated.
- **Reviewer**: AC #20 is the linchpin. The previous task's runtime smoke had 8 redirect cases. The middleware unit tests must cover the same 8 (plus 2 pass-through cases for the signed-out + public-only branches). If even one case is missing, the smoke-replacement story breaks.
