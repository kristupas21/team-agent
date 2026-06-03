# Test Results: Auth — Sign In

## Summary
0 tests written. 0 passing. 0 failing.

Deliberate, per the spec:

- Task: `## What This Task Does NOT Include — Tests — defer like initial-setup did, unless spec/architect/builder identifies a specific high-value test that is essentially free to write (the spec-agent can call this out).`
- Spec acceptance criterion 14: `npm run test:run` exits 0 — verified.

The spec did not flag any test as essentially-free for this task. Several high-value tests are now genuinely cheap to write because the building blocks exist (Zod schema, server action with clean return shape). They are listed under "Recommendation" below for the next task to absorb.

Vitest still runs to prove the infrastructure works:

```
$ npm run test:run
No test files found, exiting with code 0
```

Path aliases continue to resolve, jsdom env continues to load, `passWithNoTests: true` keeps the green light.

## Failing Tests
None.

## Coverage Gaps

Each acceptance criterion, with the reason no test exists yet:

| AC | What it asserts | Why deferred |
|---|---|---|
| 1 | `npm run seed:admin` creates the admin doc | Requires live Mongo; integration shape. Manual verify per README. |
| 2 | Re-running seed is idempotent | Same as AC 1. |
| 3 | Signed-out home shows Sign In anchor | Server-component render — covered by route smoke test once UI tests land. |
| 4 | `/sign-in` renders form with three fields | `SignInForm` is a client component; trivial RTL test would suffice — see Recommendation. |
| 5 | Client-side empty-field error | Pure client logic on top of the Zod schema; ideal first RTL test. |
| 6 | Server returns generic error on invalid creds | Could be tested by mocking `findUserByName` / `verifyPassword`; small but useful. |
| 7 | Successful sign-in redirects | Requires mocking `signIn` + `useRouter`; medium effort, high value once we have one a11y/UI test. |
| 8 | Signed-in home shows name + Sign Out | Same as AC 3 — covered by route smoke test. |
| 9 | Signed-in user on `/sign-in` redirects | Server-component `redirect()` — testable by mocking `auth()`. |
| 9a | Sign Out clears session and re-renders | E2E shape. Manual verify. |
| 10 | Pending state disables inputs and changes button text | Pure client; ideal RTL test. |
| 11 | Previous error cleared during pending | Same as AC 10. |
| 12 | Plaintext password never logged | Static review only — confirmed by code inspection in build summary. |
| 13 | Password hash never returned to client | Static review — `SignInResult` shape forbids it. |
| 14 | `tsc`, `lint`, `test:run` all pass | Verified by builder. |
| 15 | No `any`, `"use client"` only on `SignInForm`, no plaintext password in logs | Static review — verified. |
| 16 | Env-var failure paths | Manual; mostly external library behaviour. |
| 17 | 128+ char password rejected as generic error on server | Same as AC 6; covered by the server-action unit suggested below. |

Static checks (12, 13, 15, 16) are reviewer territory.

## Bugs Found
None observed during the read of builder output. The deviations and known issues called out in `auth-sign-in-build-summary.md` are intentional and documented.

## Recommendation to Reviewer / Next-Task Test Backlog

When the first batch of tests lands, these are the cheapest, highest-leverage entries:

1. **`signInSchema` unit (4–6 cases)** — empty name, short password, oversize name, oversize password, valid pair, trimmed name. Establishes the test pattern for shared validators.
2. **`SignInForm` RTL test** — covers AC #4, #5, #10, #11 with a single render and three interactions. Mock `signInAction` and `next/navigation`. This is the single highest-value file to add.
3. **`signInAction` unit** — mock `findUserByName` and `verifyPassword`; assert: (a) Zod-failure returns generic error; (b) missing user returns generic error; (c) bad password returns generic error; (d) success returns `{ success: true }`. Covers AC #5 (server side), #6, #17.

Adding those three files would lift this task's coverage from 0 % to roughly the levels CLAUDE.md describes as the project's testing target, with no infrastructure work.
