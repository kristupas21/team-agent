# Widget Background Images on Dashboard Widget Cards

## Description

Dashboard widget cards (`DashboardWidgetCard`) gain a partial background image positioned at the bottom-right of the card. The image starts roughly 60% from the left and 50% from the top, blends visually with the card surface, and stays clearly readable behind the title in both idle and hovered states. The system is extensible: each widget maps to its own image, and adding a new widget means adding one row to a mapping. The first concrete use is the existing "Tasks" widget, which gets `cat.png` (already preprocessed and committed at `public/img/cat.png` — 500×500 PNG, ~287 KB, transparency preserved). The raw source stays at `public/images/cat.png` (gitignored).

## Scope

### In scope
- Modify `DashboardWidgetCard.tsx` to render a partial background image in addition to its current title.
- Introduce a widget-to-image mapping (separate module or a constant) so new widgets can plug in by name/key.
- Wire the Tasks widget to `cat.png`.
- **Fix the widget card's height** to roughly 2× its current single-line-title height. Today the card's height is content-driven (title + `p-6` padding ≈ 72–80 px tall). The new fixed height is approximately 144–160 px — enough vertical space to show the image at the bottom-right without crowding the title at the top-left. Exact px / Tailwind token is a spec-agent decision (see Open Questions).
- Position the image absolutely inside the card surface, bottom-right, starting at approximately `left: 60%` and `top: 50%` (the image's top-left corner at those coordinates relative to the card).
- Apply a blend / opacity treatment so the image visually melts into the card's neutral background (light card surface) without losing contrast.
- Apply a hover-state filter (e.g. grayscale, brightness shift) so the image stays visible against the dark hovered surface (`hover:bg-neutral-900`) without overpowering it.
- Ensure the title text remains fully readable above the image (z-index / stacking order).
- Use `Image` from `next/image` per CLAUDE.md (never bare `<img>`).
- Mark the image as decorative for screen readers (alt text or `aria-hidden`).

### Out of scope
- New widgets beyond Tasks (the mapping is extensible but only Tasks is wired today).
- Image cropping, resizing, or optimization beyond what `next/image` does automatically.
- Animation on the image itself (parallax, scroll-driven, etc.) — only the existing card-hover token set + image filter.
- Light/dark theme switching for the image asset (only one variant of `cat.png` per widget).
- Image lazy-loading customisation (`next/image` defaults apply).
- Any visual change to TaskCard, Card, Button, or other primitives.
- Any model, route, action, or auth change.

## Visual Spec

### Card height (NEW)
- The widget card now has a **fixed height** of roughly 2× the current single-line-title height.
- Today the height is content-driven: a `text-lg` `<h3>` (~24 px line-height) + `p-6` padding (48 px total vertical) = ~72–80 px tall.
- New fixed height: approximately 144–160 px. Exact value is a spec-agent decision; pick the closest standard Tailwind height token (e.g. `h-36` = 144 px, `h-40` = 160 px, `h-44` = 176 px), or an arbitrary value if no token fits the intent cleanly.
- The fixed height applies to ALL widget cards regardless of whether they have an image — keeps the dashboard grid visually consistent as more widgets land.
- The fixed height also stays consistent across breakpoints; the grid's column count changes responsively (`grid-cols-1 md:grid-cols-2`) but each cell's height does not.
- The Card primitive (`src/components/ui/Card.tsx`) is NOT modified — the height comes from the consumer className on the Card inside `DashboardWidgetCard` (additional class like `h-36` joins the existing `group h-full cursor-pointer …` string; `h-full` may be replaced by the fixed token).

### Image positioning
- Container: the existing `Card` rendered by `DashboardWidgetCard`. The Card receives `relative` so absolute positioning works (currently it does not — see Open Questions).
- Image: absolutely positioned. Top-left corner roughly at `left: 60%` and `top: 50%` of the Card's box (the spec-agent picks the exact Tailwind tokens — `left-[60%] top-[50%]` arbitrary values vs. closest standard tokens like `left-3/5`).
- Image occupies the bottom-right area of the card; the title sits at top-left and remains fully visible.
- The image's right edge and bottom edge should align with (or sit just inside) the Card's right and bottom edges respectively — i.e. the image flows toward the bottom-right corner.
- Image dimensions: pick a size that fills the bottom-right ~40% × 50% region of the fixed-height card without overflowing visually. With the new ~144–160 px card height, the image's effective region is roughly 40% × 50% of `(cardWidth × ~150 px)` — concrete pixel dimensions are a spec-agent / builder call based on `cat.png`'s native aspect ratio.

### Blending (idle state, light card surface)
- The image should "blend" with the Card's `bg-neutral-100` light surface — i.e. not look like a hard-edged sticker pasted onto a white background.
- Mechanism options (spec-agent picks):
  - `opacity-50` (or similar) on the `Image` wrapper — straightforward, but the dark parts of `cat.png` still read clearly against the light card.
  - `mix-blend-mode: multiply` — preserves the cat silhouette while darkening only where the image is dark.
  - `mask-image` (radial / linear gradient) for a soft edge fade — most polished, more CSS to write.
- The image must remain "clearly visible" (per the draft). The chosen mechanism must NOT reduce the cat to a barely-perceptible ghost.

### Hover state (dark card surface)
- Card hover already flips background to `bg-neutral-900` via `group-hover:bg-neutral-900` (existing).
- The image needs to remain visible against the dark background. The current blend may not work (e.g. `mix-blend-mode: multiply` against black erases the image).
- Treatment options (spec-agent picks):
  - `group-hover:invert` — flips the image's tonal range so a dark cat becomes light on the now-dark card.
  - `group-hover:grayscale group-hover:brightness-150` — washes out colour and brightens for contrast.
  - `group-hover:opacity-30` — lets the image become a watermark on hover (the draft mentions "greyed-out" as a possibility).
- The draft says: "image should be clearly visible both when hovering and default state". The chosen treatment must satisfy that. A purely "image disappears on hover" treatment is NOT acceptable.

### Stacking order
- Image: `z-0` (or implicit) — sits behind the text.
- Title `<h3>`: above the image — either by being later in the DOM with `position: relative` (block-formatting context), or via explicit `z-10`.
- The Card's `bg-neutral-100` (or `bg-neutral-900` on hover) is the bottom layer; the image is between background and text.

## Widget-to-Image Mapping

The system needs to accommodate future widgets. The mapping shape and location are spec-agent decisions; the brief leans on a separate exported map. Two leading shapes:

### Option A — separate constant module
```ts
// e.g. src/lib/widget-images.ts (or co-located with the component)
export const WIDGET_IMAGES = {
  tasks: { src: '/img/cat.png', alt: '' },
  // future widgets add entries here
} as const

export type WidgetImageKey = keyof typeof WIDGET_IMAGES
```

`DashboardWidgetCard` takes a `imageKey` prop (`WidgetImageKey | undefined`). The Tasks call site passes `imageKey="tasks"`.

### Option B — pass image source directly via prop
```ts
type DashboardWidgetCardProps = Readonly<{
  href: string
  title: string
  image?: { src: string; alt: string }
}>
```

The dashboard page imports and supplies the image inline.

Lean: Option A. A central mapping is the natural extension point for "many widgets in the future" (per the draft). It keeps the component prop surface minimal and the widget→image relationship discoverable. The spec-agent confirms.

## Components

| Name | What changes |
|---|---|
| `DashboardWidgetCard.tsx` | Add `relative` and a fixed-height token (e.g. `h-36` / `h-40`) to the Card's className. Add an `<Image>` element absolutely positioned inside the Card, sourced from the widget-image mapping (or a prop). Add the blend / hover-filter token set. Title gains `relative z-10` (or equivalent) to stay above the image. Props expand by one (the mapping key or the image object — depends on Option A vs. B). |
| `dashboard/page.tsx` | Call-site update: the `<DashboardWidgetCard>` for Tasks gains the new prop (e.g. `imageKey="tasks"`). |
| (potentially new) `widget-images.ts` | Map file — Option A only. Spec-agent picks the path (under `/lib`, `/components/features`, or `/types` — architect decides). |

## Data

No data layer change. No new server actions, no new database fields, no new validation schemas.

## Auth & Middleware

Unchanged.

## Folder / File Touch Points

Rough sketch — architect picks final paths.

```
/public/img
  cat.png                                  ← already preprocessed (500×500, committed)
/public/images
  cat.png                                  ← raw source (gitignored, local-only)

/src
  /components/features
    DashboardWidgetCard.tsx                ← edit: add relative + Image + blend/hover classes
  /app/(main)/(private)
    dashboard/page.tsx                     ← edit: pass image prop
  /lib (or similar)
    widget-images.ts                       ← NEW (Option A only) — widget→image mapping

__tests__
  /components/features
    DashboardWidgetCard.test.tsx           ← edit: render with the image; assert image present + alt + classes
  /lib (Option A only)
    widget-images.test.ts                  ← maybe NEW — assert the mapping has expected entries (minimal value; spec-agent decides if worth writing)
```

## Open Questions

The spec-agent picks defaults and flags assumptions. Many small choices here:

1. **Mapping shape** — Option A (separate constant module + key prop) vs. Option B (inline image-object prop). Lean: Option A. Future widgets plug in by adding one row.

2. **Mapping file location** — `src/lib/widget-images.ts` vs. `src/components/features/widget-images.ts` (co-located) vs. `src/types/widget-images.ts` (if mostly types). Lean: `src/lib/widget-images.ts` (the mapping is config-like, not component logic).

3. **Position values** — exact Tailwind tokens for `left: 60%, top: 50%`. Options: arbitrary `left-[60%] top-[50%]`, or closest standard tokens (`left-3/5` doesn't exist but `left-1/2 top-1/2` does — wrong percentages). Lean: arbitrary `left-[60%] top-[50%]` for precision (allowed by CLAUDE.md when there's no token alternative).

4. **Image dimensions** — `next/image` requires `width` + `height`. Set to `cat.png`'s native dimensions, or rescale via fixed `width={...} height={...}` props? Lean: explicitly pick a target size that visually fills the bottom-right region (e.g. 160×160). The spec-agent picks the exact dimensions after eyeballing `cat.png`'s native aspect ratio.

5. **Blend mechanism (idle)** — `opacity-50` vs. `mix-blend-mode: multiply` (via Tailwind's `mix-blend-multiply`) vs. `mask-image` gradient. Lean: `opacity-60` + `mix-blend-multiply` combined — straightforward, no custom CSS, matches the "blend in" intent.

6. **Hover treatment** — `group-hover:invert` vs. `group-hover:grayscale group-hover:brightness-150` vs. `group-hover:opacity-30`. The draft says "we could use filters maybe on hover, so image would be greyed-out or smth". Lean: `group-hover:grayscale group-hover:brightness-150` — desaturates and lightens. Visible against dark card, doesn't lose the cat shape.

7. **Title stacking** — `relative z-10` on the `<h3>` vs. wrapping image in a `z-0` div and letting natural stacking handle it. Lean: explicit `relative z-10` on the title — most defensive, clearest intent.

8. **Image alt text** — empty string (`alt=""`) marking it decorative vs. a descriptive alt ("Cat illustration"). The image IS decorative (background flavour, not content). Lean: empty string. Avoid `aria-hidden` on the `<Image>` itself — `alt=""` is the canonical decorative pattern.

9. **Widget without an image** — should `DashboardWidgetCard` still render correctly when no image is mapped (or when `imageKey` is omitted)? Lean: yes — image is optional. The card falls back to the current title-only render. Future widgets without images stay legitimate.

10. **`relative` placement on the Card** — pass via the consumer className from `DashboardWidgetCard` (so it doesn't leak into the `Card` primitive's API). Lean: yes — consumer-className `relative` joins the existing `group h-full cursor-pointer …` string.

11. **Test scope** — `DashboardWidgetCard.test.tsx` needs new assertions: image renders, `alt=""`, absolute positioning class set, blend tokens, hover-filter tokens. Optional: a test asserting the widget falls back to no-image when `imageKey` is omitted. Lean: include the fallback test (it documents the optional behaviour).

12. **`cat.png` dimensions** — the preprocessed file at `public/img/cat.png` is exactly **500 × 500 px**. Builder uses those as the `<Image width={...} height={...}>` props (or rescales smaller via display-size CSS while keeping the source dimensions for `next/image`'s aspect-ratio reservation).

13. **Fixed card height — exact Tailwind token** — the new height is "roughly 2× the current single-line-title height". Concrete options:
    - `h-36` (144 px) — tight; image fits but breathing room is minimal.
    - `h-40` (160 px) — comfortable; slightly more space than ~2× current.
    - `h-44` (176 px) — generous; closer to ~2.2× current.
    - Arbitrary `h-[150px]` — most-faithful to "2× current ~75 px" but custom.
    Lean: `h-40` (160 px). Standard Tailwind token; gives clean breathing room for the bottom-right image without feeling cavernous. The spec-agent confirms after eyeballing.

14. **Does the fixed height apply to widgets WITHOUT an image?** — Today only Tasks has an image; future widgets may or may not. Lean: yes — the fixed height applies uniformly so the dashboard grid stays visually consistent. A title-only widget with the same fixed height has more empty space, which is acceptable.

## Done Criteria

- `DashboardWidgetCard` has a fixed height (~144–160 px, exact token picked by the spec-agent) regardless of whether an image is mapped, and the height stays consistent across breakpoints.
- `DashboardWidgetCard` renders a partial background image positioned at bottom-right when an image is mapped for the widget.
- The Tasks widget on `/dashboard` shows `cat.png` at bottom-right of the card, starting around 60% from the left and 50% from the top.
- The image is visually blended with the light idle card surface — it does NOT look like a hard-edged sticker.
- The image remains clearly visible on hover (when the card surface is `neutral-900`) — a filter / treatment ensures contrast.
- The title text stays fully readable in both idle and hover states.
- The image is marked as decorative for screen readers (`alt=""`).
- The widget-image mapping is structured so adding a future widget is a one-row addition.
- A widget without an image mapping continues to render correctly as a title-only card.
- `tsc --noEmit`, `npx next lint`, `npm run test:run`, `npx next build` all green.
- `DashboardWidgetCard.test.tsx` covers: image renders with the mapped source + alt, position classes present, blend / hover filter tokens present, fallback (no image) still renders.

## What This Task Does NOT Include

- Adding any new widget (the mapping is extensible; only Tasks is wired).
- Changing the `Card` primitive's API.
- Changing the dashboard page beyond the one prop addition.
- Changing TaskCard, TaskForm, or any other component.
- Server / DB / route / auth changes.
- A dark / light theme variant for the image asset.
- Additional image preprocessing for `cat.png`. It has already been compressed and resized (4.3 MB → 287 KB, 3000×3000 → 500×500) and committed to `public/img/cat.png` as part of brief preparation. The raw source remains at `public/images/cat.png` (gitignored). No further preprocessing is part of this task.
