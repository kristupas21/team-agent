# Build Plan: Main Header Polish

## Overview
Five source edits (one component + four pages) and one test extension. No new files, no new components, no new dependencies.

## Reuse

- `src/lib/auth.ts`, `auth.config.ts`, `errors.ts`, `tasks.ts`, `users.ts`, `password.ts`, `db.ts`, `env.ts`, `utils.ts`, `redirect-rules.ts`, `widget-images.ts` — unchanged.
- `src/lib/validation/*.ts` — unchanged.
- `src/actions/*.ts` — unchanged.
- `src/models/*.ts` — unchanged.
- `src/middleware.ts` — unchanged.
- `src/components/ui/Card.tsx`, `Button.tsx`, `buttonClass.ts`, `Input.tsx`, `Textarea.tsx` — unchanged. The Button primitive already supports `aria-label`, `leftIcon`, and children together — no API extension needed.
- `src/components/features/MainHeader.tsx` — unchanged. Already reads `session?.user?.name ?? undefined` and passes through.
- `src/components/features/auth/SignInForm.tsx`, `auth/SignUpForm.tsx`, `tasks/TaskForm.tsx`, `tasks/TaskCard.tsx`, `tasks/TasksList.tsx`, `dashboard/DashboardWidgetCard.tsx` — unchanged.
- All other pages, tests, configs — unchanged.

## Files to Modify

### `src/components/features/MainHeaderNav.tsx` (the load-bearing edit)
- **What changes**:
  1. Destructure `userName` from props (currently typed but not pulled out).
  2. Back button: `variant` `secondary` → `ghost`. Add a `<span className="hidden md:inline">Back</span>` child. `aria-label="Back"` and `leftIcon={<MdArrowBack />}` stay.
  3. Sign Out button: add `aria-label="Sign out"`. Wrap "Sign Out" text in `<span className="hidden md:inline">`.
  4. Add the user-info block as a sibling immediately BEFORE the `<form action={signOutAction}>` inside the right-side `<div className="flex items-center gap-3">`. Condition: `{signedIn && userName && (...)}`. Block structure:
     ```tsx
     <div className="flex flex-col items-end leading-tight">
       <span className="text-xs text-neutral-500">Signed in as:</span>
       <span className="text-sm font-medium text-neutral-900">{userName}</span>
     </div>
     ```
- **Why**: realises ACs 1–15.
- **Reference pattern**: existing `MainHeaderNav.tsx` is already client-component-conventional and uses the in-house Button + buttonClass primitives. No new patterns introduced.

### `src/app/(main)/(auth)/sign-in/page.tsx`
- **What changes**:
  - `<main>` className from `"flex min-h-screen items-center justify-center p-4"` to `"flex min-h-screen items-start justify-center px-4 pt-20"`.
  - `<Card>` (no className today) gains `className="md:max-w-2xl"`.
- **Why**: ACs 16, 20.

### `src/app/(main)/(auth)/sign-up/page.tsx`
- **What changes**: same shape as sign-in.
- **Why**: ACs 17, 20.

### `src/app/(main)/(private)/dashboard/tasks/new/page.tsx`
- **What changes**:
  - `<main>` className update (same string as above).
  - `<Card>` className `md:max-w-lg` → `md:max-w-2xl`.
- **Why**: ACs 18, 20.

### `src/app/(main)/(private)/dashboard/tasks/[id]/page.tsx`
- **What changes**: same as the new-task page.
- **Why**: ACs 19, 20.

### `__tests__/components/features/MainHeaderNav.test.tsx`
- **What changes**: keep existing 15 cases. Add 5 new cases:
  1. "back button uses the ghost variant" — render in any state that shows the Back button (e.g. signedIn on `/dashboard/tasks`). Assert button has classes `bg-transparent` and `text-neutral-700` (the ghost variant tokens from `buttonClass.ts`).
  2. "back button text is wrapped in a span hidden on mobile" — query `screen.getByText('Back')` and assert it has classes `hidden` and `md:inline`.
  3. "sign-out button text is wrapped in a span hidden on mobile" — same for "Sign Out".
  4. "renders the user-info block when signedIn && userName" — render `signedIn userName="alice"`; assert `screen.getByText('Signed in as:')` and `screen.getByText('alice')` are present.
  5. "does NOT render the user-info block when signedIn but userName is undefined" — render `signedIn` without userName; assert no "Signed in as:" text.
  Note: an existing test ("renders the Sign Out form without crashing when userName is omitted") already covers the no-userName-but-signedIn case at the component level; the new case 5 specifically asserts the user-info block absence.
- **Why**: ACs 1–15 verification.

## Data Flow

- `MainHeader.tsx` (server component) calls `auth()`, derives `userName = session?.user?.name ?? undefined`, passes to `<MainHeaderNav signedIn={signedIn} userName={userName} />`.
- `MainHeaderNav.tsx` (client component) consumes both props. New: actually destructures `userName` and renders the user-info block conditionally.
- No new fetches, no client state.

## State Management

- Server state: nothing new (session data flows from `MainHeader`).
- Client UI state: none new. `MainHeaderNav` keeps its existing `usePathname()` + `useRouter()` hooks.
- Global state: none.

## Types

No type changes. `MainHeaderNavProps` already declares `userName?: string`.

## File Tree

```
src/
  app/(main)/(auth)/
    sign-in/page.tsx                    ← MODIFY (main className + Card width)
    sign-up/page.tsx                    ← MODIFY (same)
  app/(main)/(private)/dashboard/tasks/
    new/page.tsx                        ← MODIFY (main className + Card width)
    [id]/page.tsx                       ← MODIFY (same)
  components/features/
    MainHeaderNav.tsx                   ← MODIFY (the load-bearing change)

__tests__/components/features/
  MainHeaderNav.test.tsx                ← MODIFY (+5 cases)
```

## Build Order

1. **Edit `src/components/features/MainHeaderNav.tsx`** — destructure `userName`, swap Back variant + add label span, add Sign Out aria-label + label span, add user-info block.
2. **Edit `src/app/(main)/(auth)/sign-in/page.tsx`** — main className + Card width.
3. **Edit `src/app/(main)/(auth)/sign-up/page.tsx`** — same.
4. **Edit `src/app/(main)/(private)/dashboard/tasks/new/page.tsx`** — main className + Card width.
5. **Edit `src/app/(main)/(private)/dashboard/tasks/[id]/page.tsx`** — same. (Intermediate `tsc --noEmit` after step 5.)
6. **Edit `__tests__/components/features/MainHeaderNav.test.tsx`** — add 5 new cases.
7. **Verify**: `tsc --noEmit`, `next lint`, `test:run`, `next build`. All exit 0.
8. **Diagnostic sweep**: `mcp__ide__getDiagnostics`.
9. **Write artefact docs**.
