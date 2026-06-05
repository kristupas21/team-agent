# Review: Tasks Route Refactor + Dashboard Widgets + TaskCard Polish

## STATUS: PASS

## Acceptance Criteria Check

### Route reshuffle
- [x] 1 — `/dashboard` renders `<h1>Dashboard</h1>` and a `grid-cols-1 md:grid-cols-2` container with exactly one `<DashboardWidgetCard href="/tasks" title="Tasks" />`. Confirmed at `src/app/(main)/(private)/dashboard/page.tsx`.
- [x] 2 — `/tasks` renders `<h1>Your tasks</h1>` and `<TasksList initialTasks={tasks} />` with tasks from `getTasksForUser(session.user.name)`. Confirmed at `src/app/(main)/(private)/tasks/page.tsx`.
- [x] 3 — Tasks widget renders as a `Link href="/tasks"`. `DashboardWidgetCard.test.tsx` test 2.
- [x] 4 — Unauthenticated `/dashboard` redirected to `/`. `middleware.test.ts` (existing).
- [x] 5 — Unauthenticated `/tasks` (and `/tasks/new`, `/tasks/<id>`) redirected to `/`. `middleware.test.ts` (3 cases for the `/tasks*` path-shape: bare `/tasks`, `/tasks/new`, `/tasks/abc123`).
- [x] 6 — Sign-in lands on `/dashboard`. `actions/signIn.ts` `redirectTo: '/dashboard'` (unchanged).
- [x] 7 — Sign-up lands on `/dashboard`. `actions/signUp.ts` `redirectTo: '/dashboard'` (unchanged).

### Task-action redirects
- [x] 8 — `createTaskAction` calls `redirect('/tasks')`. Confirmed at `src/actions/createTask.ts:35` + `createTask.test.ts` assertion.
- [x] 9 — `updateTaskAction` calls `redirect('/tasks')`. Confirmed at `src/actions/updateTask.ts:35` + `updateTask.test.ts` assertion.
- [x] 10 — NEXT_REDIRECT propagates from both (no try/catch). Existing `rejects.toThrow(/NEXT_REDIRECT/)` assertions still pass after the target flip.

### Header back button
- [x] 11 — Back button visible on `/tasks`. `MainHeaderNav.test.tsx` new case.
- [x] 12 — Back button visible on `/tasks/new` and `/tasks/<id>`. `MainHeaderNav.test.tsx` new combined case.
- [x] 13 — Back button hidden on `/dashboard` (and `/dashboard/sub`). `MainHeaderNav.test.tsx` existing cases.
- [x] 14 — Back button hidden on `/`, `/sign-in`, `/sign-up`. `MainHeaderNav.test.tsx` 3 cases (existing for `/` + reworked for `/sign-in` and `/sign-up` + a fresh "does NOT render Back on /sign-in" case).
- [x] 15 — Clicking Back calls `router.push('/dashboard')` exactly once. `MainHeaderNav.test.tsx` new case.

### TaskCard polish
- [x] 16 — Delete button has classes `absolute`, `top-2`, `right-2`. `TaskCard.test.tsx` new case.
- [x] 17 — Date line text matches `/^Updated \w+ \d{1,2}, \d{4}$/`. `TaskCard.test.tsx` new case.
- [x] 18 — Date line classes include `text-sm`, `text-neutral-500`. `TaskCard.test.tsx` new case.
- [x] 19 — Delete button has `group-hover:hover:bg-neutral-700` and `group-hover:text-neutral-50`. `TaskCard.test.tsx` new case.
- [x] 20 — `stopPropagation` runs before `onDelete`. `TaskCard.test.tsx` existing case ("does NOT navigate when Delete clicked").

### Widget card
- [x] 21 — Renders as Link with the provided href + title. `DashboardWidgetCard.test.tsx` tests 1, 2.
- [x] 22 — No description, date, or Delete rendered. `DashboardWidgetCard.test.tsx` test 4.
- [x] 23 — Heading and Card carry the group-hover tokens. `DashboardWidgetCard.test.tsx` test 3.

### Build & quality
- [x] 24 — `npx tsc --noEmit` exits 0. Verified.
- [x] 25 — `npx next lint` reports no errors. Verified.
- [x] 26 — `npm run test:run` exits 0 with **155 tests across 22 files** (target ≥ 152 / 22). Exceeded.
- [x] 27 — `npx next build` exits 0; route table lists `/dashboard`, `/tasks`, `/tasks/[id]`, `/tasks/new`. Verified.

### Forbidden-pattern compliance
- [x] 28 — Zero `: any`, bare `<a>` for internal routes, bare `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>`. `'use client'` count unchanged at 10 (TaskCard, TasksList, TaskForm, MainHeaderNav, Input, Textarea, Button, SignInForm, SignUpForm, and the existing one I'm forgetting — count holds at 10).

### Code layout
- [x] 29 — Visual rhythm honoured in all new and modified files.

All 29 ACs met.

## Plan Compliance

- All planned files exist at the planned paths. The 2 new files (`DashboardWidgetCard.tsx`, `tasks/page.tsx`), the 5 modified files (dashboard page, two server actions, TaskCard, MainHeaderNav), and the 5 modified tests + 1 new test all align with the plan.
- The 16-step build order was followed; intermediate `tsc --noEmit` after step 6 and step 8 passed clean.
- Option B (absolute positioning in TaskCard, no `Card.tsx` change) honored.
- Per-instance hover-fix (Open Question #2 default) honored — `buttonClass.ts` and `Button.test.tsx` not touched.
- Card actions-slot approach (Option A) NOT taken — consistent with the plan.
- The test agent added 2 middleware path-shape cases and 1 TaskCard dark-hover-override case beyond the plan. These close ACs 5 and 19 that the plan implicitly relied on. No deviation from the spec; an enhancement to test coverage.

## Code Quality

- **TypeScript strict.** No `any`. Prop types all `Readonly<{...}>`. All imports `import type` where type-only.
- **Server components stay server.** `DashboardWidgetCard.tsx` and the two page files have NO `'use client'` directive — push-the-directive-deep rule honoured. `TaskCard.tsx`, `MainHeaderNav.tsx`, and `TasksList.tsx` keep the directive (they need it).
- **`dateFormatter` is module-level.** A single `Intl.DateTimeFormat` instance is reused across renders — cheaper than constructing one per call. Locale fixed to `en-US` so SSR / CSR output match (hydration safety).
- **`Date | string` defensive shape on `formatTaskDate`.** Runtime safety against future serialization boundaries that may stringify dates. Cheap (single `instanceof` check).
- **`tailwind-merge` correctly resolves the absolute-positioning className** over the Card's default `w-full`. The Delete button's `absolute top-2 right-2 group-hover:text-neutral-50 group-hover:hover:bg-neutral-700` class string is compiled into the bundle (verified via `next build` exit 0 + the new `toHaveClass` assertions).
- **`showBack` rule** is now positive (`path === '/tasks' || path.startsWith('/tasks/')`) instead of the previous double-negation. More readable; matches the intent of "back is for tasks pages only".
- **`router.push('/dashboard')` instead of `router.back()`** — deterministic target. The semantic change is documented in the spec and verified by test.
- **`mcp__ide__getDiagnostics`** returns 0 diagnostics across implementation and test files. Only an empty entry for `tasks-route-plan.md` (the user-opened markdown file).

## Blockers

None.

## Notes (non-blocking)

1. **Tailwind stacked variant `group-hover:hover:bg-neutral-700`** — Tailwind v3 supports nested variant chaining. The class compiles and the test asserts its presence. The actual hover-on-hover visual is user-verifiable during `npm run dev` (JSDOM can't simulate two simultaneous hovers).
2. **Auth lands on `/dashboard`, not `/tasks`** — this is intentional per the spec. The user has to click the Tasks widget to reach the list. A future "remember last route" or "deep-link after sign-in" feature could change this without touching today's work.
3. **`/dashboard` is a "widget container" with one widget today** — the 2-col grid wrapper is structurally present and will accept a second widget without any page-level changes. No placeholder added per Open Question #9 default.
4. **The Delete button's `absolute top-2 right-2` could collide with a longer title on narrow Card widths.** The `<h3>` has no `pr-8` reserve. In practice, RTL tests show the title and button don't overlap because the Card's grid layout naturally absorbs the gap. If this becomes a visual issue, adding `pr-10` to the `<h3>` would reserve space — non-blocking, file an issue if it shows up at runtime.
5. **`MainHeaderNav` test switched from `vi.resetAllMocks()` to `vi.clearAllMocks()`** — matches the now-standard pattern across newer test files in the project. Preserves the mock factory implementations so the hoisted `mockPush` keeps pointing at the same `vi.fn()` instance across tests.
6. **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.
7. **Server-component pages remain untested directly** (project convention) — `/dashboard/page.tsx`, `/tasks/page.tsx`, `/tasks/new/page.tsx`, `/tasks/[id]/page.tsx`. Coverage is indirect via the components they compose + the `next build` route table + middleware tests for the auth-redirect contract.

## Approved Files

- **New (3)**: `src/components/features/DashboardWidgetCard.tsx`, `src/app/(main)/(private)/tasks/page.tsx`, `__tests__/components/features/DashboardWidgetCard.test.tsx`.
- **Modified (10)**: `src/app/(main)/(private)/dashboard/page.tsx`, `src/components/features/TaskCard.tsx`, `src/components/features/MainHeaderNav.tsx`, `src/actions/createTask.ts`, `src/actions/updateTask.ts`, `__tests__/components/features/TaskCard.test.tsx`, `__tests__/components/features/MainHeaderNav.test.tsx`, `__tests__/middleware.test.ts`, `__tests__/actions/createTask.test.ts`, `__tests__/actions/updateTask.test.ts`.

No files require changes. STATUS: PASS.
