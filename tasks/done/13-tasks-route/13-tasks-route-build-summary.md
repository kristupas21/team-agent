# Build Summary: Tasks Route Refactor + Dashboard Widgets + TaskCard Polish

## Files Created

### Production source (2)
- `src/components/features/DashboardWidgetCard.tsx` — server component. Wraps a `Link` around `Card` (consumer className `group h-full cursor-pointer transition-colors hover:bg-neutral-900 md:max-w-none`) containing a single `<h3>` with the group-hover-light-text token set. Props: `Readonly<{ href: string; title: string }>`.
- `src/app/(main)/(private)/tasks/page.tsx` — server component. `auth()` guard + `getTasksForUser(name)` → `<h1>Your tasks</h1>` + `<TasksList initialTasks={tasks} />` inside the existing `max-w-content space-y-6` shell. Metadata title `'Tasks'`.

### Tests (1)
- `__tests__/components/features/DashboardWidgetCard.test.tsx` — 4 RTL cases: heading renders, Link `href` matches the prop, group-hover tokens present on heading + Card root, no description/date/Delete rendered.

## Files Modified

- `src/app/(main)/(private)/dashboard/page.tsx` — full rewrite to a widget grid. New body: `auth()` guard, `<h1>Dashboard</h1>`, `<div className="grid grid-cols-1 gap-4 md:grid-cols-2">` containing a single `<DashboardWidgetCard href="/tasks" title="Tasks" />`. Imports of `getTasksForUser` and `TasksList` removed.
- `src/actions/createTask.ts` — one line: `redirect('/dashboard')` → `redirect('/tasks')`. NEXT_REDIRECT propagation contract unchanged.
- `src/actions/updateTask.ts` — same one-line redirect retarget.
- `src/components/features/TaskCard.tsx` — three structural deltas:
  - Added module-level `dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })` + helper `formatTaskDate(input: Date | string)`. Locale is fixed to `en-US` to guarantee SSR/CSR equality.
  - Card consumer className gained `relative` (now `'group relative h-full cursor-pointer transition-colors hover:bg-neutral-900 md:max-w-none'`).
  - Title row collapsed: dropped the `flex items-start justify-between gap-2` wrapper. `<h3>` is now a direct child of `Card`.
  - Inserted `<p>Updated {formatTaskDate(task.updatedAt)}</p>` directly below the title with classes `'mt-1 text-sm text-neutral-500 transition-colors group-hover:text-neutral-300'`.
  - Description `<p>` moved below the date line (unchanged classes).
  - Delete `<Button>` moved to the bottom of the JSX and given className `'absolute top-2 right-2 group-hover:text-neutral-50 group-hover:hover:bg-neutral-700'`. All other Button props unchanged.
- `src/components/features/MainHeaderNav.tsx` — two edits:
  - `showBack` rule rewritten: `pathname === '/tasks' || pathname.startsWith('/tasks/')`.
  - Back button `onClick` changed: `() => router.push('/dashboard')` (was `() => router.back()`).
- `__tests__/actions/createTask.test.ts` — one assertion: `expect(redirect).toHaveBeenCalledWith('/tasks')` (was `/dashboard`).
- `__tests__/actions/updateTask.test.ts` — same one-line assertion retarget.
- `__tests__/components/features/TaskCard.test.tsx` — added 2 new cases at the bottom of the describe block: (a) "Updated <date>" line present + small/neutral typography + format `/^Updated \w+ \d{1,2}, \d{4}$/`; (b) Delete button has classes `absolute`, `top-2`, `right-2`. Existing 7 cases unchanged.
- `__tests__/components/features/MainHeaderNav.test.tsx` — reworked:
  - Hoisted `mockPush` replaces hoisted `mockBack` in the `useRouter` mock.
  - The sign-out case "calls router.back() exactly once when the Back button is clicked on /sign-in" is replaced by "does NOT render the Back button on /sign-in".
  - The 2 sign-in/sign-up cases that previously asserted Back button presence now assert `queryByRole('button', { name: /back/i })` is null.
  - Added 3 new signed-in cases: Back present on `/tasks`, Back present on `/tasks/new` and `/tasks/<id>`, clicking Back on `/tasks` calls `router.push('/dashboard')` exactly once.
  - `vi.resetAllMocks()` → `vi.clearAllMocks()` to match the more recent pattern in the project (preserves mock factory implementations).

## Files NOT Modified

- `src/middleware.ts` — already matches both `/dashboard/:path*` and `/tasks/:path*`. No change.
- `src/lib/redirect-rules.ts` — both routes already private; signed-in target stays `/dashboard`. No change.
- `src/components/ui/Card.tsx`, `Button.tsx`, `buttonClass.ts`, `Input.tsx`, `Textarea.tsx` — UI primitives unchanged. (Option B from spec assumption #1; per-instance hover override from #2.)
- `src/components/features/TasksList.tsx`, `TaskForm.tsx`, `SignInForm.tsx`, `SignUpForm.tsx` — unchanged.
- `src/actions/signIn.ts`, `signUp.ts`, `signOut.ts`, `deleteTask.ts` — unchanged (sign-in/sign-up still target `/dashboard`).
- `src/models/Task.ts`, `User.ts`, `src/lib/auth.ts`, `auth.config.ts`, `tasks.ts`, `users.ts`, `password.ts`, `db.ts`, `env.ts`, `utils.ts`, validation/* — unchanged.
- `src/app/(main)/(private)/tasks/new/page.tsx`, `src/app/(main)/(private)/tasks/[id]/page.tsx` — unchanged.
- `vitest.config.mts`, `package.json`, `tsconfig.json`, `tailwind.config.ts`, `globals.css` — unchanged.

## Deviations

None. The plan's 16-step order held verbatim. Intermediate `tsc --noEmit` checks after step 6 and step 8 both passed clean.

## Ambiguities

None required `// NOTE:` markers. Two implementation-level judgement calls handled inline:

- **`Date | string` formatter accommodation** — kept the plan's defensive shape on `formatTaskDate`. At runtime `task.updatedAt` comes through from `getTasksForUser`'s `.lean()` doc as a real `Date` object (Mongoose populates it), but if a future serialisation step (e.g. JSON round-trip via a server-action boundary) ever stringifies it, the helper still works. Cost: one `instanceof` check per render.
- **MainHeaderNav test `vi.resetAllMocks()` → `vi.clearAllMocks()`** — `vi.resetAllMocks()` was previously used; `clearAllMocks` is the project's now-standard pattern (used in `TaskCard.test.tsx`, `updateTask.test.ts`, `createTask.test.ts`, `DashboardWidgetCard.test.tsx`). It also preserves the factory implementation on the `useRouter()` mock so the `mockPush` reference keeps pointing at the same `vi.fn()` instance across test boundaries.

## Known Issues

- **`/dashboard` route's First Load JS is now 106 kB** (was 157 kB when it rendered the tasks list). The 51 kB drop reflects motion/react + RHF moving off the dashboard bundle entirely.
- **`/tasks` route is now 157 kB First Load** — same as the old `/dashboard` route was. No regression.
- **The dark Delete-button hover uses `group-hover:hover:bg-neutral-700`** — a Tailwind v3 stacked-variant. Verified emits in the compiled CSS by route-table inclusion (`next build` exit 0).
- **No runtime smoke this task.** All behavioural ACs covered by unit / RTL tests. The hover effect is user-verifiable during `npm run dev`.
- **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.

## Verification Run

- `npx tsc --noEmit` → exit 0.
- `npx next lint` → "No ESLint warnings or errors".
- `npm run test:run` → **152 tests passing across 22 files** (was 143 / 21). 9 net new tests; 0 failing.
- `npx next build` → exit 0. Route table:
  - `/dashboard` — 164 B / 106 kB First Load (was 43.9 kB / 157 kB).
  - `/tasks` — 44 kB / 157 kB First Load (new — replaces the old `/dashboard` payload).
  - `/tasks/[id]` and `/tasks/new` — unchanged.

### Suite breakdown
- `errors.test.ts`: 11
- `validation/signIn.test.ts`: 6
- `validation/signUp.test.ts`: 5
- `validation/task.test.ts`: 6
- `auth-config.test.ts`: 4
- `middleware.test.ts`: 14
- `actions/signIn.test.ts`: 6
- `actions/signUp.test.ts`: 5
- `actions/createTask.test.ts`: 4 (unchanged count; redirect-target assertion flipped)
- `actions/updateTask.test.ts`: 4 (unchanged count; redirect-target assertion flipped)
- `actions/deleteTask.test.ts`: 4
- `components/features/SignInForm.test.tsx`: 6
- `components/features/SignUpForm.test.tsx`: 6
- `components/features/MainHeaderNav.test.tsx`: 12 (was 9, +3)
- `components/features/TaskCard.test.tsx`: 9 (was 7, +2)
- `components/features/TasksList.test.tsx`: 5
- `components/features/TaskForm.test.tsx`: 8
- `components/features/DashboardWidgetCard.test.tsx`: 4 (**new**)
- `components/ui/Button.test.tsx`: 12
- `components/ui/Card.test.tsx`: 3
- `components/ui/Input.test.tsx`: 9
- `components/ui/Textarea.test.tsx`: 9
- **Total: 152 across 22 files.**

## Mandatory Test Categories (per CLAUDE.md → Testing Rules)

- **Server action redirect-target deltas** (`createTaskAction`, `updateTaskAction`): covered by the in-place assertion updates in `createTask.test.ts` and `updateTask.test.ts`. ✓
- **Client form / state-machine components**: `MainHeaderNav` gained 3 new path-shape cases; `TaskCard` gained 2 layout cases. ✓
- **UI / server component with new public API surface** (`DashboardWidgetCard`): covered by 4 cases. ✓
- **Middleware**: no change this task. ✓
- **Validation schemas / predicates / structural constraints**: no change this task. ✓

The mandatory category gate passes.
