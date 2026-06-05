# Features Restructure — Group `/components/features/*` by Usage Scope

## Description

Pure file-tree reorg under `src/components/features/`. Group each component into a subfolder by where it's used: app-wide components stay at the root, single-domain components move into a matching subfolder. No code changes beyond import-path updates.

The user explicitly asks for "no complicated specs, plan, etc, only check if everything works/tests after restructure" and "do this task fast". Brief stays terse.

## Usage Map (verified via grep)

| Component | Currently at | Used in | Target |
|---|---|---|---|
| `MainHeader.tsx` | `features/` | `(main)/layout.tsx` (every page) | stays at `features/` |
| `MainHeaderNav.tsx` | `features/` | via `MainHeader` (every page) | stays at `features/` |
| `SignInForm.tsx` | `features/` | `(auth)/sign-in/page.tsx` only | `features/auth/` |
| `SignUpForm.tsx` | `features/` | `(auth)/sign-up/page.tsx` only | `features/auth/` |
| `DashboardWidgetCard.tsx` | `features/` | `(private)/dashboard/page.tsx` only | `features/dashboard/` |
| `TasksList.tsx` | `features/` | `(private)/dashboard/tasks/page.tsx` only | `features/tasks/` |
| `TaskCard.tsx` | `features/` | by `TasksList` (transitively only on tasks list) | `features/tasks/` |
| `TaskForm.tsx` | `features/` | `tasks/new/page.tsx` + `tasks/[id]/page.tsx` only | `features/tasks/` |

## Resulting Tree

```
src/components/features/
  MainHeader.tsx
  MainHeaderNav.tsx
  auth/
    SignInForm.tsx
    SignUpForm.tsx
  dashboard/
    DashboardWidgetCard.tsx
  tasks/
    TaskCard.tsx
    TaskForm.tsx
    TasksList.tsx
```

## Import Updates

### Page files (7)
- `src/app/(main)/layout.tsx`: `@/components/features/MainHeader` — **unchanged**.
- `src/app/(main)/(auth)/sign-in/page.tsx`: `@/components/features/SignInForm` → `@/components/features/auth/SignInForm`.
- `src/app/(main)/(auth)/sign-up/page.tsx`: `@/components/features/SignUpForm` → `@/components/features/auth/SignUpForm`.
- `src/app/(main)/(private)/dashboard/page.tsx`: `@/components/features/DashboardWidgetCard` → `@/components/features/dashboard/DashboardWidgetCard`.
- `src/app/(main)/(private)/dashboard/tasks/page.tsx`: `@/components/features/TasksList` → `@/components/features/tasks/TasksList`.
- `src/app/(main)/(private)/dashboard/tasks/new/page.tsx`: `@/components/features/TaskForm` → `@/components/features/tasks/TaskForm`.
- `src/app/(main)/(private)/dashboard/tasks/[id]/page.tsx`: `@/components/features/TaskForm` → `@/components/features/tasks/TaskForm`.

### Internal relative imports
- `MainHeader.tsx` → `./MainHeaderNav` — **unchanged** (both stay at root).
- `TasksList.tsx` → `./TaskCard` — **unchanged** (both move into `tasks/`).

### Test files (7)
- `__tests__/components/features/SignInForm.test.tsx`: import path updates.
- `__tests__/components/features/SignUpForm.test.tsx`: same.
- `__tests__/components/features/DashboardWidgetCard.test.tsx`: same.
- `__tests__/components/features/TasksList.test.tsx`: same.
- `__tests__/components/features/TaskForm.test.tsx`: same.
- `__tests__/components/features/TaskCard.test.tsx`: same.
- `__tests__/components/features/MainHeaderNav.test.tsx`: **unchanged** (stays at root).

Note for spec-agent: the `__tests__/components/features/` directory itself stays flat — the test-file glob in `vitest.config.mts` picks them up regardless. Mirroring the new feature subfolders inside `__tests__/` is a separate question (Open Question #1 below). Lean: keep tests flat to minimise diff. The brief's "do this task fast" directive points the same way.

## Open Questions

1. **Mirror the new subfolder structure under `__tests__/components/features/`?** Lean: no. Keep tests flat for now; mirror only when a test count under one subfolder grows beyond comfortable scanning. Affects: number of file moves.

2. **What about future features that span multiple route trees?** Lean: leave them at `features/` root. The rule is "where is it actually used today" — if reuse emerges across two domains, the file relocates to root then.

## Done Criteria

- The 8 component files live at the paths in the tree above.
- All 7 page imports + all 6 affected test imports point at the new paths.
- `npm run test:run`, `npx tsc --noEmit`, `npx next lint`, `npx next build` all green.
- No `.next` cache poisoning (one `rm -rf .next` is acceptable per the precedent in `12-tasks-edit` and `14-minor-rework`).
- Suite total stays at 165 / 23 (no test deletions, no new tests).

## What This Task Does NOT Include

- Any code change inside the moved components.
- Any change to the `__tests__/components/features/` directory layout.
- Any change to non-feature components (`/components/ui/`, `/components/layout/`).
- New tests, new components, or any behavioural rework.
- CLAUDE.md update to document the new layout (the Project Structure section already says "feature-specific components" live under `features/`; sub-bucketing by domain is an organic refinement, not a new convention worth documenting).
