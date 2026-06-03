# CLAUDE.md
> Global context for all agents. Read this before doing anything else, in every session.

---

## Project

Next.js application using the App Router. All new development follows App Router conventions — no Pages Router patterns, no `getServerSideProps`, no `getStaticProps`.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript — strict mode, no `any` |
| Styling | Tailwind CSS |
| Auth | NextAuth.js (Auth.js v5) |
| Runtime | Node.js |
| Unit/Component tests | Vitest + React Testing Library |

---

## Project Structure

```
/src
  /app                        ← App Router: all routes live here
    /api                      ← API route handlers (route.ts files)
    /(auth)                   ← route group: auth-related pages
    layout.tsx                ← root layout
    page.tsx                  ← root page
  /components
    /ui                       ← generic, reusable, no business logic
    /features                 ← feature-specific components
    /layout                   ← structural components (Header, Sidebar, Footer)
  /lib
    /auth.ts                  ← NextAuth config and helpers
    /utils.ts                 ← generic utility functions
  /types                      ← shared TypeScript types and interfaces
  /hooks                      ← client-side custom hooks (use client only)
  /actions                    ← server actions (use server)
  /styles
    globals.css               ← Tailwind base imports, CSS variables
```

---

## TypeScript Rules

- Strict mode is on — respect it
- No `any` under any circumstances — use `unknown` and narrow if needed
- No type assertions (`as SomeType`) unless genuinely unavoidable — add a comment if used
- All component props must have explicit types (no implicit `{}`)
- Component prop types follow the pattern `type <ComponentName>Props = Readonly<{ ... }>`. For a component `Cool`, declare `type CoolProps = Readonly<{ ... }>` and use `(props: CoolProps)` or destructure `({ ... }: CoolProps)`. The `Readonly<>` wrapper is mandatory — props are immutable from the component's perspective. Only declare this type when the component actually has props — components with no props omit the type entirely and use `()` as the parameter list (no `Readonly<{}>`).
- Never reference React members via the `React.*` namespace (e.g. `React.ReactNode`, `React.FC`, `React.MouseEvent`). Import the specific names you need: `import type { ReactNode, MouseEvent } from 'react'`. Use `import type` for type-only imports so they're erased at build time.
- Prefer `type` over `interface` for object shapes; use `interface` only when extending
- All server action return types must be explicit

---

## Component Rules

### Server vs Client
- Default to **server components** — only add `"use client"` when you need:
  - Browser APIs (`window`, `document`, `localStorage`)
  - Event handlers (`onClick`, `onChange`, etc.)
  - React hooks (`useState`, `useEffect`, `useRef`, etc.)
  - Third-party client-only libraries
- Never add `"use client"` at layout level — push it as deep as possible
- Never use `useEffect` for data fetching — fetch in server components or server actions

### Naming
- Component files: `PascalCase.tsx`
- Hook files: `useCamelCase.ts`
- Utility files: `camelCase.ts`
- Server action files: `camelCase.ts` inside `/actions`
- Route files must be named `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` per Next.js convention

### File co-location
- **Feature components live in `/components/features/`**, even when only one route uses them. A "feature component" is anything that represents a feature surface — forms, business-logic-bearing widgets, anything where the component name maps to a product concept (e.g. `SignInForm`, `SignUpForm`, `OrderSummary`, `UserMenu`). Route `page.tsx` imports them via `@/components/features/...`. Do NOT co-locate feature components next to their route just because they're used once — they belong with their peers in `/components/features/`.
- **Generic, reusable primitives live in `/components/ui/`** (e.g. `Button`, `Input`, `Card`). No business logic, no feature-specific copy, no domain types.
- **Structural shell pieces live in `/components/layout/`** (e.g. `Header`, `Sidebar`, `Footer`).
- **Tiny route-local presentation helpers** — a small wrapper used inline to keep `page.tsx` readable, with no business logic and no reuse potential — can stay next to the route file. Default to moving to `/components/features/` if in doubt.
- Types used in only one file stay in that file; shared types go to `/types`.

---

## Next.js Best Practices

Always prefer the Next.js / React 19 idiom over a bare HTML or manual JavaScript equivalent. The rules below codify "use the framework primitive". When in doubt, look up the App Router pattern and use that.

### Navigation
- **Internal navigation uses `Link` from `next/link`** — never a bare `<a>` for a route inside this app. `Link` handles prefetching, client-side transitions, and scroll behavior. Bare `<a>` is reserved for external URLs (different origin) or `mailto:` / `tel:` schemes.
- **Server-side redirects use `redirect()` from `next/navigation`** in server components and server actions — never `window.location` or manual `Response` writes.
- **Client-side navigation uses `useRouter` from `next/navigation`** — never `next/router` (Pages Router).

### `'use client'` placement
- Push the directive as deep as possible. If a parent has no interactivity but a child does, the directive belongs on the child, not the parent. Pages that call `auth()` and render a small interactive widget stay server components; the widget becomes a separate client component.
- A `'use client'` boundary is a contract — everything imported transitively into a client component becomes part of the client bundle. Never put the directive on a file whose only interactive line could be lifted into a smaller leaf.
- The directive lives at the *deepest* component that still owns the interactivity — not on a wrapper, not on the page.
- **Plain JS helpers that need to be callable from both server and client components must live in their own module, *without* a `'use client'` directive.** Importing a regular function from a `'use client'` module into a server component makes Next.js treat the function as a client-only reference; calling it during SSR throws `Attempted to call X() from the server but X is on the client`. `tsc --noEmit`, `npm run lint`, and `npx next build` do NOT catch this — only an actual dev-server request does. Pattern: when an interactive component (`Foo.tsx`, `'use client'`) wants to also expose a class-name helper, variant map, or constant for server components to consume, extract it to a sibling module (`foo-helpers.ts`, no directive) and import from there in both places.

### Forms and mutations
- Forms that mutate server state use **server actions**, bound either as `<form action={serverAction}>` (progressive enhancement — works without JS) or invoked from a client component with `useTransition`.
- For form result/error state, prefer `useActionState` (React 19) when the form is purely server-driven. Use manual `useState` only when client-side validation runs before the server call (e.g. a shared Zod schema).
- Pending UI comes from `useTransition` (manual invocation) or `useFormStatus` (inside `<form action={...}>`) — never a manual `isLoading` boolean.

### Images, fonts, scripts
- Images use `Image` from `next/image` — never bare `<img>`. Width/height (or `fill`) is required.
- Fonts use `next/font` — never `<link rel="stylesheet">` pointed at a font CDN.
- Third-party scripts use `Script` from `next/script` with an explicit `strategy`.

### Metadata
- Page titles and descriptions come from the `Metadata` export in `layout.tsx` or `page.tsx` — never a `<title>` element in JSX.
- Dynamic metadata uses `generateMetadata` (async). Read params/searchParams via the function signature, not via `useSearchParams` in a server component.

### Caching and revalidation
- After a server-action mutation that affects what a page shows, call `revalidatePath(<path>)` or `revalidateTag(<tag>)` from `next/cache`. Do not rely on automatic re-renders unless the action is bound directly to a `<form action={...}>` on the page that needs to refresh.

### Route handlers vs server actions
- Internal data and mutations → server actions (`/src/actions`), typed and co-located with feature code.
- External webhooks, third-party callbacks, OAuth handshakes → route handlers (`/src/app/api/.../route.ts`).
- Never use a route handler from internal client code where a server action would do.

---

## Styling Rules (Tailwind)

- Tailwind utility classes only — no inline `style` props except for dynamic values that cannot be expressed as utilities (e.g. dynamic widths from JS)
- No custom CSS files per component — use `globals.css` for any CSS variable definitions or base overrides
- Responsive design is mobile-first: base classes are mobile, `md:` and `lg:` layer up
- Use Tailwind's `cn()` utility (via `clsx` + `tailwind-merge`) for conditional class merging — never concatenate class strings manually
- Color tokens and spacing must come from the Tailwind config — do not use arbitrary values like `w-[347px]` unless there is no alternative

---

## Data Fetching Rules

- Fetch data in **server components** by default — `async/await` directly in the component
- Use **server actions** (`/actions`) for mutations (create, update, delete)
- Server actions must validate all input with Zod before any database/API call — even if Zod is not in the stack yet, structure actions to accept validation
- Never expose raw database errors to the client — catch and return a safe error shape
- API routes (`/app/api`) are for external webhooks or third-party callbacks only — internal data fetching uses server components and server actions

---

## Auth Rules (NextAuth.js)

- Auth config lives in `/lib/auth.ts` only — never scattered across files
- Use `auth()` helper from `/lib/auth.ts` to get the session in server components
- Protected routes use middleware (`middleware.ts`) at the route level — do not add auth checks inside individual page components
- Never expose session tokens or provider secrets in client components
- User-facing auth pages live under `/(auth)` route group

---

## State Management Rules

- **Server state**: handled by server components and server actions — no client fetching library
- **Client UI state**: `useState` and `useReducer` — kept local, pushed as deep as possible
- **Global client state**: not in the stack currently — if a future need arises, evaluate Zustand; do not reach for Context API for global state
- Do not store auth session data in client state — always read from `auth()` server-side

---

## Error Handling

- Every server action returns a typed result shape — never throw to the client:
  ```ts
  type ActionResult<T> = 
    | { success: true; data: T }
    | { success: false; error: string }
  ```
- Each route segment that fetches data must have a sibling `error.tsx` file
- Root `error.tsx` is a catch-all — individual route errors should be handled closer to the source
- Loading states use `loading.tsx` files or Suspense boundaries, not manual `isLoading` booleans in client components

---

## Testing Rules

### Stack
- **Unit/component tests**: Vitest + React Testing Library + `@testing-library/jest-dom`
- **Mocking**: Vitest built-ins (`vi.fn()`, `vi.mock()`)

### Test file location
All unit/component tests live in `/__tests__`, mirroring `/src` structure:
```
/__tests__
  /components
  /hooks
  /actions
  /lib
```
Test files named: `ComponentName.test.tsx` / `useSomething.test.ts`

### What gets unit tested
- Client components (rendering, interactions, conditional display)
- Custom hooks (state transitions, exposed functions)
- Server actions (input validation, success/error return shapes)
- Utility functions (all branches)

### What does NOT get unit tested
- Server components — async, server-side; test logic in isolation where practical
- Next.js internals (`router`, `headers`, `cookies`) — mock these, don't test them
- Third-party library behaviour — mock the library, test your code's response

### Vitest config
`vitest.config.ts` at project root — separate from `next.config.ts`:
- Environment: `jsdom`
- Setup file: `vitest.setup.ts` (imports `@testing-library/jest-dom`)
- Path aliases must match `tsconfig.json`

### npm scripts
```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

---

## Forbidden Patterns

These must never appear in this codebase:

- `any` type
- `useEffect` for data fetching
- `getServerSideProps` / `getStaticProps` (Pages Router)
- `next/router` imports (Pages Router) — use `next/navigation` instead
- Bare `<a>` for internal routes — use `Link` from `next/link`
- Bare `<img>` — use `Image` from `next/image`
- `<title>` in JSX — use the `Metadata` export
- `window.location` for redirects — use `redirect()` from `next/navigation` (server) or `useRouter()` (client)
- Inline `style` props for static values
- Auth checks inside page components (use middleware)
- Direct database calls from client components or API routes (use server actions)
- Class name string concatenation (use `cn()`)
- Committing `.env` values — use `.env.local` and document variables in `.env.example`

---

## Conventions for Agents

- **Spec agent**: route paths follow Next.js App Router file structure — `/app/dashboard/page.tsx` corresponds to `/dashboard`
- **Architect agent**: check `/src/components/ui` before creating any new primitive component — reuse first
- **Builder agent**: run `tsc --noEmit` after writing all files — do not finish with type errors
- **Test agent**: testing library TBD — check `package.json` for what is installed before writing tests
- **Reviewer agent**: verify `"use client"` is not present unless strictly necessary — flag any unnecessary usage as a blocker
- **Fixer agent**: do not restructure imports or reformat files you are not fixing — surgical changes only

---

## Pipeline Commands

There are two ways to run agents: via the shell script (terminal) or via Claude Code (conversation).

### Shell script (terminal)

```bash
# Run full pipeline for a task
./run-pipeline.sh tasks:<name>

# Run a single specific agent for a task
./run-pipeline.sh tasks:<name> agent:<agent>
```

Examples:
```bash
./run-pipeline.sh tasks:initial-setup
./run-pipeline.sh tasks:initial-setup agent:fixer
./run-pipeline.sh tasks:notifications agent:reviewer
```

### Claude Code (conversation)

Type these commands directly in the Claude Code session:

```
create task:<name>
run agent:all tasks:<name>
run agent:<agent> tasks:<name>
done task:<name>
```

Examples:
```
create task:auth-sign-in-update
run agent:all tasks:initial-setup
run agent:spec tasks:notifications
run agent:fixer tasks:initial-setup
run agent:reviewer tasks:notifications
done task:initial-setup
done task:notifications
```

### Available agents

| Agent | Keyword | Reads | Writes |
|---|---|---|---|
| Spec | `spec` | `tasks/incoming/<name>.md` | `tasks/<name>-spec.md` |
| Architect | `architect` | `tasks/<name>-spec.md` + `/src` | `tasks/<name>-plan.md` |
| Builder | `builder` | `tasks/<name>-spec.md` + `tasks/<name>-plan.md` | `/src/...` + `tasks/<name>-build-summary.md` |
| Test | `test` | `/src/...` + `tasks/<name>-spec.md` | test files + `tasks/<name>-test-results.md` |
| Reviewer | `reviewer` | everything above | `tasks/<name>-review.md` |
| Fixer | `fixer` | `tasks/<name>-review.md` | patches to `/src/...` |

### How Claude Code should interpret run commands

When you receive a command in the format `run agent:<agent> tasks:<name>` or `run agent:all tasks:<name>`, do the following:

**`run agent:all tasks:<name>`**
Execute the full pipeline in order: spec → architect → builder → test → reviewer.
After spec and after architect, pause and show output, then ask "Continue to next agent? (y/n)" before proceeding.
After reviewer, check `tasks/<name>-review.md` for `## STATUS:`. If FAIL, run fixer automatically, then re-run reviewer. Repeat up to 3 times.

**Answering "Open Questions" during a spec-pause.**
The spec-agent may emit an "Open Questions" section in the spec. At the spec-pause, the user can:
- Reply `y` — proceed; assumptions stand and the questions remain in the spec as a record.
- Reply `y, Q1: <answer>; Q3: <answer>` (or any partial set) — patch the spec's "Assumptions" section with the answers, remove the answered items from "Open Questions", show the updated spec, then continue to the architect.
- Reply `n` — stop; the user will edit the spec by hand or in chat and re-trigger.

The same pattern applies to ad-hoc answers after the pipeline ends: when the user says "for Q2, use <value>", patch the spec accordingly. Re-running affected downstream agents is the user's call — surface which agents are affected based on which Assumptions changed.

**`run agent:<agent> tasks:<name>`**
Read `agents/<agent>-agent.md`, replace all `[FEATURE]` placeholders with `<name>`, then execute that agent's instructions against the current codebase and task files.
Do not run any other agent. Do not continue the pipeline.

**`create task:<name>`** (also accept `create tasks:<name>`)
Expand a rough draft into a thorough, spec-ready task brief.
Input: `tasks/draft/<name>.md` — the user's rough notes. If this file does not exist, stop and ask the user where the draft is.
Output: `tasks/incoming/<name>.md` — a structured brief written in the same style as existing files under `tasks/incoming/` and `tasks/done/<name>/<name>.md`. Typical sections: short Description paragraph; Scope (In scope / Out of scope); feature-specific subsections (Pages, Validation, Auth Mechanism, Data, etc., whatever the draft implies); Folder / File Touch Points (rough sketch only — the architect decides final paths); Done Criteria; What This Task Does NOT Include.

Rules for the expansion:
- Read `CLAUDE.md` first so the brief stays consistent with project conventions.
- Read the existing codebase only when the draft references existing files or concepts (e.g. "modify the home page") — do not scan broadly.
- Capture every point from the draft faithfully. Do not drop requirements.
- Expand underspecified points to clear, executable language. Where you must make a call, prefer the simpler interpretation and flag it as an explicit note in the brief (e.g. "Note for spec-agent: ...").
- Do NOT make architectural decisions (component breakdown, file paths beyond a rough sketch, library choices). Those are the spec-agent's and architect's jobs downstream.
- Do NOT write code.
- Do NOT run any agent or pipeline after writing the brief — this command stops after the file is written.

If `tasks/incoming/<name>.md` already exists, ask the user before overwriting. Leave the draft file (`tasks/draft/<name>.md`) in place — do not move or delete it.

After writing, summarise in chat: what you expanded, what assumptions you made, and any open uncertainties the spec-agent should resolve.

**`done task:<name>`** (also accept `done tasks:<name>`)
Archive a completed task. Tasks under `tasks/done/` are numbered sequentially by completion order with a zero-padded two-digit prefix (`01-`, `02-`, …). Both the folder and every file inside it carry the same prefix, so a sorted listing of `tasks/done/` reflects the order tasks shipped.

Before moving anything, determine the next prefix `NN`:
- Scan `tasks/done/` for existing `NN-*` folders.
- Take the maximum numeric prefix and add 1.
- If no numbered folders exist yet, start at `01`.
- Zero-pad to two digits.

Create `tasks/done/<NN>-<name>/` if it does not already exist, then move every file matching `<name>` into it with the prefix applied:
- `tasks/draft/<name>.md` → `tasks/done/<NN>-<name>/_<NN>-<name>.draft.md` (leading underscore + `.draft.md` so it sorts ahead of the other artifacts inside its folder; skipped if the task had no draft)
- `tasks/incoming/<name>.md` → `tasks/done/<NN>-<name>/<NN>-<name>.md`
- `tasks/<name>-spec.md` → `tasks/done/<NN>-<name>/<NN>-<name>-spec.md`
- `tasks/<name>-plan.md` → `tasks/done/<NN>-<name>/<NN>-<name>-plan.md`
- `tasks/<name>-build-summary.md` → `tasks/done/<NN>-<name>/<NN>-<name>-build-summary.md`
- `tasks/<name>-test-results.md` → `tasks/done/<NN>-<name>/<NN>-<name>-test-results.md`
- `tasks/<name>-review.md` → `tasks/done/<NN>-<name>/<NN>-<name>-review.md`

Use `mv` so file paths in any IDE-open buffer follow. Skip files that do not exist (do not error). Do not modify file contents. Do not run any agent.

After moving, list what was moved including the assigned `NN`. If `tasks/done/<NN>-<name>/` already exists with files, ask the user before overwriting.

**In all cases:**
- Always read `CLAUDE.md` first (you are already doing this by reading this file)
- Always confirm which task / draft file you are reading at the start
- Always report what files were created, modified, or moved at the end
