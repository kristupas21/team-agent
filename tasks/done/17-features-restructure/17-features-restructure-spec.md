# Spec: Features Restructure

## Summary
Pure file-tree reorg under `src/components/features/`. Eight components, three new subfolders (`auth/`, `dashboard/`, `tasks/`), two stay at root. No code change beyond import-path updates.

## Final Tree
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

## Acceptance Criteria
1. 8 component files at the paths above.
2. 6 page imports updated to the new paths (`MainHeader` stays).
3. 6 test imports updated (`MainHeaderNav.test.tsx` stays).
4. Internal relative imports unchanged (both pairs move together).
5. `tsc`, `lint`, `test:run`, `next build` all green.
6. Suite total: 165 / 23 (no test count change).
