# Build Plan: Unit Tests — Catch the Bugs, Not Smoke-Tests

## Overview
Three small refactors land first (predicate extraction + middleware helper extraction), all behaviour-preserving. Then eight new test files. Then a CLAUDE.md rewrite of the Testing Rules section and a one-bullet addition to the reviewer agent. No runtime behaviour change anywhere.

Structural calls worth flagging:
1. **`src/lib/errors.ts` is the new home for `isRedirectError` and `isDuplicateKeyError`.** Single source of truth; both actions import from it. Future predicates wrapping framework errors land here too.
2. **`src/middleware.ts` exports `decideRedirect(req)` alongside the default `auth(...)` export.** Tests call the named export; production code uses the default export. The two are wired so `decideRedirect`'s output drives the wrapper's `Response.redirect(...)` decision.
3. **A small test helper at `__tests__/test-utils/redirect-error.ts`** owns the synthetic `NEXT_REDIRECT` shape. Three test files reference it (errors, actions/signIn, actions/signUp) so the exact shape lives in one place — if Next.js's redirect error shape ever changes, one file updates.
4. **Mocks live inside each test file's `vi.mock(...)` blocks.** No global mock setup. The repetition is intentional: each file declares exactly what it mocks, which is grep-able and reviewable. The single shared piece is the synthetic-redirect helper.
5. **`vitest.setup.ts` stays at its current one-line scope** (`import '@testing-library/jest-dom'`). No new globals.

## Reuse

- `vitest.config.mts`, `vitest.setup.ts` — unchanged. jsdom env, RTL matchers loaded, path aliases via `vite-tsconfig-paths`.
- `__tests__/components/ui/{Button,Card,Input}.test.tsx` — the existing 19 tests stay as-is; their style is the reference pattern for the new RTL form tests.
- `src/lib/auth.config.ts` — referenced by `auth-config.test.ts`, unchanged.
- All production files except the three refactor targets — unchanged.
- `src/components/features/{SignInForm,SignUpForm}.tsx` — production code unchanged; tests render them and exercise behaviour.
- `package.json` — unchanged. Vitest + RTL + user-event + jsdom + @hookform/resolvers + zod all already installed.

## Files to Create

### `src/lib/errors.ts`
- **Type**: util module
- **Purpose**: shared home for predicates that wrap framework error shapes.
- **Exports**:
  ```ts
  export function isRedirectError(err: unknown): boolean
  export function isDuplicateKeyError(err: unknown): boolean
  ```
- **Bodies (byte-identical to today's local copies)**:
  ```ts
  export function isRedirectError(err: unknown): boolean {
    return (
      err instanceof Error &&
      'digest' in err &&
      typeof (err as { digest?: unknown }).digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    )
  }

  export function isDuplicateKeyError(err: unknown): boolean {
    return (
      err instanceof Error && 'code' in err && (err as { code?: unknown }).code === 11000
    )
  }
  ```

### `__tests__/test-utils/redirect-error.ts`
- **Type**: test utility
- **Purpose**: produce a synthetic `NEXT_REDIRECT`-shaped error so tests can exercise the real `isRedirectError` predicate.
- **Exports**:
  ```ts
  export function makeRedirectError(target: string = '/dashboard'): Error & { digest: string }
  ```
- **Body**:
  ```ts
  export function makeRedirectError(target: string = '/dashboard'): Error & { digest: string } {
    const digest = `NEXT_REDIRECT;push;${target};307;`
    const err = new Error(digest) as Error & { digest: string }
    err.digest = digest
    return err
  }
  ```
- **Why a folder under `__tests__`**: utilities used by tests but not themselves tests should sit beside `__tests__` peers. `test-utils` is a conventional name and won't be picked up by Vitest's `*.test.*` glob.

### `__tests__/lib/errors.test.ts`
- **Coverage** (~6 cases):
  - `isRedirectError(makeRedirectError())` → `true`.
  - `isRedirectError(new Error('oops'))` → `false`.
  - `isRedirectError({ digest: 'NEXT_REDIRECT;...' })` → `false` (plain object, not `Error` instance).
  - `isRedirectError(null)` → `false`.
  - `isRedirectError(undefined)` → `false`.
  - `isDuplicateKeyError(Object.assign(new Error('dup'), { code: 11000 }))` → `true`.
  - `isDuplicateKeyError(Object.assign(new Error('other'), { code: 11001 }))` → `false`.
  - `isDuplicateKeyError(new Error('no code'))` → `false`.

### `__tests__/lib/validation/signIn.test.ts`
- **Coverage** (~6 cases): one per validation rule plus a happy path.
  - Empty name → `"Name is required."`
  - Whitespace-only name (`'   '`) → `"Name is required."` (trim then min(1)).
  - 65-character name → `"Name is too long."`
  - Empty password → `"Password is required."`
  - 129-character password → `"Password is too long."`
  - Valid input → `safeParse` succeeds and returns the parsed `SignInInput`.

### `__tests__/lib/validation/signUp.test.ts`
- **Coverage** (~5 cases):
  - 4-character name → `"Name must be at least 5 characters."`
  - 65-character name → `"Name is too long."`
  - 4-character password → `"Password must be at least 5 characters."`
  - 129-character password → `"Password is too long."`
  - Valid input → `safeParse` succeeds.

### `__tests__/lib/auth-config.test.ts`
- **Coverage** (4 cases):
  - `'adapter' in authConfig` is `false`.
  - `authConfig.session.strategy === 'jwt'`.
  - `authConfig.providers.length === 0`.
  - `authConfig.callbacks.jwt` and `authConfig.callbacks.session` are functions.

### `__tests__/actions/signIn.test.ts`
- **Mock setup at top of file**:
  ```ts
  vi.mock('mongoose', () => ({ default: { models: {}, model: vi.fn(), Schema: vi.fn() } }))
  vi.mock('@/lib/users', () => ({ countUsers: vi.fn() }))
  vi.mock('@/lib/auth', () => ({ signIn: vi.fn() }))
  ```
- **Coverage** (6 cases — every documented branch):
  - Empty name → `{ success: false, error: 'Invalid name or password.' }`. `countUsers` not called. `signIn` not called.
  - `countUsers` rejects → returns generic error. `signIn` not called.
  - `countUsers` resolves to `0` → returns generic error. `signIn` not called.
  - Valid input + `signIn` throws `makeRedirectError('/dashboard')` → the test calls `await expect(signInAction(...)).rejects.toThrow(/NEXT_REDIRECT/)`. Critical for the bug-catch story.
  - Valid input + `signIn` throws a non-redirect `new Error('CredentialsSignin')` → returns generic error.
  - Valid input + `signIn` resolves → returns `{ success: true }` (unreachable in practice but the type contract demands it).

### `__tests__/actions/signUp.test.ts`
- **Mock setup**:
  ```ts
  vi.mock('mongoose', () => ({ default: { models: {}, model: vi.fn(), Schema: vi.fn() } }))
  vi.mock('@/lib/users', () => ({ createUser: vi.fn() }))
  vi.mock('@/lib/password', () => ({ hashPassword: vi.fn().mockResolvedValue('hashed') }))
  vi.mock('@/lib/auth', () => ({ signIn: vi.fn() }))
  ```
- **Coverage** (5 cases):
  - Schema fail (short name) → `{ success: false, error: 'Something went wrong. Please try again.' }`. `createUser` and `signIn` not called.
  - Valid input + `createUser` throws `Object.assign(new Error('dup'), { code: 11000 })` → `{ success: false, error: 'Username is already taken.' }`. `signIn` not called.
  - Valid input + `createUser` throws an unrelated error → returns generic. `signIn` not called.
  - Valid input + `createUser` resolves + `signIn` throws `makeRedirectError('/dashboard')` → `await expect(signUpAction(...)).rejects.toThrow(/NEXT_REDIRECT/)`.
  - Valid input + `createUser` resolves + `signIn` resolves → returns `{ success: true }` (unreachable in practice; type contract).

### `__tests__/middleware.test.ts`
- **No mocks needed** — `decideRedirect` is a pure function over constructed input.
- **Coverage** (10 cases — the 8 redirect-matrix + 2 pass-through observed-during-smoke):
  - `auth=null, path='/dashboard'` → returns `URL` with pathname `/`.
  - `auth=null, path='/dashboard/sub'` → returns `URL` with pathname `/`.
  - `auth=null, path='/'` → returns `undefined`.
  - `auth=null, path='/sign-in'` → returns `undefined`.
  - `auth=null, path='/sign-up'` → returns `undefined`.
  - `auth=user, path='/'` → returns `URL` with pathname `/dashboard`.
  - `auth=user, path='/sign-in'` → returns `URL` with pathname `/dashboard`.
  - `auth=user, path='/sign-up'` → returns `URL` with pathname `/dashboard`.
  - `auth=user, path='/dashboard'` → returns `undefined`.
  - `auth=user, path='/dashboard/sub'` → returns `undefined`.
- **Helper inside the test file**:
  ```ts
  function req(auth: null | { user: { name: string } }, path: string) {
    return {
      auth,
      nextUrl: { pathname: path } as unknown as URL,
      url: 'http://localhost:3000' + path,
    }
  }
  ```
  This shape matches what `decideRedirect` consumes (architect's responsibility to keep the helper signature accepting this shape — see "Files to Modify > `src/middleware.ts`" below for the exact type).

### `__tests__/components/features/SignInForm.test.tsx`
- **Mock setup**:
  ```ts
  vi.mock('@/actions/signIn', () => ({ signInAction: vi.fn() }))
  vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
  }))
  ```
- **Coverage** (~6 cases):
  - Renders two inputs (textbox name, password input) and a Sign In button.
  - Submit with both fields empty → per-field error messages render under each input. `signInAction` not called.
  - Submit with valid input → `signInAction` called exactly once with `{ name: 'admin', password: 'admin' }`.
  - When the action resolves to `{ success: false, error: 'Invalid name or password.' }`, the form shows a `<p>` with that text.
  - During submit (action returns a pending promise), inputs and button are disabled and the button label is `"Loading..."`.
  - After render, `document.activeElement` is the Name input (autoFocus check).

### `__tests__/components/features/SignUpForm.test.tsx`
- **Mock setup**: same shape, mocking `@/actions/signUp` instead.
- **Coverage** (~6 cases): mirror of `SignInForm`'s, adjusting expected error strings to the sign-up bounds (`"Name must be at least 5 characters."`, etc.) and the action returning `{ success: false, error: 'Username is already taken.' }`.

## Files to Modify

### `src/actions/signIn.ts`
- **What changes**:
  1. Add `import { isRedirectError } from '@/lib/errors'`.
  2. Delete the local `function isRedirectError(err: unknown): boolean { ... }` at the bottom.
- **Behaviour**: byte-identical.

### `src/actions/signUp.ts`
- **What changes**:
  1. Add `import { isDuplicateKeyError } from '@/lib/errors'`.
  2. Delete the local `function isDuplicateKeyError(err: unknown): boolean { ... }` at the bottom.
- **Behaviour**: byte-identical.

### `src/middleware.ts`
- **What changes**: extract the redirect decision into a named export; the default-exported `auth(...)` wrapper consumes it.
- **Outline (after)**:
  ```ts
  import NextAuth, { type Session } from 'next-auth'
  import { authConfig } from '@/lib/auth.config'

  const { auth } = NextAuth(authConfig)

  type DecideRedirectInput = {
    auth: Session | null
    nextUrl: { pathname: string }
    url: string
  }

  export function decideRedirect(req: DecideRedirectInput): URL | undefined {
    const isAuth = !!req.auth
    const path = req.nextUrl.pathname
    const isPrivate = path === '/dashboard' || path.startsWith('/dashboard/')
    const isPublicOnly = path === '/' || path === '/sign-in' || path === '/sign-up'

    if (!isAuth && isPrivate) {
      return new URL('/', req.url)
    }

    if (isAuth && isPublicOnly) {
      return new URL('/dashboard', req.url)
    }

    return undefined
  }

  export default auth((req) => {
    const dest = decideRedirect({ auth: req.auth, nextUrl: req.nextUrl, url: req.url })

    if (dest) {
      return Response.redirect(dest)
    }
  })

  export const config = {
    matcher: ['/dashboard/:path*', '/', '/sign-in', '/sign-up'],
  }
  ```
- **Why the input shape**: `DecideRedirectInput` is the minimum surface from `req` that the function needs. The action wrapper passes the real `req`; tests construct synthetic shapes. The `Session` import gives proper typing for `auth` without dragging in DB modules — `next-auth` exports `Session` as a pure type.
- **Behaviour**: identical at runtime.

### `CLAUDE.md` — Testing Rules section
- **What changes**: rewrite the section. Read the current state first; the new text replaces the existing "Stack" + "What gets unit tested" + "What does NOT get unit tested" framing while keeping the "Vitest config" and "npm scripts" subsections intact.
- **New section structure** (final draft):

  ```md
  ## Testing Rules

  Unit tests are the default coverage mechanism for any logic that is prone to runtime-only failure. Static checks (`tsc`, `npm run lint`, `npx next build`) catch syntactic and type errors; tests catch behaviour. Three classes of bugs that recently slipped past static checks motivate the policy:
  1. A server action's broad `try/catch` swallowing a `NEXT_REDIRECT` thrown by Auth.js.
  2. Middleware silently absent because of a layout mismatch (`src/middleware.ts` vs `middleware.ts`).
  3. Edge-runtime imports dragging Node-only modules into the middleware bundle.

  ### Stack
  - **Test runner**: Vitest
  - **Component testing**: React Testing Library (`@testing-library/react`)
  - **DOM matchers**: `@testing-library/jest-dom`
  - **User interactions**: `@testing-library/user-event`
  - **Mocking**: Vitest built-ins (`vi.fn()`, `vi.mock()`, `vi.spyOn()`)

  ### Categories that require tests
  Any change touching one of these categories MUST include unit tests in the same PR:
  - **Server actions** — every branch (validation failure, business-logic failure, success, framework-error re-throw). Mock the DB helpers and `next-auth`'s `signIn`/`signOut`/`auth` so tests are deterministic.
  - **Validation schemas** (Zod or otherwise) — one assertion per rule (min/max/required/format) plus a happy-path parse.
  - **Middleware** — the redirect/rewrite/pass-through matrix. Extract the decision into a named function so it can be unit-tested without the Auth.js wrapper.
  - **Predicates wrapping framework errors** — `isRedirectError`, `isDuplicateKeyError`, and future analogues. Test positive, negative, null, undefined, wrong-shape cases.
  - **Client form components with state machines** — react-hook-form forms that branch on action results. RTL test covers empty submit, valid submit, action-returns-failure, pending state, and any focus/blur behaviour.

  ### Test file location
  All unit/component tests live in `/__tests__`, mirroring `/src` structure. Test utilities (helper factories, shared mocks) live in `__tests__/test-utils/`; files there are NOT picked up by the `*.test.*` glob.

  Test files named: `<Module>.test.ts` / `<Component>.test.tsx`.

  ### Smoke matrices
  A live dev-server smoke (curl/Playwright/manual) is appropriate ONLY when:
  1. The change introduces a new Edge runtime entry (a new `src/middleware.ts`, a new route handler with `export const runtime = 'edge'`, etc.).
  2. The change modifies the middleware bundle composition (a new import into the middleware that might pull in Node-only modules).
  3. The change wires up a cookie + redirect pattern for the first time and there's no existing test pattern for it.

  Otherwise: write unit tests instead. The categories above cover everything else.

  ### Vitest config
  `vitest.config.mts` at project root:
  - Environment: `jsdom`
  - Setup file: `vitest.setup.ts` (imports `@testing-library/jest-dom`)
  - Path aliases via `vite-tsconfig-paths`
  - `passWithNoTests: false` (default) — if tests are deleted, the suite fails loudly.

  ### npm scripts
  ```json
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
  ```
  ```

  The existing "What does NOT get unit tested" bullet for server components is dropped — that decision is case-by-case and not a categorical rule.

### `agents/reviewer-agent.md` — Test quality subsection
- **What changes**: add one bullet at the bottom of the "Test quality" subsection.
- **New bullet text**:

  > - **Mandatory categories must be covered.** If a server action, validation schema, middleware module, or predicate wrapping a framework error lands in the diff without a corresponding unit test in the same task, that's a Blocker. The mandatory categories are listed in `CLAUDE.md` → Testing Rules → Categories that require tests.

## Data Flow

No production data flow changes. Tests exercise mocked surfaces; production behaviour is unchanged.

The `decideRedirect` extraction means the middleware's redirect logic now flows:
1. Real request → `auth((req) => ...)` wrapper → `decideRedirect({ auth: req.auth, nextUrl: req.nextUrl, url: req.url })`.
2. If `decideRedirect` returns a URL → wrapper returns `Response.redirect(url)`.
3. Otherwise → wrapper returns undefined (pass-through).

Tests skip step 1 and call `decideRedirect` directly.

## State Management
No state changes.

## Types

```ts
// src/lib/errors.ts
export function isRedirectError(err: unknown): boolean
export function isDuplicateKeyError(err: unknown): boolean
```

```ts
// src/middleware.ts — new exported helper signature
type DecideRedirectInput = {
  auth: import('next-auth').Session | null
  nextUrl: { pathname: string }
  url: string
}
export function decideRedirect(req: DecideRedirectInput): URL | undefined
```

```ts
// __tests__/test-utils/redirect-error.ts
export function makeRedirectError(target?: string): Error & { digest: string }
```

No other types added.

## File Tree

```
/
└── src/
    ├── actions/
    │   ├── signIn.ts                                   (modified — import predicate)
    │   └── signUp.ts                                   (modified — import predicate)
    ├── lib/
    │   └── errors.ts                                   (new)
    └── middleware.ts                                   (modified — export decideRedirect)

__tests__/
├── actions/
│   ├── signIn.test.ts                                  (new)
│   └── signUp.test.ts                                  (new)
├── lib/
│   ├── auth-config.test.ts                             (new)
│   ├── errors.test.ts                                  (new)
│   └── validation/
│       ├── signIn.test.ts                              (new)
│       └── signUp.test.ts                              (new)
├── components/
│   └── features/
│       ├── SignInForm.test.tsx                         (new)
│       └── SignUpForm.test.tsx                         (new)
├── middleware.test.ts                                  (new)
└── test-utils/
    └── redirect-error.ts                               (new)

CLAUDE.md                                               (modified — Testing Rules section)
agents/reviewer-agent.md                                (modified — Test quality bullet)
```

## Build Order

1. **`src/lib/errors.ts`** — copy the predicates verbatim from their current homes.
2. **`src/actions/signIn.ts`** — import `isRedirectError` from `@/lib/errors`; delete local copy.
3. **`src/actions/signUp.ts`** — import `isDuplicateKeyError` from `@/lib/errors`; delete local copy.
4. **`src/middleware.ts`** — add `decideRedirect` named export; wire the default `auth(...)` wrapper to it.
5. **Compile-time check after refactors**: `npx tsc --noEmit` exits 0 with no diagnostics. Production behaviour byte-identical.
6. **`__tests__/test-utils/redirect-error.ts`** — synthetic redirect-error helper.
7. **`__tests__/lib/errors.test.ts`** — exercises both predicates with positive, negative, null, undefined, wrong-shape cases.
8. **`__tests__/lib/validation/signIn.test.ts`** — one assertion per rule.
9. **`__tests__/lib/validation/signUp.test.ts`** — same.
10. **`__tests__/lib/auth-config.test.ts`** — four structural assertions.
11. **`__tests__/middleware.test.ts`** — 10 `decideRedirect` cases.
12. **`__tests__/actions/signIn.test.ts`** — 6 branch cases; mock `mongoose`, `@/lib/users`, `@/lib/auth`.
13. **`__tests__/actions/signUp.test.ts`** — 5 branch cases; mock `mongoose`, `@/lib/users`, `@/lib/password`, `@/lib/auth`.
14. **`__tests__/components/features/SignInForm.test.tsx`** — 6 RTL cases; mock `@/actions/signIn`, `next/navigation`.
15. **`__tests__/components/features/SignUpForm.test.tsx`** — 6 RTL cases; mock `@/actions/signUp`, `next/navigation`.
16. **`CLAUDE.md`** — Testing Rules section rewrite.
17. **`agents/reviewer-agent.md`** — Test quality bullet addition.
18. **Verify**:
    - `npx tsc --noEmit` → exit 0.
    - `npm run lint` → exit 0.
    - `npm run test:run` → exit 0 with ~71 passing tests (19 existing + ~52 new) across ~11 files.
    - `npx next build` → exit 0; route topology unchanged.
19. **Diagnostic sweep**: `mcp__ide__getDiagnostics`. Resolve any new "may be converted to async" / "prefer optional chaining" warnings introduced.
20. **No runtime smoke this task.** The whole point is that unit tests cover what smoke used to. The build summary explicitly does NOT include a smoke matrix — the middleware unit test IS the smoke replacement.

## Notes for the Builder

- **Mock hoisting**: `vi.mock(...)` calls are hoisted to the top of the file by Vitest. They run before any imports. This means the mocks below already work for actions tests:
  ```ts
  import { describe, expect, it, vi } from 'vitest'

  vi.mock('mongoose', () => ({ default: { models: {}, model: vi.fn(), Schema: vi.fn() } }))
  vi.mock('@/lib/users', () => ({ countUsers: vi.fn() }))
  vi.mock('@/lib/auth', () => ({ signIn: vi.fn() }))

  import { signInAction } from '@/actions/signIn'
  import { countUsers } from '@/lib/users'
  import { signIn } from '@/lib/auth'
  ```
  In each `it()`, use `vi.mocked(countUsers).mockResolvedValueOnce(1)` to set per-test behaviour. Reset between tests via `beforeEach(() => vi.resetAllMocks())`.

- **`vi.mocked()` typing**: `vi.mocked(signIn)` returns a `MockInstance` typed to match the original function. Use `.mockResolvedValueOnce(undefined)`, `.mockRejectedValueOnce(makeRedirectError())`, etc.

- **Async assertions**: `await expect(signInAction(input)).rejects.toThrow(/NEXT_REDIRECT/)` is the idiom for the redirect-propagates test. Don't wrap the action call in your own `try { ... } catch (e) { expect(e)... }` — that obscures intent.

- **Form RTL pending-state test**: the trick is to make `signInAction` return a promise that never resolves during the test (or resolves after the assertions). Use:
  ```ts
  const pending = new Promise<SignInResult>(() => {})
  vi.mocked(signInAction).mockReturnValueOnce(pending as unknown as ReturnType<typeof signInAction>)
  await user.click(submitButton)
  expect(inputs).toBeDisabled()
  expect(submitButton).toHaveTextContent('Loading...')
  ```

- **autoFocus assertion**: after `render(<SignInForm />)`, immediately assert `expect(document.activeElement).toBe(screen.getByLabelText(/name/i))`. RTL renders inside JSDOM which honours the `autoFocus` attribute.

- **Path alias resolution in tests**: `@/lib/users` works because `vite-tsconfig-paths` is in `vitest.config.mts`. No extra setup.

- **Don't import `src/middleware.ts`'s default export** in the middleware test — only the named `decideRedirect`. The default export is `auth((req) => ...)` whose Auth.js wrapper expects a runtime context. The named export is the pure function the test exercises.

- **`auth-config.test.ts` should import the actual file**, not mock it. The test's purpose is to lock in the structural shape of the real `authConfig`. Importing `@/lib/auth.config` is safe — that file has only a type-only import from `next-auth` and contains no runtime side effects.

- **Visual rhythm in test bodies**: the existing `Button.test.tsx` / `Input.test.tsx` / `Card.test.tsx` files follow the project's spacing convention (blank line after `render(...)`, blank between element lookup and assertions, grouped expects). The new tests follow the same pattern.
