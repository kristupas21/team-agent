# Spec: Widget Background Images on Dashboard Widget Cards

## Summary
The `DashboardWidgetCard` component gains a fixed height (`h-40` / 160 px) and an optional partial background image at the bottom-right. The image is sourced from a centralised widget-to-image mapping (`src/lib/widget-images.ts`) keyed by a string identifier so future widgets plug in by adding one row. Each card has `relative` positioning; the image is an absolutely-positioned `next/image` element with its top-left corner at `left: 60% / top: 50%` (arbitrary Tailwind values). Idle styling: `opacity-60 mix-blend-multiply` so the image blends with the light `bg-neutral-100` Card surface. Hover styling: `group-hover:grayscale group-hover:brightness-150` so the image stays visible against the dark `bg-neutral-900` hovered surface. The title sits above the image with `relative z-10` and gains a transparent background guarantee via its own classes. The Tasks widget passes `imageKey="tasks"` and renders `cat.png` (already preprocessed at `public/img/cat.png`, 500×500, 287 KB). Widgets without an `imageKey` render with the same fixed height and no image.

## Assumptions

1. **Mapping shape** (Open Question #1 default): Option A — separate constant module at `src/lib/widget-images.ts` with a typed map keyed by widget string identifier. Shape:
   ```ts
   export const WIDGET_IMAGES = {
     tasks: { src: '/img/cat.png', alt: '', width: 500, height: 500 },
   } as const

   export type WidgetImageKey = keyof typeof WIDGET_IMAGES
   ```
   The `width` / `height` fields are the source dimensions (required by `next/image` to reserve aspect ratio). The `alt` is empty (decorative).

2. **`DashboardWidgetCard` prop expansion**:
   ```ts
   type DashboardWidgetCardProps = Readonly<{
     href: string
     title: string
     imageKey?: WidgetImageKey
   }>
   ```
   `imageKey` is optional. When omitted, no image renders. When present, the component looks up the entry in `WIDGET_IMAGES` and renders an `<Image>` with the mapped source.

3. **Fixed card height** (Open Question #13 default): `h-40` (160 px). Applied uniformly to all `DashboardWidgetCard` instances regardless of `imageKey`. Replaces the existing `h-full` on the Card's consumer className.

4. **Card positioning**: the Card's consumer className gains `relative` so the absolutely-positioned image anchors to the Card box. Full className string: `'group relative h-40 cursor-pointer overflow-hidden transition-colors hover:bg-neutral-900 md:max-w-none'`. The `overflow-hidden` ensures the image cannot bleed past the Card's rounded corners.

5. **Image position** (Open Question #3 default): `absolute left-[60%] top-[50%]`. The image's top-left corner sits at 60% from the left and 50% from the top of the Card. Arbitrary Tailwind values per CLAUDE.md's stance (acceptable when there's no token alternative — `left-3/5` doesn't exist).

6. **Image dimensions on render** (Open Question #4 default): `<Image>` props `width={500}` and `height={500}` (from the mapping). Display-size CSS overrides via `className="h-auto w-32"` (i.e. the image renders 128 px wide; aspect ratio preserved by `h-auto`). 128 px wide × auto = 128 px tall (since cat.png is square 1:1). At display this fills the bottom-right ~40% × 80% of the 160 px card — within the spec's "bottom-right ~40% × 50% region" allowance for the square aspect ratio. The architect / builder may tune `w-32` if needed.

7. **Idle blend** (Open Question #5 default): `opacity-60 mix-blend-multiply`. Applied to the `<Image>` element directly. `mix-blend-multiply` darkens against the light card surface (`bg-neutral-100`) preserving the cat's shape without a hard-edge sticker look. `opacity-60` softens further.

8. **Hover treatment** (Open Question #6 default): `group-hover:grayscale group-hover:brightness-150`. Applied to the `<Image>` element. On hover the card's `bg-neutral-900` darkens behind the image; `grayscale` removes the cat's colour to keep it subtle; `brightness-150` boosts luminance so the image remains visible against the dark surface. Plus `transition` for smooth state changes (matches the existing `transition-colors` on the Card and title).

9. **Title stacking** (Open Question #7 default): the `<h3>` gains `relative z-10` so it sits above the image regardless of DOM order. The image renders BEFORE the title in the DOM (image-first, title-second) — but `z-10` on the title makes the visual stacking explicit.

10. **Image alt text** (Open Question #8 default): empty string (`alt=""`). Marks the image as decorative for screen readers. The title is the accessible name of the link.

11. **Fallback when `imageKey` is undefined or unknown** (Open Question #9 default): the component renders the Card with the fixed height and the title only — no image element appears in the DOM. An unknown `imageKey` (e.g. one passed by mistake) falls through the same path because the lookup `WIDGET_IMAGES[imageKey]` would return undefined and the conditional render gates on truthiness. Note: TypeScript's `WidgetImageKey` union prevents unknown keys at compile time anyway, so the truthiness check is a runtime defence-in-depth.

12. **Title typography unchanged**: still `text-lg font-medium text-neutral-900 transition-colors group-hover:text-neutral-50`. Plus the new `relative z-10`.

13. **No change to `Card.tsx`** (Open Question #10 default). All new classes live on the consumer className from `DashboardWidgetCard`.

14. **Dashboard page** (`src/app/(main)/(private)/dashboard/page.tsx`) updates to pass `imageKey="tasks"` to the Tasks widget. The href and title are unchanged.

15. **Grid wrapper unchanged**: the dashboard's `grid grid-cols-1 gap-4 md:grid-cols-2` stays. Heights inside the grid are now uniform because every cell has `h-40`.

16. **No model, route, auth, validation, action, or DAL change.**

17. **No new dependencies**.

18. **Test coverage** (Open Question #11 default + mandatory categories):
    - `__tests__/components/features/DashboardWidgetCard.test.tsx` — extended:
      - Existing 4 cases stay (with minor href data update — actually no change needed; the brief already flipped to `/dashboard/tasks` in task 14).
      - New case: "renders the mapped image when imageKey is provided" — pass `imageKey="tasks"`; assert `<img>` with `src` containing `/img/cat.png` (or `/_next/image?` URL containing the source path, depending on how `next/image` mocks during tests), `alt=""`.
      - New case: "applies the blend / hover-filter classes to the image" — assert the image has `mix-blend-multiply`, `opacity-60`, `group-hover:grayscale`, `group-hover:brightness-150`.
      - New case: "positions the image absolutely at left-[60%] top-[50%]" — assert the image has `absolute`, `left-[60%]`, `top-[50%]`.
      - New case: "applies the fixed h-40 height to the Card surface" — assert the rendered Card root has class `h-40`.
      - New case: "does NOT render any image when imageKey is omitted" — pass without `imageKey`; assert `screen.queryByRole('img')` returns null AND assert the Card root still has class `h-40` (so height stays uniform).
    - Final case count: 9 (was 4, +5).
    - `__tests__/lib/widget-images.test.ts` (new) — 2 cases: assert `WIDGET_IMAGES.tasks.src === '/img/cat.png'`, assert `alt` is empty string. (Spec-agent's note: this is borderline; the mapping is a tiny constant. But: the brief explicitly calls out "mandatory test categories" plus this map is the extension point for future widgets — a single-screen-line test ensures future additions don't accidentally regress the structure.)

19. **Snapshot of the suite**: total expected ≥ 163 across 23 files (was 158 / 22, +5 widget-card cases, +2 widget-images-map cases, +1 file).

20. **Build flow**: no `.next` cache eviction expected (no file moves this task). Standard `tsc → lint → test → build` sequence.

## Open Questions

(All resolved with leans documented in the brief. The architect and builder MUST NOT read this section; defaults above are binding.)

1. Mapping shape — Option A (constant module + key prop) vs. Option B (inline image-object prop). — Assumed: Option A. Affects: file count and prop shape.
2. Mapping file location — `src/lib` vs. co-located. — Assumed: `src/lib/widget-images.ts`. Affects: import path.
3. Position values — Tailwind arbitrary `left-[60%] top-[50%]` vs. standard tokens. — Assumed: arbitrary values. Affects: precision vs. token discipline.
4. Image dimensions on render — explicit display size via Tailwind `w-32` vs. native rendering. — Assumed: `w-32 h-auto`. Affects: visual footprint.
5. Idle blend — `opacity` only vs. `mix-blend-multiply` vs. `mask-image`. — Assumed: `opacity-60 mix-blend-multiply`. Affects: visual.
6. Hover treatment — `invert` vs. `grayscale + brightness` vs. `opacity-30`. — Assumed: `grayscale brightness-150`. Affects: visual.
7. Title stacking — explicit `relative z-10` vs. natural stacking. — Assumed: explicit. Affects: defensiveness.
8. Image alt text — empty `alt=""` vs. descriptive. — Assumed: empty (decorative). Affects: a11y semantics.
9. Widget without image — fallback to title-only with same height vs. shorter card. — Assumed: same fixed height. Affects: dashboard grid uniformity.
10. `relative` placement — consumer className vs. `Card` primitive API. — Assumed: consumer className. Affects: `Card.tsx` modification scope.
11. Test scope — include fallback case + mapping file test. — Assumed: yes to both. Affects: file count.
12. (Resolved in brief, see Assumption 6.)
13. Fixed height token — `h-36` vs. `h-40` vs. `h-44` vs. arbitrary. — Assumed: `h-40`. Affects: visual proportions.
14. Fixed height applies to widgets without images? — Assumed: yes. Affects: grid uniformity.

## Routes / Pages

| Path | Change |
|---|---|
| `/dashboard` | One-prop addition: `<DashboardWidgetCard href="/dashboard/tasks" title="Tasks" imageKey="tasks" />`. |
| `/dashboard/tasks`, `/dashboard/tasks/[id]`, `/dashboard/tasks/new`, `/`, `/sign-in`, `/sign-up` | Unchanged. |

## Data

### API Endpoints
None new. No data layer change.

### Data Types
New (`src/lib/widget-images.ts`):
```ts
type WidgetImageEntry = Readonly<{
  src: string
  alt: string
  width: number
  height: number
}>

export const WIDGET_IMAGES: Readonly<Record<string, WidgetImageEntry>> = {
  tasks: { src: '/img/cat.png', alt: '', width: 500, height: 500 },
} as const

export type WidgetImageKey = keyof typeof WIDGET_IMAGES
```

(The `as const` plus the `Record` annotation give the architect / builder room to pick the exact final form. The functional contract is what matters: typed lookup by key.)

Updated (`src/components/features/DashboardWidgetCard.tsx`):
```ts
type DashboardWidgetCardProps = Readonly<{
  href: string
  title: string
  imageKey?: WidgetImageKey
}>
```

## Components

| Name | Purpose | Props |
|---|---|---|
| `DashboardWidgetCard` (modified) | Card-styled internal link. New: fixed height, optional partial bg image at bottom-right with blend / hover-filter. | `Readonly<{ href: string; title: string; imageKey?: WidgetImageKey }>` |
| `WIDGET_IMAGES` (new, not a component) | Widget-to-image mapping. | Module exports `WIDGET_IMAGES` and `WidgetImageKey`. |

## User Interactions

### Happy path — view dashboard with image widget
1. User navigates to `/dashboard`.
2. Page renders. The Tasks widget shows `<h3>Tasks</h3>` at the top-left and `cat.png` blended into the bottom-right of the card.
3. User hovers over the Tasks widget. The card surface darkens to `bg-neutral-900`; the title turns light (`neutral-50`); the image switches to a grayscale + brightened state, remaining visible.
4. User clicks the widget. Browser navigates to `/dashboard/tasks`.

### Happy path — widget without image
1. (Hypothetical future widget.) `DashboardWidgetCard` is rendered without `imageKey`.
2. The Card renders with the fixed `h-40` height, no image element in the DOM, just the title.
3. Hover behaviour matches: card darkens, title lightens. No image to filter.

### Failure path — none
There are no user-facing failure modes specific to this feature. The image is decorative; a 404 on the asset would show a broken-image icon, but `next/image` skips that and `cat.png` is committed.

## States

### `DashboardWidgetCard` — idle (light, with imageKey)
- Card: `bg-neutral-100`, `h-40`, rounded.
- Title: visible at top-left, dark text.
- Image: visible at bottom-right, `opacity-60 mix-blend-multiply`. Cat shape blends into the light surface.

### `DashboardWidgetCard` — hover (dark, with imageKey)
- Card: `bg-neutral-900`.
- Title: light (`neutral-50`).
- Image: `grayscale brightness-150`, still positioned at bottom-right, visible against the dark surface.
- All transitions: `transition-colors` / `transition` on the image (so the filter shift is smooth, not snappy).

### `DashboardWidgetCard` — without imageKey
- Same Card height (`h-40`).
- No image DOM node.
- Title behaviour unchanged.

### `DashboardWidgetCard` — focus (keyboard nav)
- Default `next/link` + Card behaviour. No new focus ring beyond existing Tailwind defaults.

## Acceptance Criteria

### Widget-image mapping
1. Given the `WIDGET_IMAGES` map is inspected, when its entries are enumerated, then `tasks` is present with `src='/img/cat.png'`, `alt=''`, `width=500`, `height=500`.
2. Given a new widget key would be added, when a developer edits `WIDGET_IMAGES`, then the only change required is one row in the object (the `WidgetImageKey` type derives automatically).

### `DashboardWidgetCard` structure
3. Given `DashboardWidgetCard` renders, when the Card's classes are inspected, then they include `h-40`, `relative`, `group`, `cursor-pointer`, `overflow-hidden`, `transition-colors`, `hover:bg-neutral-900`, `md:max-w-none`. The previous `h-full` class is gone.
4. Given the Card renders, when the rendered DOM is inspected, then the title `<h3>` has classes including `relative z-10` in addition to its existing `text-lg font-medium text-neutral-900 transition-colors group-hover:text-neutral-50`.

### `DashboardWidgetCard` — with `imageKey`
5. Given `<DashboardWidgetCard href="/dashboard/tasks" title="Tasks" imageKey="tasks" />` renders, when the DOM is inspected, then exactly one `<img>` element appears with `src` matching `/img/cat.png` (or `next/image`'s URL-rewritten equivalent) and `alt=""`.
6. Given the image renders, when its classes are inspected, then they include `absolute`, `left-[60%]`, `top-[50%]`, `opacity-60`, `mix-blend-multiply`, `group-hover:grayscale`, `group-hover:brightness-150`, `transition`.
7. Given the image renders, when its size attributes are inspected, then `width="500"` and `height="500"` are set (source dimensions for aspect-ratio preservation).

### `DashboardWidgetCard` — without `imageKey`
8. Given `<DashboardWidgetCard href="/whatever" title="Settings" />` renders (no `imageKey`), when the DOM is inspected, then no `<img>` element is present.
9. Given the same render, when the Card's classes are inspected, then `h-40` is still applied (uniform height).

### Dashboard call site
10. Given `/dashboard` renders, when the Tasks widget is inspected, then it was instantiated with `imageKey="tasks"` (i.e. the rendered DOM contains the `cat.png` image).

### Accessibility
11. The image has `alt=""` (decorative).
12. The `<Link>` wrapping the Card is the focusable element. Its accessible name is the `<h3>` title text.

### Build & quality
13. Given the code is built, when `npx tsc --noEmit` runs, then exit code is 0.
14. Given the code is built, when `npx next lint` runs, then no errors or warnings.
15. Given the code is built, when `npm run test:run` runs, then all tests pass with suite total ≥ 163 across ≥ 23 files.
16. Given the code is built, when `npx next build` runs, then exit code is 0 and the route table is unchanged from `14-minor-rework`.

### Forbidden-pattern compliance
17. Zero `: any`, bare `<a>` for internal routes, bare `<img>` (the new image uses `next/image`), `next/router`, `window.location`, `React.*`, `Readonly<{}>` empty-prop types.

### Code layout
18. Visual rhythm honoured.
