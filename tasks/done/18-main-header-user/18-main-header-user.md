# Main Header Polish — User Info + Mobile-Compact Buttons + Form Layout Tweaks

## Description

Three threads ship together. **(1) Back-button rework**: the header's back button changes from icon-only `secondary` variant to a `ghost` variant with the icon + visible "Back" label on `md+`; on mobile the label collapses to icon-only (saving horizontal space). **(2) Sign Out compact-mobile**: the Sign Out button keeps its label on `md+` but collapses to icon-only on mobile (same pattern). **(3) New user-info block**: visible only when signed in, sitting in the header's right region immediately before Sign Out. Two stacked lines: a small "Signed in as:" caption above the user's name, typography matching the TaskCard's small date row. Tight line-heights keep the header height from growing more than a few pixels. **(4) Off-topic form polish** (per the draft's last section): SignIn, SignUp, Task create, and Task edit form pages get a wider Card on desktop (closer to the mobile breakpoint) and an arbitrary top offset instead of vertical centering (centered forms look adrift on tall screens).

## Scope

### In scope
- `MainHeaderNav.tsx`: back button → ghost + label on md+; Sign Out button → icon-only on mobile; add user-info block.
- The user-info block renders only when `signedIn === true` and `userName` is defined.
- Form pages: `sign-in/page.tsx`, `sign-up/page.tsx`, `dashboard/tasks/new/page.tsx`, `dashboard/tasks/[id]/page.tsx` — widen the Card max-width on desktop and shift vertical positioning from centered to top-offset.
- Tests: update `MainHeaderNav.test.tsx` for the new button shapes + user-info block visibility/copy.

### Out of scope
- Any change to `Button.tsx`, `buttonClass.ts`, or the ghost variant itself.
- Any change to TaskCard, TaskForm, SignInForm, SignUpForm internals.
- Showing the user's email or any field beyond `userName`.
- Avatar / image / icon for the user info block.
- Right-aligned dropdown or any interactive menu on the user info block — it's a static text display.
- New auth surface, new fields on User, model changes, action changes.

## A — Back Button

Current: `variant="secondary"`, icon-only, `aria-label="Back"`.

New: 
- `variant="ghost"`.
- `aria-label="Back"` stays (accessible name on mobile when text is hidden).
- `leftIcon={<MdArrowBack />}` stays.
- Add a `<span className="hidden md:inline">Back</span>` as the button's children — text visible on `md+`, hidden on mobile.

## B — Sign Out Button (mobile-compact)

Current: `variant="primary"`, `leftIcon={<MdLogout />}`, visible text "Sign Out" as children.

New:
- `variant="primary"` (unchanged).
- `leftIcon={<MdLogout />}` (unchanged).
- Add `aria-label="Sign out"` to retain the accessible name on mobile when the text is hidden.
- Wrap children: `<span className="hidden md:inline">Sign Out</span>`.

Note: the Button primitive uses `inline-flex items-center gap-2`. The flex `gap` collapses automatically when a child is `display: none`, so the spacing stays clean in both states.

## C — User Info Block (NEW)

### Visibility
- Renders only when `signedIn === true` AND `userName` is defined.
- Sits in the header's right region, immediately BEFORE the Sign Out button.

### Layout
- A column (`flex flex-col`) of two text lines, right-aligned within the column.
- Tight line-height (`leading-tight` or `leading-none`) so total visual height is ~32–36 px (similar to a button).

### Typography
- **Top line** ("Signed in as:"): small caption, matches the TaskCard date row idiom — `text-xs text-neutral-500` (or `text-sm` if `text-xs` reads too cramped; spec-agent picks).
- **Bottom line** (user's name): same `text-sm` size as nav button text or one notch larger (`text-base`), `font-medium`, `text-neutral-900`. Spec-agent picks the exact combo; aim is "fits in the header without expanding it".

### Copy
- Top line exact text: `"Signed in as:"`.
- Bottom line: the `userName` value verbatim (no truncation in this task; long names just wrap or push left within the column — acceptable).

### A11y
- The block is purely informational. No `role` override. Screen readers announce both lines linearly.

## D — Form Pages: Width + Top-Offset

Affected pages (4):
- `src/app/(main)/(auth)/sign-in/page.tsx`
- `src/app/(main)/(auth)/sign-up/page.tsx`
- `src/app/(main)/(private)/dashboard/tasks/new/page.tsx`
- `src/app/(main)/(private)/dashboard/tasks/[id]/page.tsx`

Each currently uses `<main className="flex min-h-screen items-center justify-center p-4">` containing a `<Card>` (sign-in/sign-up: no width override; task new/edit: `md:max-w-lg`).

### Width
- All four Cards get `md:max-w-2xl` (42rem / ~672 px — close to the `md` breakpoint of 768 px without crowding it). Replaces `md:max-w-lg` on the task pages and adds the override on the auth pages.

### Vertical positioning
- Replace `items-center` (vertical centering) with `items-start` (top alignment).
- Add `pt-20` (5rem) for an explicit top offset. The existing `p-4` covers left/right/bottom (or change to `px-4` if the `pt-20` is meant to be the authoritative top value — spec-agent picks).

### Notes
- The change applies uniformly across all four form pages so the visual rhythm is consistent.
- Reason (per draft): tall screens make centered forms look adrift. A consistent top offset reads as intentional.

## Open Questions

1. **User-info top-line font size** — `text-xs` (12 px) vs `text-sm` (14 px)? Lean: `text-xs`. Matches the small-caption idiom and helps keep header height steady.

2. **User-info bottom-line font size** — `text-sm` vs `text-base`? Lean: `text-sm font-medium`. Matches the existing button text size in the header for visual symmetry.

3. **Form Card width** — `md:max-w-xl` (36rem) vs `md:max-w-2xl` (42rem) vs `md:max-w-3xl` (48rem)? Lean: `md:max-w-2xl`. "Close to mobile breakpoint width" maps to 42rem comfortably.

4. **Top offset** — `pt-16` (4rem) vs `pt-20` (5rem) vs `pt-24` (6rem)? Lean: `pt-20`. Slight offset, not too much.

5. **`p-4` interaction with `pt-20`** — drop `p-4` and replace with `px-4 pt-20`, or layer them (`p-4 pt-20`)? Lean: explicit `px-4 pt-20` for clarity (no overrides).

6. **Long usernames** — overflow handling? Lean: no truncation in this task. Long names wrap or push the left edge of the column. Acceptable for the current usage.

7. **Sign Out button `aria-label`** — `"Sign out"` (sentence-case) vs `"Sign Out"` (title-case)? Lean: `"Sign out"` for screen-reader naturalness. Visible label remains title-cased.

8. **Back button mobile size** — the icon-only variant on mobile may look cramped without text. Test the visual; tweak padding if needed. Lean: no extra padding tweak — the existing Button padding works.

## Tests

`__tests__/components/features/MainHeaderNav.test.tsx` updates:
- Existing back-button cases (presence + click target) still hold; assertions stay.
- Add: "back button is a ghost variant with 'Back' text wrapped in hidden md:inline span" — assert the button has classes from the ghost variant AND that there's a `<span className="hidden md:inline">Back</span>` child.
- Add: "sign-out button text is wrapped in hidden md:inline span" — same assertion shape for the Sign Out button.
- Add: "user-info block renders 'Signed in as:' and the username when signedIn && userName" — pass `signedIn userName="alice"`; assert both lines visible in the DOM.
- Add: "user-info block does NOT render when userName is omitted" — pass `signedIn` without userName; assert no "Signed in as" text.
- Add: "user-info block does NOT render when signedIn is false" — pass `signedIn={false} userName="alice"`; assert no "Signed in as" text.

Test count grows by ~5 cases (15 → 20).

## Done Criteria

- Back button uses ghost variant, shows "Back" text on md+ only, icon-only on mobile.
- Sign Out button shows label on md+ only, icon-only on mobile. `aria-label="Sign out"` ensures accessible name in both states.
- User-info block renders to the right of the nav, just before Sign Out, when signed in. Two stacked lines, matches the typography lean.
- Header height does not visibly expand more than a few pixels.
- All four form pages use `md:max-w-2xl` Card width and an explicit top offset (`pt-20`-ish) instead of vertical centering.
- `tsc --noEmit`, `npx next lint`, `npm run test:run`, `npx next build` all green.
- Test suite ≥ 170 / 23 (was 165 / 23; +5 new MainHeaderNav cases).

## What This Task Does NOT Include

- Any change to `Button.tsx`, `buttonClass.ts`, `Card.tsx`, or other primitives.
- Any change to `MainHeader.tsx` (it already passes `userName` through — `MainHeaderNav` just needs to consume it).
- Avatar / image / icon for the user.
- A dropdown menu / interactive user widget.
- Truncation / ellipsis on long usernames.
- Touching the dashboard widget, TaskCard, TaskForm, SignInForm, or SignUpForm internals.
- New routes, model changes, action changes.
