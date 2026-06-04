# Spec: Design Updates — Retro-Futuristic

## Summary
A coordinated visual refresh of every screen the user touches plus two new system pages (`error.tsx`, `not-found.tsx`). Eight threads land in one task:

1. **Font** swaps to `Oleo Script Swash Caps` — used as a *display* font for headings only, paired with `Jost` (the current font) for body and form text. See Assumption 1 — global Oleo would be unreadable on inputs/labels/error text.
2. **Palette** swaps to a retro-futuristic earthy-warm set. 5 tokens, same names, locked hexes in Assumption 4.
3. **Surface** shifts from cool off-white to a warmer cream via the new `neutral-50` (`#f5efe1`). Card background changes to a slightly lighter cream (`#fbf7eb`) to read as a surface against the page.
4. **Card removed** from Home and Dashboard — open, airy layout. **Card retained** for Sign-In and Sign-Up forms.
5. **Material icons** introduced via `react-icons/md`. Specific picks locked in Assumption 11.
6. **`Button.leftIcon` / `rightIcon` props** — new optional API. Icons hidden during `loading`.
7. **Hover effect**: darken-by-step approach kept (`hover:bg-primary-700`). Underline rejected per Assumption 12.
8. **`error.tsx` and `not-found.tsx`** at root, with the rest of the app moved inside a `(main)` route group so error/not-found render headerless.

Plus: all UI primitives and feature components get a styling pass to match. `Button` is the only API change. Existing 87 tests stay green; the `Button` test file gains 4 new cases for the icon props (suite grows to ~91).

## Assumptions

1. **Font pairing**, NOT a global Oleo swap. The user named Oleo Script Swash Caps but global usage would make form inputs and danger text unreadable. The compromise:
   - `Oleo Script Swash Caps` loaded as `--font-oleo` and exposed via a new Tailwind utility class `font-display`.
   - `Jost` (current) stays as `--font-jost` and remains the body font via `font-sans`.
   - **Where Oleo is used**: all `<h1>` headings only — the Home, Dashboard, error, and not-found pages plus the page-level titles on Sign-In and Sign-Up. The convention: any `<h1>` gets `className="... font-display"`, every other text element keeps `font-sans` (the default body font).
   - **Where Oleo is NOT used**: paragraphs, labels, inputs, buttons, error messages, the header's button labels.
   - This is the cleanest reading of "replace current font with Oleo" — Oleo carries the retro-futuristic visual identity on the loudest text element on each page, while everything else stays readable.

2. **Tailwind `fontFamily` extends with two entries**:
   - `sans: ['var(--font-jost)', 'ui-sans-serif', 'system-ui', 'sans-serif']` — body, default.
   - `display: ['var(--font-oleo)', 'cursive']` — heading-only utility class `font-display`.

3. **Both fonts loaded via `next/font/google`** in `src/app/layout.tsx`:
   - `Jost`: `subsets: ['latin']`, `variable: '--font-jost'`, `display: 'swap'`, `weight: ['400', '500']`.
   - `Oleo_Script_Swash_Caps` (note the Next.js export name uses underscores): `subsets: ['latin']`, `variable: '--font-oleo'`, `display: 'swap'`, `weight: ['400', '700']`. Two weights so headings can have weight options later.
   - The `<html>` element receives both class variables: `className={cn(jost.variable, oleo.variable)}`.

4. **Palette (locked)**:

   | Token | Step | Hex | Role |
   |---|---|---|---|
   | `primary` | 50  | `#e3eaea` | Muted retro teal — warmth + cool offset against the cream surface. |
   | `primary` | 500 | `#3c7e7e` |
   | `primary` | 700 | `#2c5f5f` |
   | `secondary` | 50  | `#f9e2d3` | Dusty orange — 70s lounge accent. |
   | `secondary` | 500 | `#d97e4b` |
   | `secondary` | 700 | `#a85d33` |
   | `neutral` | 50  | `#f5efe1` | Warm cream surface — the page background. |
   | `neutral` | 200 | `#e6dcc6` | Surface accent + Card borders. |
   | `neutral` | 500 | `#8a7d63` | Body paragraph text muted. |
   | `neutral` | 700 | `#4a4030` | Body text. |
   | `neutral` | 900 | `#2a2418` | Heading text (when not Oleo). |
   | `danger` | 50  | `#f3dcce` | Muted vermilion — error states. |
   | `danger` | 500 | `#b8543b` |
   | `danger` | 700 | `#8a3e2a` |
   | `success` | 50  | `#e4e6cc` | Olive sage — positive states. |
   | `success` | 500 | `#8a8a3e` |
   | `success` | 700 | `#666627` |

   Override any single hex during the spec-pause if it doesn't sit right.

5. **`Card` surface** changes from `bg-white` to `bg-[#fbf7eb]` — a slightly lighter cream than the page background (`#f5efe1`). This reads as a surface lifted above the page without using a shadow. **Implementation note**: instead of an arbitrary `bg-[#fbf7eb]` value, the spec adds a sixth `neutral` step at index `100` with hex `#fbf7eb` so the Card can use the named utility `bg-neutral-100`. The architect adds the step in `tailwind.config.ts`. (Naming exception — the project's neutral scale otherwise uses `50, 200, 500, 700, 900`; adding `100` is acceptable for this design need.)
   Card border stays `border-neutral-200` (now `#e6dcc6` — warm tan).

6. **Surface for the page background** stays `bg-neutral-50` on `<body>` — but the hex resolves to the new cream `#f5efe1` automatically via the Tailwind palette update. No class change in `layout.tsx`.

7. **Card removed from Home and Dashboard**. Home and Dashboard render their heading + paragraph inside a centred wrapper with a vertical `space-y-6` rhythm. The wrapping `<main className="flex min-h-screen items-center justify-center p-4">` stays — only the `<Card>...</Card>` wrap is removed. The content `<div className="text-center">` stays for centring.

8. **Card retained on Sign-In and Sign-Up pages.** The form's visual containment improves usability — keeping the Card. No change to those pages' content structure.

9. **`react-icons` dep added.** Per-icon imports from `react-icons/md`. Tree-shakable; only the icons used in this task ship in the bundle.

10. **`Button.leftIcon` / `rightIcon` props (new API)**:
    ```ts
    type ButtonProps = Readonly<
      Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
        children?: ReactNode      // now optional — for icon-only buttons
        variant?: ButtonVariant
        loading?: boolean
        leftIcon?: ReactNode
        rightIcon?: ReactNode
      }
    >
    ```
    Render logic:
    - When `loading` is true: icons are hidden; the children slot renders the literal `"Loading..."`. (Matches existing loading behaviour.)
    - When `loading` is false: render `[leftIcon] [children] [rightIcon]` in a horizontal row with `gap-2` between elements.
    - `children` is now optional. An icon-only button has `leftIcon` set and `children` omitted (and is expected to set `aria-label`).
    - The base classes get a `gap-2` so icon-text spacing flows from utility classes.

11. **Material icon picks (locked)**:
    - Back: `MdArrowBack` from `react-icons/md`. Used icon-only with `aria-label="Back"`.
    - Sign In (`Link` and disabled `Button`): `MdLogin`. Used as `leftIcon`.
    - Sign Up (`Link` and disabled `Button`): `MdPersonAdd`. Used as `leftIcon`.
    - Sign Out (`<form>` button): `MdLogout`. Used as `leftIcon`.
    - Error page and Not-Found page: no icons on the "Go home" button — keep them as primary `Button`s with text only. (Architect may add `MdHome` if it feels right.)

12. **Hover effect**: darken-by-step approach KEPT. The existing variant classes already have `hover:bg-primary-700` / `hover:bg-secondary-700` / `hover:bg-danger-700`. With the new palette, the `-500` → `-700` shift is visible (teal: `#3c7e7e` → `#2c5f5f`, dusty orange: `#d97e4b` → `#a85d33`, vermilion: `#b8543b` → `#8a3e2a`). No underline added — fights the retro vibe.

13. **Disabled-link Sign In / Sign Up in the header** uses the `Button` component with `disabled` and a `leftIcon`. Same visual treatment as the enabled `<Link>` because both go through `buttonClass()` styling.

    For the enabled `<Link>` cases, the icon needs to render inside the link's anchor. Since `<Link>` renders an `<a>` with a `className`, we add the icon as a child of the Link element: `<Link href="/sign-in" className={buttonClass('primary')}><MdLogin /> Sign In</Link>`. The `buttonClass` base already includes `inline-flex items-center justify-center gap-2`, so this works without further changes. The `gap-2` is added to the base via the next bullet.

14. **`buttonClass` base classes** get `gap-2` added so icon-spacing flows from the utility. The full base becomes:
    ```
    inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60
    ```
    All other classes unchanged.

15. **Card classes** become:
    ```
    w-full rounded-lg border border-neutral-200 bg-neutral-100 p-6 md:max-w-md
    ```
    (was `bg-white` → `bg-neutral-100`). The remaining classes are unchanged.

16. **Route group restructure for header suppression**: introduce `(main)` route group. Final source tree:

    ```
    src/app/
      layout.tsx                 (no MainHeader — minimal shell)
      error.tsx                  (new — no MainHeader)
      not-found.tsx              (new — no MainHeader)
      api/auth/[...nextauth]/route.ts  (unchanged, parent-of-(main))
      (main)/
        layout.tsx               (new — mounts MainHeader)
        page.tsx                 (home — moved from src/app/page.tsx; Card removed)
        (auth)/
          sign-in/page.tsx       (unchanged content)
          sign-up/page.tsx       (unchanged content)
        (private)/
          dashboard/page.tsx     (Card removed; otherwise unchanged)
    ```

    The `(main)` group has its own `layout.tsx` that renders `<MainHeader />` above `{children}`. Route-group folder names (parentheses) don't appear in URLs, so middleware matcher patterns continue to work unchanged.

    **`src/app/api/auth/[...nextauth]/route.ts` stays at `src/app/api/...`** — API routes don't go inside the `(main)` group because they have no UI. They're already unwrapped by any layout.

17. **`error.tsx`** is a client component (Next.js requirement). Renders:
    - `<h1 className="text-4xl font-display text-neutral-900">Something went wrong</h1>`
    - `<p className="mt-4 text-base text-neutral-500 max-w-md text-center">Please try again, or go back to the start.</p>`
    - A primary `<Link href="/">` styled via `buttonClass('primary')` with label `"Go home"`. Sits below the paragraph.
    - The whole content sits in `<main className="flex min-h-screen items-center justify-center p-4">` with an inner centred `<div className="text-center space-y-6">`.
    - No "Try again" button (`reset()` not used in this iteration — keep simple).
    - Component accepts the `{ error, reset }` props from Next.js but does not use them; both are typed.

18. **`not-found.tsx`** is a server component. Renders:
    - `<h1 className="text-4xl font-display text-neutral-900">Not found</h1>`
    - `<p className="mt-4 text-base text-neutral-500 max-w-md text-center">We couldn't find that page.</p>`
    - A primary `<Link href="/">` styled via `buttonClass('primary')` with label `"Go home"`.
    - Same wrapper layout as `error.tsx`.

19. **"Go home" button text is identical** on both pages, both link to `/`. Middleware bounces signed-in users to `/dashboard` automatically. No conditional rendering based on session.

20. **MainHeader and MainHeaderNav** unchanged at the API level. The header's surface (`bg-white` → `bg-neutral-100`) and the bottom border (`border-neutral-200` — same name, new hex) flow through automatically. The Back button changes from text to icon-only:
    `<Button type="button" variant="secondary" aria-label="Back" leftIcon={<MdArrowBack />} onClick={() => router.back()} />`
    The Sign In, Sign Up, Sign Out elements gain their respective `leftIcon` per Assumption 11.

21. **Form components (`SignInForm`, `SignUpForm`)** are unchanged at the layout level. The submit `<Button>` does NOT get an icon — keep them text-only inside forms for clarity. Spec-agent's call: forms are about typing; an icon on submit feels redundant.

22. **No middleware changes.** The matcher patterns `['/dashboard/:path*', '/', '/sign-in', '/sign-up']` continue to match the same URLs after the route-group restructure. Verified by code inspection — the URL paths don't change.

23. **Tests**:
    - `__tests__/components/ui/Button.test.tsx` gains 4 new cases:
      1. `leftIcon` renders before `children`.
      2. `rightIcon` renders after `children`.
      3. Icon-only button (no `children`) renders the icon and accepts `aria-label`.
      4. When `loading={true}`, neither `leftIcon` nor `rightIcon` renders, and the button text is `"Loading..."`.
    - `__tests__/components/features/MainHeaderNav.test.tsx` — the existing 9 cases still pass. The Back button assertion changes from `getByRole('button', { name: /back/i })` (label text) to `getByRole('button', { name: /back/i })` (the `aria-label`). The name selector accepts the accessible name from either the visible text OR the `aria-label`, so the existing assertion continues to work.
    - No new test files. `error.tsx` and `not-found.tsx` are simple markup; per Testing Rules they don't need tests.
    - Existing 87 tests + 4 new Button cases = **91 tests across 13 files**.

24. **No CLAUDE.md or `agents/*` changes.** The font-pairing pattern (`font-display` for headings) could justify a CLAUDE.md note, but it's specific to this design pass and may not generalise. Leave as-is.

25. **No middleware mock changes, no Vitest config changes, no env changes.**

## Open Questions

1. **Font pairing model** — Assumption 1 splits Oleo for headings + Jost for body. If the user wants Oleo applied globally (and accepts that inputs / labels / error text will be hard to read), say so and the spec drops `font-display` and points `font-sans` at Oleo. Default: split.

2. **Palette hexes** — Assumption 4 locks 17 hex values. Override any single hex by naming the token + step during the spec-pause (e.g. "primary-500 more saturated, try `#2f6a6a`"). Default: ship as locked.

3. **"Go home" button copy** — "Go home" assumed. Alternatives: "Go to start", "Back to home", "Return to start". Affects two files. Preference-driven.

## Routes / Pages

| Path | File | Title | Purpose |
|---|---|---|---|
| `/` (modify) | `src/app/(main)/page.tsx` (moved + modified) | unchanged | Home, no `<Card>`, open layout. Heading uses `font-display`. |
| `/sign-in` (modify) | `src/app/(main)/(auth)/sign-in/page.tsx` (moved) | unchanged | Content unchanged. Card retained. |
| `/sign-up` (modify) | `src/app/(main)/(auth)/sign-up/page.tsx` (moved) | unchanged | Same. |
| `/dashboard` (modify) | `src/app/(main)/(private)/dashboard/page.tsx` (moved + modified) | unchanged | No `<Card>`, open layout. Heading uses `font-display`. |
| (Next error boundary) | `src/app/error.tsx` (new) | n/a | Client error boundary; new design; no `MainHeader`. |
| (404) | `src/app/not-found.tsx` (new) | n/a | Not-found page; new design; no `MainHeader`. |
| (none) | `src/app/(main)/layout.tsx` (new) | n/a | Mounts `<MainHeader />` for all pages inside `(main)`. |

No URL changes. No new public routes.

## Data

### Data Types
```ts
// src/components/ui/Button.tsx — extended
type ButtonVariant = 'primary' | 'secondary' | 'danger'

export type ButtonProps = Readonly<
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    children?: ReactNode
    variant?: ButtonVariant
    loading?: boolean
    leftIcon?: ReactNode
    rightIcon?: ReactNode
  }
>
```

### API Endpoints
None added or changed.

### Dependencies (added)
- `react-icons` (^5.x or latest). Per-icon imports from `react-icons/md` keep the bundle small.

### Environment Variables
None added.

## Components

| Name | Type | Purpose | Change |
|---|---|---|---|
| `Button` | client | UI primitive | New `leftIcon` / `rightIcon` props. `children` becomes optional. Loading hides icons. |
| `Input` | client | UI primitive | No API change. New palette classes flow through Tailwind. |
| `Card` | server | UI primitive | Surface class changes from `bg-white` to `bg-neutral-100`. No API change. |
| `MainHeader` | server | Feature | Surface and border classes flow through new palette. No API change. |
| `MainHeaderNav` | client | Feature | Back is icon-only with `aria-label`. Sign In / Up / Out get `leftIcon`. |
| `SignInForm` | client | Feature | Visual flow-through. No structural change. Submit `Button` stays text-only. |
| `SignUpForm` | client | Feature | Same. |
| `HomePage` | server | Page | `<Card>` removed. Heading uses `font-display`. |
| `DashboardPage` | server | Page | `<Card>` removed. Heading uses `font-display`. |
| `SignInPage` | server | Page | Path moves to `(main)/(auth)/sign-in/page.tsx`. Content unchanged. |
| `SignUpPage` | server | Page | Same. |
| `RootLayout` | server | Layout | Minimal shell. No `MainHeader`. Loads both fonts. |
| `MainLayout` (new) | server | Layout | `src/app/(main)/layout.tsx`. Mounts `<MainHeader />` above `{children}`. |
| `ErrorPage` (new) | client | Page | `src/app/error.tsx`. Headerless. |
| `NotFoundPage` (new) | server | Page | `src/app/not-found.tsx`. Headerless. |

## User Interactions

### Signed-out user lands on `/` (open Home)
1. Browser GET `/`. Root layout renders the html/body shell with the new cream background.
2. `(main)/layout.tsx` mounts `<MainHeader>`. Header reads `auth() === null` → `MainHeaderNav` renders the signed-out branch: enabled Sign In + Sign Up `<Link>`s with their `leftIcon`s (`MdLogin`, `MdPersonAdd`).
3. Home page renders: heading "Hello there" in Oleo, paragraph "Please sign in to continue." in Jost, no Card wrapping.
4. User clicks Sign In in the header → navigates to `/sign-in`.

### Signed-in user lands on `/dashboard` (open Dashboard)
1. Header renders Sign Out only (icon-only Back hidden on `/dashboard`).
2. Dashboard page renders: heading "Welcome, admin." in Oleo, paragraph "You're signed in." in Jost, no Card.
3. User clicks Sign Out → server action runs → cookie cleared → redirected to `/`.
4. Signed-out home renders.

### Browser hits a non-existent route, e.g. `/no-such-page`
1. Next.js serves `src/app/not-found.tsx`. The root layout wraps it (no header).
2. Page renders: heading "Not found" in Oleo, paragraph in Jost, primary "Go home" `<Link href="/">` styled via `buttonClass`.
3. User clicks "Go home" → GET `/` → middleware sees `req.auth` state → signed-out lands on `/`, signed-in bounces to `/dashboard`. Same button text either way.

### A server component throws
1. Next.js catches at the nearest error boundary. The root `error.tsx` handles it.
2. Root layout wraps it (no header).
3. Page renders: heading "Something went wrong" in Oleo, paragraph in Jost, "Go home" Link.

### Sign-in flow (visual change only, behaviour unchanged)
1. User on `/sign-in` sees the form inside the existing `<Card>` (now `bg-neutral-100`).
2. Submit `<Button>` is text-only ("Sign In"). No icon.
3. Header's Sign In button is disabled with `leftIcon={<MdLogin />}`. Sign Up is enabled.
4. On valid credentials, redirected to `/dashboard`. Open layout with Oleo heading.

### Hover state on any auth button
1. User hovers a primary button. Background shifts from `primary-500` (`#3c7e7e`) to `primary-700` (`#2c5f5f`). Visible darkening; no underline.
2. Same pattern for secondary (Back) and danger variants.

## States

### Home (`/`) — signed-out
- Wrapper: `<main className="flex min-h-screen items-center justify-center p-4">`.
- Inner: `<div className="text-center space-y-6">`.
- Heading: `<h1 className="text-4xl font-display text-neutral-900">Hello there</h1>`.
- Paragraph: `<p className="text-base text-neutral-500">Please sign in to continue.</p>` (note: `mt-4` removed in favour of the wrapper's `space-y-6`).
- No buttons (they live in the header).

### Dashboard (`/dashboard`) — signed-in
- Same wrapper + inner structure.
- Heading: `<h1 className="text-4xl font-display text-neutral-900">Welcome, ${name}.</h1>`.
- Paragraph: `<p className="text-base text-neutral-500">{"You're signed in."}</p>`.
- No buttons (Sign Out is in the header).

### Sign-in / Sign-up pages — unchanged content
- Same `<main>` wrapper.
- `<Card>` wraps the form. Card surface is now `bg-neutral-100`.
- Form content unchanged.

### Error page (`error.tsx`)
- Wrapper: `<main className="flex min-h-screen items-center justify-center p-4">`.
- Inner: `<div className="text-center space-y-6">`.
- Heading: `<h1 className="text-4xl font-display text-neutral-900">Something went wrong</h1>`.
- Paragraph: `<p className="text-base text-neutral-500 max-w-md">Please try again, or go back to the start.</p>`.
- `<Link href="/" className={buttonClass('primary')}>Go home</Link>`.
- No `MainHeader`.

### Not-Found page (`not-found.tsx`)
- Same wrapper + inner structure.
- Heading: `<h1 className="text-4xl font-display text-neutral-900">Not found</h1>`.
- Paragraph: `<p className="text-base text-neutral-500 max-w-md">We couldn't find that page.</p>`.
- `<Link href="/" className={buttonClass('primary')}>Go home</Link>`.
- No `MainHeader`.

### Header — Back button (icon-only)
- Wrapper element: `<Button type="button" variant="secondary" aria-label="Back" leftIcon={<MdArrowBack />} onClick={() => router.back()} />`.
- No visible text. The icon is the visible content. The accessible name comes from `aria-label`.
- Same disabled/hover behaviour as before.

### Header — Sign In / Up / Out buttons with icons
- Sign In `<Link>` (enabled): `<Link href="/sign-in" className={buttonClass('primary')}><MdLogin /> Sign In</Link>`.
- Sign In `<Button>` (disabled): `<Button type="button" variant="primary" disabled leftIcon={<MdLogin />}>Sign In</Button>`.
- Sign Up `<Link>` / `<Button>`: same shape with `MdPersonAdd` and `Sign Up`.
- Sign Out `<form><Button>`: `<Button type="submit" variant="primary" leftIcon={<MdLogout />}>Sign Out</Button>`.
- All icons sit to the left of the label with `gap-2` from the base classes.

### Button loading state
- `loading={true}` causes the button to:
  - Set `disabled` to true.
  - Set `aria-busy="true"`.
  - Hide `leftIcon` and `rightIcon`.
  - Render the label `"Loading..."`.

## Acceptance Criteria

### Font
1. Given `src/app/layout.tsx`, when read, then it imports `Jost` and `Oleo_Script_Swash_Caps` from `next/font/google` with `variable: '--font-jost'` and `variable: '--font-oleo'` respectively. The `<html>` element has both class variables applied via `cn(jost.variable, oleo.variable)`.
2. Given `tailwind.config.ts`, when read, then `theme.extend.fontFamily` contains `sans: ['var(--font-jost)', ...]` and `display: ['var(--font-oleo)', 'cursive']`.
3. Given the running app, when a heading on the Home, Dashboard, error, or not-found page is inspected, then its computed `font-family` starts with `Oleo Script Swash Caps`.
4. Given the same app, when a paragraph / input / button label is inspected, then its computed `font-family` starts with `Jost`.

### Palette
5. Given `tailwind.config.ts`, when read, then `theme.extend.colors` declares exactly the keys `primary`, `secondary`, `neutral`, `danger`, `success`. `neutral` has 6 steps: `50`, `100`, `200`, `500`, `700`, `900`. The other four tokens each have 3 steps: `50`, `500`, `700`. Hexes match Assumption 4 + Assumption 5.
6. Given the compiled CSS after `npx next build`, when grep'd for `bg-primary-500`, then it contains `rgb(60 126 126)` (= `#3c7e7e`).
7. Given the compiled CSS, when grep'd for `bg-neutral-100`, then it contains `rgb(251 247 235)` (= `#fbf7eb`).

### Card surface
8. Given `src/components/ui/Card.tsx`, when read, then its base class string contains `bg-neutral-100` (not `bg-white`).
9. Given the running app, when a `Card` is inspected, then its computed background is `#fbf7eb`.

### Card removal — Home and Dashboard
10. Given `src/app/(main)/page.tsx`, when read, then it does NOT import `Card` and does NOT render a `<Card>` element. Heading and paragraph render directly inside a centred wrapper with `space-y-6`.
11. Given `src/app/(main)/(private)/dashboard/page.tsx`, when read, then it does NOT import `Card` and does NOT render a `<Card>` element. Heading + paragraph render with `space-y-6`.
12. Given `src/app/(main)/(auth)/sign-in/page.tsx`, when read, then it DOES still import `Card` and render `<Card>` wrapping the form.
13. Given `src/app/(main)/(auth)/sign-up/page.tsx`, when read, then same — `<Card>` retained.

### Material icons
14. Given `package.json`, when read, then `react-icons` is in `dependencies`.
15. Given `src/components/features/MainHeaderNav.tsx`, when read, then it imports `MdArrowBack`, `MdLogin`, `MdPersonAdd`, `MdLogout` from `react-icons/md`. Each icon is used in the corresponding spot per Assumption 11.

### Button icon props
16. Given `src/components/ui/Button.tsx`, when read, then `ButtonProps` declares optional `leftIcon?: ReactNode`, `rightIcon?: ReactNode`, and `children?: ReactNode` (now optional). The render logic places `leftIcon` before `children` and `rightIcon` after `children`.
17. Given a `<Button leftIcon={<MdLogin />}>Sign In</Button>`, when rendered, then the button DOM contains the icon (an `<svg>` from react-icons) before the text "Sign In", both inside the `<button>`.
18. Given a `<Button rightIcon={<X />}>Continue</Button>`, when rendered, the icon appears after the text.
19. Given an icon-only `<Button leftIcon={<MdArrowBack />} aria-label="Back" />` (no children), when rendered, then the button has accessible name "Back" and the icon is the only visible content.
20. Given `<Button loading leftIcon={<X />} rightIcon={<Y />}>Submit</Button>`, when rendered, then NEITHER `<X />` NOR `<Y />` is in the DOM. The button text is `"Loading..."`.

### Header Back button
21. Given `MainHeaderNav` on `/sign-in`, when the header renders, then the Back element is an icon-only `<Button>` with `aria-label="Back"` containing an `<svg>` from `MdArrowBack`. No visible "Back" text.

### Header auth buttons with icons
22. Given `MainHeaderNav` on `/` (signed-out), when the header renders, then the Sign In `<Link>` contains an `<svg>` from `MdLogin` before the text "Sign In". The Sign Up `<Link>` contains an `<svg>` from `MdPersonAdd` before "Sign Up".
23. Given `MainHeaderNav` on `/sign-in` (signed-out), when the header renders, then the disabled Sign In `<Button>` has `leftIcon={<MdLogin />}` and the enabled Sign Up `<Link>` has the `MdPersonAdd` icon.
24. Given `MainHeaderNav` signed-in, when the header renders, then the Sign Out `<Button>` has `leftIcon={<MdLogout />}` and contains the icon SVG.

### Hover effect
25. Given the compiled CSS, when grep'd for `.hover\\:bg-primary-700`, then a rule exists mapping it to the new primary-700 hex.
26. Given the running app, when a primary button is hovered, then the background visibly darkens from `#3c7e7e` to `#2c5f5f`. (Visual; verified by inspection.)

### Route group restructure
27. Given the source tree, when listed, then `src/app/(main)/layout.tsx`, `src/app/(main)/page.tsx`, `src/app/(main)/(auth)/sign-in/page.tsx`, `src/app/(main)/(auth)/sign-up/page.tsx`, and `src/app/(main)/(private)/dashboard/page.tsx` all exist. The previously-existing files at `src/app/page.tsx`, `src/app/(auth)/...`, and `src/app/(private)/...` are GONE.
28. Given `src/app/(main)/layout.tsx`, when read, then it imports `MainHeader` from `@/components/features/MainHeader` and renders `<MainHeader />` above `{children}`.
29. Given `src/app/layout.tsx`, when read, then it does NOT import or render `MainHeader`. It only sets up `<html>`, `<body>`, and loads the two fonts.
30. Given the URLs `/`, `/sign-in`, `/sign-up`, `/dashboard`, when hit, then they resolve to the moved files (route group folder names are erased from URLs).

### Error and Not-Found
31. Given `src/app/error.tsx`, when read, then it starts with `'use client'`, accepts `{ error, reset }: { error: Error & { digest?: string }; reset: () => void }`, renders a centred `<main>` containing a heading "Something went wrong" in `font-display`, a paragraph, and a `<Link href="/">` styled via `buttonClass('primary')` with text "Go home".
32. Given `src/app/not-found.tsx`, when read, then it is a default-exported server component rendering the same layout shape as `error.tsx` with heading "Not found" and the "Go home" link.
33. Given the running app, when an unknown URL like `/no-such-page` is hit, then `not-found.tsx` renders WITHOUT `MainHeader`. The HTML does NOT contain a `<header>` element from `MainHeader`.
34. Given a thrown error in a server component, when caught, then `error.tsx` renders WITHOUT `MainHeader`.
35. Given the "Go home" button on either page is clicked, when the user is signed-out, then the browser lands on `/` (signed-out home). When the user is signed-in, middleware redirects them to `/dashboard`. Button text is "Go home" in both cases.

### Middleware unchanged
36. Given `src/middleware.ts`, when read, then it is byte-identical to its previous version (matcher and decision logic unchanged).
37. Given `src/lib/redirect-rules.ts`, when read, then it is byte-identical to its previous version.

### Tests
38. Given `__tests__/components/ui/Button.test.tsx`, when read, then it contains at least four new test cases covering the `leftIcon`, `rightIcon`, icon-only, and `loading`-hides-icons behaviours described under Acceptance Criteria 17–20.
39. Given `npm run test:run`, when run, then it exits 0 and reports **91 tests across 13 files** (87 previous + 4 new). All existing tests continue to pass without modification.

### Build & quality
40. Given `tsc --noEmit`, `npm run lint`, `npm run test:run`, `npx next build`, when each is run, then each exits 0. `next build` route table contains the same URLs as before plus the new error and not-found generated entries.
41. Given `mcp__ide__getDiagnostics`, when called, then no diagnostics appear in any source or test file.

### Forbidden-pattern compliance
42. Given the codebase, when grep'd, then no `: any`, no bare `<a>` for internal routes, no `<img>`, no `next/router`, no `window.location`, no `React.*` namespace references, no `Readonly<{}>` empty type. `'use client'` count is 6 (the existing 5 plus the new `src/app/error.tsx`).

### Code layout
43. Given all new and modified files, when read, then they honour CLAUDE.md → "Code Layout — Visual Rhythm Inside Function Bodies".

## Notes for Downstream Agents

- **Architect**: the route-group restructure is the largest source change. Move `src/app/page.tsx`, `src/app/(auth)/`, `src/app/(private)/` into `src/app/(main)/`. Add `src/app/(main)/layout.tsx`. Add `src/app/error.tsx` and `src/app/not-found.tsx`. Confirm no middleware change is needed.
- **Builder**: when adding `react-icons` to `package.json`, choose a version >=5.x for the latest icon set + tree-shaking. Run `npm install`.
- **Builder**: the `(main)/layout.tsx` should be minimal — just `<MainHeader />` + `{children}`. No `<html>` / `<body>` (those stay in the root layout).
- **Builder**: when extending `Button.tsx`'s render to support icons, ensure `loading` still wins over icon rendering — the existing `loading ? 'Loading...' : children` logic becomes `loading ? 'Loading...' : <>{leftIcon}{children}{rightIcon}</>`.
- **Builder**: when modifying `MainHeaderNav.tsx`, the Back button changes from `<Button>Back</Button>` to `<Button aria-label="Back" leftIcon={<MdArrowBack />} />` (no children). The test in `MainHeaderNav.test.tsx` already uses `getByRole('button', { name: /back/i })` which matches the accessible name — `aria-label` provides that name, so the test stays green.
- **Reviewer**: AC #3 ("heading computed font-family starts with Oleo Script Swash Caps") requires the new `font-display` utility class to actually resolve via Tailwind. Verify by reading the compiled CSS — the rule for `.font-display` should reference `var(--font-oleo)`.
- **Reviewer**: AC #20 (loading hides icons) is the trickiest correctness case for the `Button` API extension. Verify the test asserts NEITHER icon is in the DOM when `loading` is true.
- **Reviewer**: AC #33–34 (error / not-found render without MainHeader) is the load-bearing assertion for the route-group restructure. Verify by reading `src/app/layout.tsx` (which should have no `MainHeader` import) and by reading `src/app/error.tsx` + `src/app/not-found.tsx` (which should also have no `MainHeader` import / render).
- **No runtime smoke required.** The new test cases for `Button` cover the API change; the existing middleware test covers the unchanged redirect matrix; the route-group restructure is verified by `next build`'s route table.
