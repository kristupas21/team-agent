# Test Results: Auth — Sign In Update

## Summary
0 tests written. 0 passing. 0 failing.

Deliberate, per the spec (Assumption 11: "No tests added, matching the precedent set by `initial-setup` and `auth-sign-in`."). Vitest still runs:

```
$ npm run test:run
No test files found, exiting with code 0
```

This satisfies AC #13.

## Failing Tests
None.

## Coverage Gaps

| AC | What it asserts | Why deferred |
|---|---|---|
| 1 | Signed-out heading "Hello there", paragraph "Please sign in to continue." | Server-component render; could be covered by an `async` server-component test with a stubbed `auth()`. Future. |
| 2 | Signed-in heading "Welcome, admin", paragraph "You're signed in.", no standalone `<p>{name}</p>` | Same — server-component render with stubbed session. |
| 3 | `signInSchema.password` reads `.min(1, 'Password is required.').max(128, 'Password is too long.')` | Static-file check; reviewer concern. |
| 4 | Empty-fields submit blocks server call and renders per-field errors | Ideal RTL test on `SignInForm`. |
| 5 | Short-non-empty password reaches server and surfaces generic credential error | RTL test mocking `signInAction`. |
| 6 | 129-char password rejected by client with `"Password is too long."` | RTL test. |
| 7 | 65-char name rejected by client with `"Name is too long."` | RTL test. |
| 8 | During submit: inputs/button disabled, button label `"Signing in..."`, previous root error cleared | RTL test exercising `isSubmitting` + `clearErrors`. |
| 9 | Valid credentials → `router.push('/')` | RTL test mocking `signInAction` + `useRouter`. |
| 10 | Source uses `useForm` from `react-hook-form` and `zodResolver` from `@hookform/resolvers/zod`; no `useState`/`useTransition` for form state | Static-file check; reviewer concern. |
| 11 | Exactly one `'use client'` directive in the codebase, at `SignInForm.tsx` | Static grep; reviewer concern. |
| 12 | No `any`, no bare `<a>` internal route, no `<img>`, no `next/router`, no `window.location` | Static grep; reviewer concern. |
| 13 | tsc/lint/test all green | Verified by builder. |
| 14 | `react-hook-form` and `@hookform/resolvers` in `dependencies` | Static-file check. |
| 15 | Heading and paragraph Tailwind classes preserved verbatim | Static-file check; reviewer concern. |
| 16 | `Credentials.authorize` still uses `signInSchema.safeParse(raw)` | Static-file check; reviewer concern. |

## Bugs Found
None observed during the read of builder output. The deviations and known issues called out in `auth-sign-in-update-build-summary.md` are intentional and documented.

## Recommendation to Reviewer / Next-Task Test Backlog

When the test suite gains its first real entries, the highest-leverage adds for this feature would be:

1. **`SignInForm` RTL test** — single render + four interactions:
   - submit empty → per-field errors.
   - submit valid → `signInAction` called, `router.push('/')` invoked.
   - submit returning `{ success: false }` → root error visible.
   - second submit → previous root error gone during pending.

2. **`signInSchema` unit (extension of the prior `auth-sign-in` backlog item)** — add a case asserting the relaxed bound: a 1-character password parses successfully.

3. **`HomePage` server-component test** — render with stubbed `auth()` returning `null` and `{ user: { name: 'admin' } }`; assert the heading + paragraph copy for each branch and that no standalone `<p>admin</p>` appears in the signed-in tree.

The first item alone would cover ACs #4, #5 (UI side), #6, #7, #8, #9 with one file.
