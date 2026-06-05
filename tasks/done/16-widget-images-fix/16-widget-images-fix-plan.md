# Build Plan: Widget Images Fix

## Overview
Two surgical edits, two test edits. No new files.

## Files to Modify

### `src/components/features/DashboardWidgetCard.tsx`
- Card consumer className: `h-40` → `h-64`.
- Image className: replace `left-[60%] top-[50%] h-auto w-32` with `-right-20 top-[15%] h-auto w-[30rem]`.

### `__tests__/components/features/DashboardWidgetCard.test.tsx`
- Test 7 ("positions the image absolutely at left-[60%] top-[50%]"): rename + assertion update to `absolute`, `-right-20`, `top-[15%]`.
- Test 8 ("applies the fixed h-40 height to the Card surface"): rename `h-40` → `h-64` in title and assertion.
- Test 9 ("does NOT render any image when imageKey is omitted, but still applies the fixed h-40 height"): rename `h-40` → `h-64` in title and assertion.

## Build Order

1. Edit `DashboardWidgetCard.tsx`.
2. Edit `DashboardWidgetCard.test.tsx` (3 in-place updates).
3. Run `tsc --noEmit`, `next lint`, `test:run`, `next build`. All exit 0.
4. Write artefact docs.
