# Review: Widget Background Images on Dashboard Widget Cards

## STATUS: PASS

## Acceptance Criteria Check

### Widget-image mapping
- [x] 1 — `WIDGET_IMAGES.tasks` has src `/img/cat.png`, alt `''`, 500×500. Asserted in `widget-images.test.ts` test 1; verified in `src/lib/widget-images.ts`.
- [x] 2 — Adding a new widget is a one-row edit. `as const satisfies Readonly<Record<...>>` makes `keyof typeof WIDGET_IMAGES` derive automatically. Verified by code read.

### `DashboardWidgetCard` structure
- [x] 3 — Card classes include `h-40`, `relative`, `group`, `cursor-pointer`, `overflow-hidden`, `transition-colors`, `hover:bg-neutral-900`, `md:max-w-none`; `h-full` removed. Confirmed at `DashboardWidgetCard.tsx:16` + asserted via `DashboardWidgetCard.test.tsx` tests 3, 8.
- [x] 4 — Title `<h3>` carries `relative z-10` alongside existing classes. Confirmed at `DashboardWidgetCard.tsx:27`.

### With `imageKey`
- [x] 5 — Image renders with `src` containing `cat.png` and `alt=""`. `DashboardWidgetCard.test.tsx` test 5.
- [x] 6 — Image has blend / hover classes. `DashboardWidgetCard.test.tsx` test 6.
- [x] 7 — Image rendered with `width="500"` / `height="500"`. Verified — the source dimensions reach the `<img>` via `next/image`'s width/height props (the failure-round console output during the first test pass confirmed `width="500" height="500"` survive on the rendered element).

### Without `imageKey`
- [x] 8 — No `<img>` in DOM. `DashboardWidgetCard.test.tsx` test 9.
- [x] 9 — `h-40` still applied. `DashboardWidgetCard.test.tsx` test 9.

### Dashboard call site
- [x] 10 — `<DashboardWidgetCard … imageKey="tasks" />`. Confirmed at `dashboard/page.tsx:22`.

### Accessibility
- [x] 11 — Image `alt=""` (decorative). Asserted in test 5.
- [x] 12 — Link is focusable; accessible name = title. Existing test 2 still passes.

### Build & quality
- [x] 13 — `tsc --noEmit` exit 0. Verified.
- [x] 14 — `next lint` no errors. Verified.
- [x] 15 — `test:run` ≥ 163 / 23. **165 / 23.** Exceeded.
- [x] 16 — `next build` exit 0, route table unchanged in shape. Verified — same routes as `14-minor-rework`.

### Forbidden-pattern compliance
- [x] 17 — Zero `: any`, bare `<a>`, bare `<img>` (the image uses `next/image`), `next/router`, `window.location`, `React.*`, `Readonly<{}>`. `'use client'` count unchanged at 10.

### Code layout
- [x] 18 — Visual rhythm honoured.

All 18 ACs met.

## Plan Compliance

- All planned files exist at the planned paths.
- The 8-step build order was followed. One deviation documented in build summary: three test cases were reworked to use `container.querySelector('img')` instead of `screen.getByRole('img')` after the first test run revealed that `alt=""` images are removed from the a11y tree. Assertions unchanged; query mechanism shifted.
- `as const satisfies` discipline on `WIDGET_IMAGES` honoured.
- `DashboardWidgetCard` stays a server component (no `'use client'`) — push-deepest rule honoured.
- `next/image` used (not `<img>`) — forbidden-pattern rule honoured.

## Code Quality

- **Type discipline**. `as const satisfies Readonly<Record<string, WidgetImageEntry>>` is the right idiom — gives literal-narrowed inference for `keyof typeof WIDGET_IMAGES` AND constrains each entry's shape. Future entries automatically type-check against `WidgetImageEntry` and the `WidgetImageKey` union grows without manual maintenance.
- **`image` lookup is a simple ternary** — no premature abstraction. Reads top-to-bottom in the render.
- **`overflow-hidden` on the Card** prevents the image from bleeding past the rounded corners — visual polish that would have looked broken otherwise.
- **`relative z-10` on the title** is defensive; works whether the image renders before or after the title in DOM order. Future readers can re-order safely.
- **`w-32 h-auto` display size** — 128 px wide with auto height. For the square 500×500 source, that yields a 128 px-square render — fits cleanly in the 160 px-tall card's bottom-right quadrant without crowding the title.
- **Test mocks** — none added. `next/image` renders to a queryable `<img>` in JSDOM. No `next/navigation` involvement; no `auth()` involvement; no need for any mocks. Clean.
- **`mcp__ide__getDiagnostics`** — only markdown info notices on the spec file (table formatting, numbered-list quirks). No source / test diagnostics.

## Blockers
None.

## Notes (non-blocking)

1. **`/dashboard` route's First Load JS grew from 106 kB → 111 kB** (+5 kB) because of the `next/image` runtime import landing in the dashboard bundle. Acceptable for the feature; no further optimization needed.
2. **The image queries use `container.querySelector('img')`** rather than `getByRole('img')`. This is the canonical RTL pattern for decorative images (alt=""). The choice was forced by the a11y semantics, not a stylistic preference.
3. **The hover filter transition is JSDOM-invisible** — class presence is asserted; the actual visual is user-verifiable during `npm run dev`. Tests confirm the contract is wired.
4. **`tasks/widget-images-spec.md` has markdown-formatting info notices** from the IDE (table formatting, numbered-list continuity). These are false-positive style nits, not content issues; the spec is well-formed for downstream agents.
5. **`cat.png` size budget** — 287 KB. Within the brief's guideline of "≤ ~300 KB per image" (now documented in CLAUDE.md's Image Assets section).
6. **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.
7. **Future widgets**: when one lands, the pattern is set — add an entry to `WIDGET_IMAGES`, pass `imageKey="<new-key>"` at the call site, and (if desired) extend the widget-card test with a copy of the existing image-present case parameterised for the new key.

## Approved Files

- **New (3)**: `src/lib/widget-images.ts`, `__tests__/lib/widget-images.test.ts`, plus the preprocessed asset `public/img/cat.png` (placed during brief preparation).
- **Modified (3)**: `src/components/features/DashboardWidgetCard.tsx`, `src/app/(main)/(private)/dashboard/page.tsx`, `__tests__/components/features/DashboardWidgetCard.test.tsx`.

No files require changes. STATUS: PASS.
