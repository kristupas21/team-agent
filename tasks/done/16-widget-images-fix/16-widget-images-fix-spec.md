# Spec: Widget Images Fix — Card Height and Image Positioning

## Summary
Three Tailwind class updates on `DashboardWidgetCard.tsx`: bump Card height to `h-64`, change image positioning from left/top-anchored to right/top-anchored (`-right-20 top-[15%]`), and grow image width to `w-[30rem]`. Three in-place test-assertion updates mirror the production change. No new files, no new tests, no new behaviour — purely a visual dialling-in step using devtools-confirmed values.

## Assumptions

1. **Card height token**: `h-64` (16rem). Replaces `h-40`.
2. **Image position classes**: `absolute -right-20 top-[15%]`. The image's right edge sits at `-5rem` (5rem past the Card's right edge); the Card's existing `overflow-hidden` crops the overflow.
3. **Image width**: `w-[30rem]` (arbitrary Tailwind value, 30rem ≈ 480 px). Replaces `w-32`.
4. **`left-[60%]` and `top-[50%]` are removed** from the image className.
5. **Unchanged**: blend (`opacity-60 mix-blend-multiply`), hover filter (`group-hover:grayscale group-hover:brightness-150`), transition (`transition`), aspect preservation (`h-auto`), title `<h3>` classes, Card-surface props (`group relative cursor-pointer overflow-hidden transition-colors hover:bg-neutral-900 md:max-w-none`).
6. **Fallback path unchanged**: `DashboardWidgetCard` without `imageKey` still renders title-only with the new `h-64` height.
7. **Test deltas**: 3 in-place assertion updates in `DashboardWidgetCard.test.tsx` (test 7 image positions; test 8 Card height; test 9 fallback Card height). No new cases. Suite total stays at 165 / 23.
8. **No changes** to `widget-images.ts`, `dashboard/page.tsx`, `cat.png`, or any other file.

## Acceptance Criteria

1. `DashboardWidgetCard`'s Card className contains `h-64` (not `h-40`).
2. The image element has classes `absolute`, `-right-20`, `top-[15%]`, `w-[30rem]`.
3. The image element does NOT have `left-[60%]`, `top-[50%]`, or `w-32`.
4. Blend (`opacity-60 mix-blend-multiply`) and hover-filter (`group-hover:grayscale group-hover:brightness-150 transition`) classes still present on the image.
5. Title `<h3>` classes unchanged (`relative z-10 text-lg font-medium text-neutral-900 transition-colors group-hover:text-neutral-50`).
6. Card without `imageKey` still applies `h-64`.
7. `tsc --noEmit`, `next lint`, `test:run`, `next build` all exit 0.
8. Suite total = 165 / 23 (unchanged).
