# Test Results: Basic Styling

## Summary
**19 tests written. 19 passing. 0 failing.**

Distribution:
- `Card.test.tsx` — 3 tests
- `Button.test.tsx` — 7 tests
- `Input.test.tsx` — 9 tests

All three files written by the builder per the plan. The test agent reviewed them against the spec's coverage rules and confirms they cover every required behaviour.

```
$ npm run test:run
 ✓ __tests__/components/ui/Card.test.tsx   (3 tests)
 ✓ __tests__/components/ui/Input.test.tsx  (9 tests)
 ✓ __tests__/components/ui/Button.test.tsx (7 tests)

 Test Files  3 passed (3)
      Tests  19 passed (19)
```

Spec minimums (AC #29): Button ≥ 6, Input ≥ 8, Card ≥ 3 — **met or exceeded on every file**.

## Failing Tests
None.

## Coverage Map vs Acceptance Criteria

| AC | Behaviour | Covered by |
|---|---|---|
| 7 | `Button` exports default + `ButtonProps` | implicit (imports succeed) |
| 8 | `Button` renders children, primary classes by default | `Button.test.tsx` tests 1–2 |
| 9 | `Button` `secondary` and `danger` variant classes | `Button.test.tsx` tests 3–4 |
| 10 | `Button` `disabled`: blocks `onClick`, has disabled attr | `Button.test.tsx` test 5 |
| 11 | `Button` `loading`: aria-busy, "Loading...", disabled, blocks click | `Button.test.tsx` test 6 |
| 12 | `Button` fires `onClick` exactly once otherwise | `Button.test.tsx` test 7 |
| 13 | `Input` exports default (forwardRef) + `InputProps` | implicit + test 8 |
| 14 | `Input` renders with placeholder, primary classes | `Input.test.tsx` tests 1–2 |
| 15 | `Input` `secondary` and `danger` variant classes | `Input.test.tsx` tests 3–4 |
| 16 | `Input` `disabled` attribute + visual | `Input.test.tsx` test 5 |
| 17 | `Input` `error` shows message + danger classes | `Input.test.tsx` test 6 |
| 18 | `Input` `error` wins over explicit `variant` | `Input.test.tsx` test 7 |
| 19 | `Input` ref forwarding | `Input.test.tsx` test 8 |
| 20 | `Input` `onChange` fires on typing | `Input.test.tsx` test 9 |
| 21 | `Card` exports default + `CardProps` | implicit (imports succeed) |
| 22 | `Card` base class set on root | `Card.test.tsx` test 2 |
| 23 | `Card` merges consumer `className` | `Card.test.tsx` test 3 |
| 24 | `Card` has no `'use client'` | reviewer check (static grep) |

ACs not covered by tests but verified by other means:
- 1 (sign-out re-render) — code path in `signOutAction` includes `revalidatePath('/')`. Manual smoke verifies UI.
- 2 (`html { font-size: 62.5% }`) — static-file check (reviewer).
- 3 (palette + scaled scales in `tailwind.config.ts`) — static-file check.
- 4 (`text-base` renders 16 px) — visual check; reasoned via the override math.
- 5 (Inter via `next/font/google` in layout) — static-file check.
- 6 (Tailwind `fontFamily.sans` starts with `var(--font-inter)`) — static-file check.
- 25–28 (page integration: Card wraps content, Sign Out becomes `<Button>`, etc.) — static-file checks.
- 30 (`passWithNoTests` removed) — static-file check.
- 31–33 (forbidden patterns) — static grep (reviewer).
- 34 (tsc / lint / test / next build all green) — verified by builder.
- 35 (no IDE diagnostics in `/src` or `/__tests__`) — verified by builder.
- 36–37 (responsive at 375 px and ≥ 768 px) — visual; manual smoke.

## Test Quality Notes

- Every assertion targets observable behaviour: rendered DOM, attributes, computed disabled state, callback invocation. No snapshots, no implementation-detail probes.
- Queries use `getByRole`, `getByPlaceholderText`, `getByText`, `getByTestId` — semantic / accessible queries first.
- `userEvent.setup()` is used for interactions, matching modern RTL guidance (avoids the deprecated `fireEvent`-based path for clicks/typing).
- `vi.fn()` mocks for handlers; no real network or storage involved.
- The `Input` ref-forwarding test (test 8) uses `createRef<HTMLInputElement>()` and verifies `ref.current === <input element>` — confirms RHF's `register(...)` keeps working.

## Bugs Found
None observed during test authoring or execution. The plan's coverage of subtle behaviours (error overrides variant; loading is distinct from disabled in both attribute and label) caught these cases up-front.

## Coverage Gaps for the Next Task

The spec deliberately scoped tests to the three new components. The following remain untested in the codebase and are sensible next-task candidates:

1. **`signInSchema`** — adding tests for the validators is essentially free now that the test harness is proven.
2. **`SignInForm` integration** — RTL test with mocked `signInAction` covering the four interaction shapes (empty submit, short non-empty, wrong creds, success). Would absorb several `auth-sign-in-update` ACs that were also static-checked.
3. **`HomePage` server-component test** — render with a stubbed `auth()` for each branch and assert the new copy + components.
4. **Visual regression / Playwright** — out of scope across all current tasks; would close ACs #1, #4, #36, #37 properly.

None of the above is needed for this task to ship — the spec excluded them explicitly.

## Vitest Config Tightening

`passWithNoTests: true` is removed. Any future task that accidentally deletes all tests will now correctly fail `npm run test:run`. The guardrail flips from "silent" to "loud" — which is the right direction now that tests exist.
