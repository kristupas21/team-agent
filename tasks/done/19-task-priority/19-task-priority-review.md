# Review: Task Priority + Lib Restructure + Notes Route

## STATUS: PASS

## Acceptance Criteria Check

### Thread A — Lib Restructure
- [x] 1 — `src/lib/auth/` contains `auth.ts`, `auth.config.ts`, `password.ts`. Verified.
- [x] 2 — `src/lib/db/` contains `db.ts`, `tasks.ts`, `users.ts`. Verified.
- [x] 3 — Cross-cutting files at `src/lib/` root (`env.ts`, `errors.ts`, `redirect-rules.ts`, `utils.ts`, `widget-images.ts`, `task-priority.ts`). Verified.
- [x] 4 — `src/lib/validation/` unchanged. Verified.
- [x] 5 — All import paths in `/src` and `/__tests__` point at new module locations. `grep` confirms zero remaining old-path references; `tsc` clean.

### Thread B — Notes
- [x] 6 — `/dashboard/notes` renders `<h1>Notes</h1>` behind `auth()` guard. Confirmed.
- [x] 7 — Unauthenticated `/dashboard/notes` redirects to `/`. Page guard + middleware both cover.
- [x] 8 — `WIDGET_IMAGES.notes` shape verified by widget-images.test.ts new case.
- [x] 9 — `public/img/butterfly.png` exists at 258 KB / 350×350. Under 300 KB target.
- [x] 10 — Dashboard renders both Tasks and Notes widgets. Confirmed at dashboard/page.tsx:23-24.
- [x] 11 — `MainHeaderNav` shows back button on `/dashboard/notes`. New test asserts.
- [x] 12 — Back click on `/dashboard/notes` calls `router.push('/dashboard')`. New test asserts.

### Thread C — Task Priority
- [x] 13 — `Task` Mongoose schema has `priority` enum + default. Confirmed at `models/Task.ts:17`.
- [x] 14 — `taskSchema` (Zod) has `priority: z.enum(TASK_PRIORITIES).default('medium')`. Confirmed; +3 cases assert this.
- [x] 15 — `TaskDoc` and `TaskInput` include `priority: TaskPriority`. Implicit in tsc success.
- [x] 16 — Migration script exists, idempotent via `$exists: false` filter.
- [x] 17 — 4 new color tokens with 50/500/700 shades. Confirmed at `tailwind.config.ts:20-23`.
- [x] 18 — `Pill` primitive at `src/components/ui/Pill.tsx` with 4 color-named variants; class map `bg-{name}-50 text-{name}-700`. Confirmed; 7 tests.
- [x] 19 — `Dropdown` primitive at `src/components/ui/Dropdown.tsx` accepts `options: { value; label }[]`, mirrors Input/Textarea idiom. Confirmed; 10 tests.
- [x] 20 — `lib/task-priority.ts` exports the four required symbols. Confirmed.
- [x] 21 — TaskForm renders Priority dropdown between Description and Submit, Medium default. New test asserts.
- [x] 22 — Edit-mode pre-fills priority. New test asserts.
- [x] 23 — TaskCard renders `<Pill>` under description with correct label + variant. New tests assert (one parameterized over all 4 mappings).
- [x] 24 — Actions validate and persist priority. Asserted in updated `createTask.test.ts` + `updateTask.test.ts`.

### Build & quality
- [x] 25 — `tsc`, `lint`, `test:run`, `next build` all green. Verified.
- [x] 26 — Suite ≥ 195 / 25. **198 / 25.** Verified.

### Forbidden patterns + code layout
- [x] 27 — `'use client'` count grew by 1 to 11 (Dropdown requires the directive — mirrors Input/Textarea). Zero forbidden patterns.
- [x] 28 — Visual rhythm honoured.

All 28 ACs met.

## Plan Compliance

- All planned files exist at the planned paths.
- The 29-step build order held verbatim. Intermediate `tsc` checks after Phase 1 moves and Phase 3a primitives both surfaced expected issues (test fixtures needing the `priority` field), which were then fixed in Phase 5.
- One small additional manual fix needed: `scripts/seed-admin.ts` used relative imports (`../src/lib/...`) not the `@/` alias, so the Phase 1 sed batch missed it. Documented in build summary.
- Butterfly preprocessing deviated from the 500-px reference (cat.png) to 350-px — to keep within the 300 KB target. Documented as a deviation.

## Code Quality

- **`as const satisfies` discipline** on `TASK_PRIORITIES` (tuple) and `WIDGET_IMAGES` lets `keyof typeof` derive literal unions automatically. Future priority additions or widgets get type narrowing for free.
- **`Pill` is a server component** — no `'use client'`. Pure render.
- **`Dropdown` is a client component** — needed because RHF spreads onChange/onBlur handlers onto it.
- **`task-priority.ts` lives at `lib/` root** — cross-cutting (consumed by model, validation, TaskForm, TaskCard, action types). Placement aligns with the lib-restructure conventions.
- **Sed batch approach for lib-restructure imports** — order matters when one prefix is a strict substring of another (e.g. `@/lib/auth` vs. `@/lib/auth.config`). Solved by always matching the closing quote in the replacement pattern.
- **`scripts/seed-admin.ts` fix** — caught via the post-move `tsc --noEmit`. The script doesn't run during normal builds, so it wouldn't have broken the production build, but `tsc` reports it.
- **Migration script's `connectDB`/`mongoose.disconnect` pattern** matches the existing `seed-admin.ts` shape — same operational ergonomics.
- **`mcp__ide__getDiagnostics`** — only markdown numbering info notices on the brief (false-positive noise). No source / test diagnostics.

## Blockers
None.

## Notes (non-blocking)

1. **Migration is operational, not automatic.** The user runs `npx tsx scripts/migrate-task-priority.ts` once to backfill any existing tasks lacking `priority`. Subsequent runs are idempotent. Document in deployment / onboarding notes.
2. **Butterfly is 350×350 vs. cat's 500×500.** The visual filters (`mix-blend-multiply` idle, `mix-blend-hard-light` + `grayscale` + `brightness-150` on hover, `opacity-60` throughout) absorb the resolution drop. Verify during `npm run dev`.
3. **The new palette tokens' hex values are draft picks.** They land at `bordeaux #8a2e2e / amber #c98c1f / slate #6b7a85 / light-blue #5a8cb0` for the 500 shade. If they clash with the existing primary/secondary/danger/success palette under live conditions, a tone-tuning sub-task is one-line-each.
4. **`Dropdown`'s chevron is the browser default.** Acceptable for v1; a custom chevron via background-image-data-URL or icon overlay can land later.
5. **The dashboard widget grid is 2 cells now.** Future widgets (settings, profile, etc.) drop in by adding entries to `WIDGET_IMAGES` + a new `<DashboardWidgetCard>` instance + a new `/dashboard/<sub>/page.tsx`. Header back-button rule already covers any depth.
6. **`MainHeaderNav.test.tsx` is now 22 cases** — the largest test file. Approaching the threshold where splitting by describe-block could help; not urgent.
7. **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.

## Approved Files

- **New (5)**: `src/lib/task-priority.ts`, `src/components/ui/Pill.tsx`, `src/components/ui/Dropdown.tsx`, `src/app/(main)/(private)/dashboard/notes/page.tsx`, `scripts/migrate-task-priority.ts`.
- **Moved (6)**: 3 files into `src/lib/auth/`, 3 files into `src/lib/db/`.
- **Asset (1)**: `public/img/butterfly.png` (preprocessed, committed).
- **Modified (production source, 11)**: `tailwind.config.ts`, `src/models/Task.ts`, `src/lib/validation/task.ts`, `src/lib/db/tasks.ts`, `src/lib/widget-images.ts`, `src/actions/createTask.ts`, `src/actions/updateTask.ts`, `src/components/features/MainHeaderNav.tsx`, `src/components/features/tasks/TaskForm.tsx`, `src/components/features/tasks/TaskCard.tsx`, `src/app/(main)/(private)/dashboard/page.tsx`, plus 30 import-path updates across other files via sed batch, plus `scripts/seed-admin.ts` manual fix.
- **New tests (2)**: `__tests__/components/ui/Pill.test.tsx`, `__tests__/components/ui/Dropdown.test.tsx`.
- **Modified tests (8)**: `__tests__/lib/validation/task.test.ts`, `__tests__/lib/widget-images.test.ts`, `__tests__/components/features/MainHeaderNav.test.tsx`, `__tests__/components/features/TaskCard.test.tsx`, `__tests__/components/features/TaskForm.test.tsx`, `__tests__/components/features/TasksList.test.tsx`, `__tests__/actions/createTask.test.ts`, `__tests__/actions/updateTask.test.ts`.

No files require changes. STATUS: PASS.
