# Build Summary: Tasks (CRUD) + Neon Palette Refresh

## Files Created

### Production source (8 files)
- `src/models/Task.ts` — Mongoose model with `title`, optional `description`, indexed `userId`, timestamps. `_id` typed as `string`.
- `src/lib/tasks.ts` — three data-access helpers: `getTasksForUser`, `createTask`, `deleteTask`. `_id` coerced to string at the boundary so consumers never see `ObjectId`. `deleteTask`'s compound query `{ _id: id, userId: userName }` enforces ownership at the data layer (anti-IDOR).
- `src/lib/validation/task.ts` — `createTaskSchema` with the title 3–64 and description ≤256 rules; empty-string description transforms to `undefined`.
- `src/actions/createTask.ts` — server action. Zod re-validates, `auth()` defensively, `createTask`, then `redirect('/dashboard')` (NEXT_REDIRECT propagates).
- `src/actions/deleteTask.ts` — server action. `auth()`, narrow try/catch around `deleteTask` (CastError on malformed ID collapses to "Task not found"), returns `{ success: true | false, error?: string }`.
- `src/app/(main)/(private)/create-task/page.tsx` — new private route. Defensive `auth()`. Renders centred `<Card>` + `<CreateTaskForm />`.
- `src/components/features/TaskCard.tsx` — client component. Renders one task (title, optional description, danger Delete button with `MdDelete` icon).
- `src/components/features/TasksList.tsx` — client component. `useState<TaskDoc[]>` + `useState<Set<string>>` for per-task deleting. `<AnimatePresence>` + `motion.div` per task with `initial / animate / exit / layout` props. "Create new task" `<Link>` sibling outside `AnimatePresence`.
- `src/components/features/CreateTaskForm.tsx` — client component. RHF + `zodResolver(createTaskSchema)`. Title input has `autoFocus`. Submit button `<Button variant="primary" loading={isSubmitting}>Create</Button>`.

### Tests (6 files, 31 new tests)
- `__tests__/lib/validation/task.test.ts` — 6 cases (schema rules + transform).
- `__tests__/actions/createTask.test.ts` — 4 cases (Zod fail, unauthenticated, valid + redirect, redirect-propagates).
- `__tests__/actions/deleteTask.test.ts` — 4 cases (unauthenticated, deleted false, CastError throws, deleted true).
- `__tests__/components/features/TaskCard.test.tsx` — 4 cases (title, description present, description absent, delete click calls callback).
- `__tests__/components/features/TasksList.test.tsx` — 5 cases (renders all, empty state, Create link href, delete-success removes, delete-failure keeps).
- `__tests__/components/features/CreateTaskForm.test.tsx` — 6 cases (renders inputs + button, autoFocus, empty submit blocks, valid submit calls action, action-failure renders root error, pending state).

## Files Modified

- `package.json` — `motion` added to `dependencies`.
- `tailwind.config.ts` — full neon palette swap. 17 new hexes.
- `src/middleware.ts` — matcher gains `/create-task`.
- `src/lib/redirect-rules.ts` — `isPrivate` check expands to include `/create-task` (and nested).
- `src/app/(main)/(private)/dashboard/page.tsx` — now a tasks-list page. Server-fetches via `getTasksForUser(session.user.name)`, renders heading `"Your tasks"` in `font-display` + `<TasksList initialTasks={tasks} />`. Welcome heading + paragraph removed. Layout switched from vertical-centred to top-anchored `min-h-screen p-4 md:p-8` + `max-w-3xl mx-auto`.
- `__tests__/middleware.test.ts` — appended 2 new cases for `/create-task` (signed-out → `/`; signed-in → pass-through).

## Files NOT Modified

- All other auth-related files (`auth.ts`, `auth.config.ts`, `signIn.ts`, `signUp.ts`, `signOut.ts`, `users.ts`, `password.ts`).
- `src/components/ui/*` — palette flows through via Tailwind class names.
- `src/components/features/MainHeader.tsx`, `MainHeaderNav.tsx`, `SignInForm.tsx`, `SignUpForm.tsx`.
- Sign-in / sign-up pages, error.tsx, not-found.tsx, root layout, `(main)` layout.
- Existing test files — none required modification.

## Deviations

1. **Type narrowing for `getTasksForUser(session.user.name)`** — the defensive `if (!session?.user)` narrows `session.user` to be present but doesn't narrow `.name` (which is typed `string | null | undefined` in next-auth). Tightened the dashboard's guard to `if (!session?.user?.name)` to make the helper's `string` argument satisfy the type. One-character change to the spec's documented outline; the behaviour is identical.

2. **Test mock casts use `as never`** instead of `as Awaited<ReturnType<typeof auth>>`. The plan's outline used the Awaited cast, but TypeScript picks the wrong `auth` overload (Auth.js v5 has multiple call signatures — the bare-call session helper vs the middleware wrapper). `as never` short-circuits the overload selection. Same effect; cleaner.

3. **`createTask.test.ts` uses `vi.clearAllMocks()` in `beforeEach`**, not `vi.resetAllMocks()`. The redirect mock in this file is set up via the factory with `throw makeRedirectError(target)`. `resetAllMocks()` removes implementations including factory-defined ones, breaking the throw assertion. `clearAllMocks()` clears call counts but preserves implementations.

## Ambiguities

None required `// NOTE:` markers. Two minor judgment calls handled inline:

- **`deleteTaskAction`'s catch block** collapses Mongoose `CastError` (malformed ObjectId string) to the same `"Task not found."` response. The architect's notes called this out; the builder implemented exactly as documented.
- **`TaskCard` declared `'use client'`** even though it doesn't itself manage state — it receives an `onDelete` callback that triggers state changes in its parent (`TasksList`). Keeping the directive avoids any future surprise if `TaskCard` is ever rendered from a server context with a callback.

## Known Issues

- **`'use client'` count is now 9** (was 6 after `09-design-updates-retro`). The three new client components are `TaskCard`, `TasksList`, `CreateTaskForm`. Within expectation.
- **Dashboard route now ships 43.7 kB First Load JS** (was 130 B before this task). Attributable to `motion/react` + the task list + the create-task form. Acceptable for a feature-rich page; if size becomes a concern, code-splitting via dynamic import is a future optimisation.
- **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.
- **No runtime smoke this task.** All security-relevant behaviour (anti-IDOR delete, validation, redirect propagation) is covered by unit/RTL tests. The animation behaviour is visual and would benefit from manual eyeballing during `npm run dev`, but not required for build verification.

## Verification Run

- `npx tsc --noEmit` → exit 0.
- `npm run lint` → "No ESLint warnings or errors".
- `npm run test:run` → **122/122 passing across 19 files** (91 previous + 31 new). No regressions.
- `npx next build` → exit 0. Route table:
  - `ƒ /`, `ƒ /api/auth/[...nextauth]`, `ƒ /dashboard` (43.7 kB), `ƒ /create-task` (1.5 kB), `ƒ /sign-in`, `ƒ /sign-up`, `○ /_not-found`, `ƒ Middleware (85.2 kB)`.
- `mcp__ide__getDiagnostics` → no diagnostics in any source or test file (markdown false positives only in the plan file).

### CSS palette verification

```
.bg-primary-500: rgb(0 212 255)  = #00d4ff   ✓ neon cyan
.bg-danger-500:  rgb(255 59 110) = #ff3b6e   ✓ neon hot pink
```

The two spec ACs that grep the compiled CSS for hex bytes passed.

### Static sweep
- Zero `: any`, bare `<a>`, `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>` in any new or modified file.
- `'use client'` count = 9, all at the deepest interactive leaves.

### Suite count breakdown
- `errors.test.ts`: 11
- `validation/signIn.test.ts`: 6
- `validation/signUp.test.ts`: 5
- `validation/task.test.ts`: 6 (**new**)
- `auth-config.test.ts`: 4
- `middleware.test.ts`: 12 (was 10, +2 for `/create-task`)
- `actions/signIn.test.ts`: 6
- `actions/signUp.test.ts`: 5
- `actions/createTask.test.ts`: 4 (**new**)
- `actions/deleteTask.test.ts`: 4 (**new**)
- `components/features/SignInForm.test.tsx`: 6
- `components/features/SignUpForm.test.tsx`: 6
- `components/features/MainHeaderNav.test.tsx`: 9
- `components/features/TaskCard.test.tsx`: 4 (**new**)
- `components/features/TasksList.test.tsx`: 5 (**new**)
- `components/features/CreateTaskForm.test.tsx`: 6 (**new**)
- `components/ui/Button.test.tsx`: 11
- `components/ui/Card.test.tsx`: 3
- `components/ui/Input.test.tsx`: 9
- **Total: 122 across 19 files.**

## Mandatory Test Categories (per CLAUDE.md → Testing Rules)

- **Server actions** (`createTask`, `deleteTask`) — both branch-covered. ✓
- **Validation schema** (`task.ts`) — every rule + the transform behaviour covered. ✓
- **Middleware** — extended with `/create-task` cases. ✓
- **Predicates wrapping framework errors** — N/A (no new predicates introduced).
- **Client form components with state machines** — `CreateTaskForm` covered. ✓
- **Structural constraints** — N/A.

Plus: `TasksList` is a non-form client state machine (manages local task list + per-task deleting state); it's covered by `TasksList.test.tsx` even though it's not strictly a form.

The mandatory category gate passes.
