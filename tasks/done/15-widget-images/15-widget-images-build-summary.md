# Build Summary: Widget Background Images on Dashboard Widget Cards

## Files Created

### Production source (1)
- `src/lib/widget-images.ts` — typed widget-to-image mapping. Exports `WidgetImageEntry` type, `WIDGET_IMAGES` constant (currently one entry: `tasks` → `cat.png` 500×500), and `WidgetImageKey` derived literal-union type. Uses `as const satisfies Readonly<Record<string, WidgetImageEntry>>` so the type narrows to literal keys while still constraining each entry's shape.

### Tests (1)
- `__tests__/lib/widget-images.test.ts` — 2 cases: maps `tasks` to the expected entry shape, and a structural check that the keys array is non-empty + every key is a non-empty string.

## Files Modified

- `src/components/features/DashboardWidgetCard.tsx` — full rewrite:
  - Imports `Image` from `next/image`, plus `WIDGET_IMAGES` and `WidgetImageKey` from `@/lib/widget-images`.
  - Props expand by one optional: `imageKey?: WidgetImageKey`.
  - Derived `image = imageKey ? WIDGET_IMAGES[imageKey] : undefined` lookup at the top of the render.
  - Card consumer className: gained `relative`, `h-40`, `overflow-hidden`; dropped `h-full`. Final string: `'group relative h-40 cursor-pointer overflow-hidden transition-colors hover:bg-neutral-900 md:max-w-none'`.
  - Title `<h3>` gained `relative z-10` (alongside its existing token set).
  - Conditional `<Image>` block renders before the title when `image` is truthy. Classes: `'absolute left-[60%] top-[50%] h-auto w-32 opacity-60 mix-blend-multiply transition group-hover:grayscale group-hover:brightness-150'`. Passes `src/alt/width/height` from the mapping entry.
  - Component stays a server component (no `'use client'` — `Link`, `Image`, and `Card` are all server-compatible).
- `src/app/(main)/(private)/dashboard/page.tsx` — one prop addition: `<DashboardWidgetCard href="/dashboard/tasks" title="Tasks" imageKey="tasks" />`.
- `__tests__/components/features/DashboardWidgetCard.test.tsx` — extended from 4 → 9 cases. Existing 4 cases unchanged. 5 new cases:
  1. "renders the mapped image when imageKey is provided" — asserts image is in the DOM, `alt=""`, and `src` contains `cat.png`.
  2. "applies the blend and hover-filter classes to the image" — asserts `opacity-60`, `mix-blend-multiply`, `group-hover:grayscale`, `group-hover:brightness-150`.
  3. "positions the image absolutely at left-[60%] top-[50%]" — asserts `absolute`, `left-[60%]`, `top-[50%]`.
  4. "applies the fixed h-40 height to the Card surface" — asserts the Card root has `h-40`.
  5. "does NOT render any image when imageKey is omitted, but still applies the fixed h-40 height" — covers the fallback path.

## Files NOT Modified

- `src/lib/auth.ts`, `auth.config.ts`, `errors.ts`, `tasks.ts`, `users.ts`, `password.ts`, `db.ts`, `env.ts`, `utils.ts`, `redirect-rules.ts` — unchanged.
- `src/lib/validation/*.ts` — unchanged.
- `src/actions/*.ts` — unchanged.
- `src/models/*.ts` — unchanged.
- `src/middleware.ts` — unchanged.
- `src/components/ui/Card.tsx`, `Button.tsx`, `buttonClass.ts`, `Input.tsx`, `Textarea.tsx` — unchanged.
- `src/components/features/TaskCard.tsx`, `TasksList.tsx`, `TaskForm.tsx`, `MainHeader.tsx`, `MainHeaderNav.tsx`, `SignInForm.tsx`, `SignUpForm.tsx` — unchanged.
- All page files except `dashboard/page.tsx` — unchanged.
- `vitest.config.mts`, `package.json`, `tsconfig.json`, `tailwind.config.ts`, `globals.css` — unchanged.
- All existing tests except `DashboardWidgetCard.test.tsx` — unchanged.

## Deviations

- **Test query for the decorative image used `container.querySelector('img')` instead of `screen.getByRole('img')`.** The first attempt used `getByRole('img')` per the plan's outline, but it failed because images with `alt=""` are removed from the accessibility tree (semantically `role="presentation"`, not `role="img"`). Three tests had to be reworked to use `container.querySelector('img')` — the canonical pattern for querying decorative images in RTL. The test logic and assertions are unchanged; only the query mechanism shifted.

## Ambiguities

None required `// NOTE:` markers. One judgement call handled inline:

- **`<Image>` rendered BEFORE `<h3>` in DOM order** — the spec said "image first, title second … `z-10` on the title makes the visual stacking explicit". I followed that order; the title carries `relative z-10` so it sits above regardless of source order. Pure CSS stacking would also work with DOM-order-only (title last + `relative` only), but the explicit `z-10` is the more defensive choice for future readers.

## Known Issues

- **`/dashboard` route's First Load JS grew from 106 kB → 111 kB** (+5 kB) because of the `next/image` import landing in the dashboard bundle. Acceptable for the feature.
- **No runtime smoke this task.** All behavioural ACs covered by unit / RTL tests. The visual effect (blend + hover filter against the dark card) is user-verifiable during `npm run dev`.
- **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.
- **Markdown table-format and numbered-list info diagnostics** on `tasks/widget-images-spec.md` — IDE noise; the spec is well-formed for the agent pipeline.

## Verification Run

- `npx tsc --noEmit` → exit 0.
- `npx next lint` → "No ESLint warnings or errors".
- `npm run test:run` → **165 tests passing across 23 files** (was 158 / 22, target ≥ 163 / 23). +7 net new tests, 0 failing.
- `npx next build` → exit 0. Route table unchanged in shape: `/dashboard`, `/dashboard/tasks`, `/dashboard/tasks/[id]`, `/dashboard/tasks/new`. `/dashboard`'s First Load is now 111 kB (was 106 kB).
- `mcp__ide__getDiagnostics` → no diagnostics on any source or test file. Markdown-only info notices on the spec.

### Suite breakdown
- `errors.test.ts`: 11
- `validation/signIn.test.ts`: 6
- `validation/signUp.test.ts`: 5
- `validation/task.test.ts`: 6
- `auth-config.test.ts`: 4
- `widget-images.test.ts`: 2 (**new**)
- `middleware.test.ts`: 16
- `actions/signIn.test.ts`: 6
- `actions/signUp.test.ts`: 5
- `actions/createTask.test.ts`: 4
- `actions/updateTask.test.ts`: 4
- `actions/deleteTask.test.ts`: 4
- `components/features/SignInForm.test.tsx`: 6
- `components/features/SignUpForm.test.tsx`: 6
- `components/features/MainHeaderNav.test.tsx`: 15
- `components/features/TaskCard.test.tsx`: 10
- `components/features/TasksList.test.tsx`: 5
- `components/features/TaskForm.test.tsx`: 8
- `components/features/DashboardWidgetCard.test.tsx`: 9 (was 4, +5)
- `components/ui/Button.test.tsx`: 12
- `components/ui/Card.test.tsx`: 3
- `components/ui/Input.test.tsx`: 9
- `components/ui/Textarea.test.tsx`: 9
- **Total: 165 across 23 files.**

## Mandatory Test Categories (per CLAUDE.md → Testing Rules)

- **UI / server component with new public API surface** (`DashboardWidgetCard` gains `imageKey` prop, new visual structure): covered by 5 new RTL cases. ✓
- **Module exporting a typed mapping** (`WIDGET_IMAGES`): covered by 2 cases in `widget-images.test.ts`. ✓
- All other categories untouched in this task.

The mandatory category gate passes.
