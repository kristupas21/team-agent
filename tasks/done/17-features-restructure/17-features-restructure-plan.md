# Build Plan: Features Restructure

## Build Order
1. Create subdirs `features/auth/`, `features/dashboard/`, `features/tasks/`.
2. `mv` each file to its new home.
3. Update 6 page imports.
4. Update 6 test imports.
5. `rm -rf .next` (defensive against stale type cache).
6. Run `tsc --noEmit`, `next lint`, `test:run`, `next build`.
7. Write artefact docs.

## Moves
- `features/SignInForm.tsx` → `features/auth/SignInForm.tsx`
- `features/SignUpForm.tsx` → `features/auth/SignUpForm.tsx`
- `features/DashboardWidgetCard.tsx` → `features/dashboard/DashboardWidgetCard.tsx`
- `features/TaskCard.tsx` → `features/tasks/TaskCard.tsx`
- `features/TaskForm.tsx` → `features/tasks/TaskForm.tsx`
- `features/TasksList.tsx` → `features/tasks/TasksList.tsx`

## Import Updates (paths)
Page files: 6 edits (`@/components/features/X` → `@/components/features/<bucket>/X`).
Test files: 6 edits (mirror the page edits).
Internal relative imports (`./TaskCard`, `./MainHeaderNav`): no change — both pairs stay co-located.
