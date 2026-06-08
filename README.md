# Team Agent

A Next.js application built and maintained through a structured AI-assisted workflow. Two halves to this README:

1. **[Project](#project)** — stack, setup, scripts, structure (the normal stuff).
2. **[Working with Claude](#working-with-claude)** — how this codebase is built using Claude as a multi-agent pipeline. If you've never used the workflow before, start there after the setup section.

---

## Project

Next.js App Router application with TypeScript strict mode, Tailwind CSS, NextAuth.js (v5 beta), MongoDB via Mongoose, and Vitest + React Testing Library for tests.

### Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript — strict, no `any` |
| Styling | Tailwind CSS v3 (custom palette + design tokens) |
| Forms | react-hook-form + Zod (via `@hookform/resolvers`) |
| Auth | NextAuth.js v5 (beta) — credentials provider, MongoDB adapter |
| DB | MongoDB via Mongoose 8 |
| Tests | Vitest + React Testing Library + jsdom |
| Animations | `motion` (formerly Framer Motion) |
| Icons | `react-icons` (Material set) |

### Prerequisites

- Node.js 20+
- Docker (for the local MongoDB container)

### Getting Started

1. Start MongoDB:
   ```bash
   docker compose up -d
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
4. Generate an `AUTH_SECRET` for NextAuth and paste it into `.env.local`:
   ```bash
   npx auth secret
   ```
5. Seed the admin user (see [Admin User](#admin-user) below).
6. Run the dev server:
   ```bash
   npm run dev
   ```
7. Open http://localhost:3000.

### Admin User

The app has a single pre-seeded admin user — no public sign-up. Set credentials in `.env.local`:

```
ADMIN_NAME=admin
ADMIN_PASSWORD=<choose-something-strong>
```

Run the seed script once. It's idempotent — re-running skips if the user exists:

```bash
npm run seed:admin
```

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest in watch mode |
| `npm run test:run` | Vitest one-shot |
| `npm run test:coverage` | Vitest with coverage |
| `npm run seed:admin` | Seed the admin user from `.env.local` |
| `npx tsx --env-file=.env.local scripts/migrate-task-priority.ts` | One-shot migrations (runs once per migration script) |

### Folder Structure

```
/public
  /images       Raw image drop zone — gitignored, local-only
  /img          Processed, web-ready images — committed. URL: /img/<file>
/src
  /app          App Router routes (layout.tsx, page.tsx, /api, route groups)
  /components   /ui (generic primitives), /features (feature-specific), /layout
  /lib          /auth (NextAuth), /db (Mongo), /validation (Zod schemas), cross-cutting helpers at root
  /models       Mongoose models
  /actions      Server actions
  /types        Shared TypeScript types
  /hooks        Client hooks
  /styles       globals.css (Tailwind base + design tokens)
/__tests__      Mirrors /src for Vitest + RTL tests
/scripts        Operational scripts (seed-admin, one-shot migrations)
/agents         Agent role docs for the AI pipeline (see "Working with Claude")
/tasks          Per-task artefacts produced by the AI pipeline
middleware.ts   NextAuth middleware
CLAUDE.md       Full project conventions (read this if you're contributing code)
```

See `CLAUDE.md` for the full conventions: TypeScript rules, code-layout discipline, component rules, Next.js best practices, testing rules, forbidden patterns.

### Image Assets

Two folders, two roles:

- **`/public/images/`** — raw source images. Drop new images here. **Gitignored** (raw images are typically multi-MB).
- **`/public/img/`** — processed, web-ready. Committed. All production code references `<Image src="/img/file.png" ... />`.

Before committing a new image: resize so the longest dimension is ≤ ~500–800 px, target ≤ ~300 KB, keep PNG when transparency matters. Macros: `sips -Z 500 public/images/file.png --out public/img/file.png`.

---

## Working with Claude

This codebase is built with Claude as a multi-agent pipeline. **`CLAUDE.md` is the canonical specification** for project conventions; everything in this section is the workflow built on top.

### The Mental Model

You don't write code directly. You write a **rough draft** describing what you want, Claude expands it into a structured brief, then a pipeline of six specialised agents runs sequentially to ship the change. You can pause between agents, answer open questions, or let it run end-to-end.

```
draft.md  →  incoming/<name>.md  →  spec  →  plan  →  build  →  tests  →  review
 (you)         (Claude expands)                  (the pipeline)
```

Each agent has one job. Output is one or more markdown files under `/tasks/`. When the task is done, all artefacts get archived under `/tasks/done/<NN>-<name>/` with a sequential prefix.

### The Six Agents

| Agent | Reads | Writes | Job |
|---|---|---|---|
| **Spec** | `tasks/incoming/<name>.md` | `tasks/<name>-spec.md` | Turn the rough brief into precise requirements + ACs. No architecture decisions. |
| **Architect** | spec + `/src` | `tasks/<name>-plan.md` | Decide file layout, what to create vs. modify, build order. No code. |
| **Builder** | spec + plan | source files + `tasks/<name>-build-summary.md` | Write the code. Follow the plan exactly. |
| **Test** | spec + builder's files | test files + `tasks/<name>-test-results.md` | Write tests for the spec ACs from a fresh perspective. |
| **Reviewer** | everything above | `tasks/<name>-review.md` | Quality gate. STATUS = PASS or FAIL. Documents Blockers; never fixes. |
| **Fixer** | review's Blockers | patches to `/src/...` | Surgical fix-only. Runs automatically if Reviewer returns FAIL. |

Each agent has a role doc under `/agents/` describing its rules and output format.

### Two Ways to Run Agents

**1. Shell script (terminal):**
```bash
./run-pipeline.sh tasks:<name>                  # full pipeline, pauses at gates
./run-pipeline.sh tasks:<name> agent:<name>     # single agent
```

The script reads `agents/<agent>-agent.md`, substitutes the task name into `[FEATURE]` placeholders, pipes the agent prompt to `claude --print`, and tracks pass/fail. Pauses for `y/n` after spec and after architect. Auto-runs fixer on FAIL (up to 3 attempts).

**2. Claude Code (conversation):**
Type the commands directly in a Claude Code session:

```
create task:<name>
run agent:all tasks:<name>
run agent:<agent> tasks:<name>
done task:<name>
```

Claude executes the corresponding agent prompt against the current codebase, writes artefacts, and reports back. This is the more interactive flow — you can answer Open Questions inline and steer between agents.

### The Day-to-Day Flow

#### Step 1 — Write a draft

Create `tasks/draft/<name>.md`. Write whatever notes you want — bullet points, half-formed thoughts, "do X then Y", a list of fixes. Style doesn't matter. Examples live under `tasks/done/*/_*.draft.md`.

#### Step 2 — Expand into a brief

```
create task:<name>
```

Claude reads `tasks/draft/<name>.md`, expands it into a structured brief at `tasks/incoming/<name>.md`. The brief captures every point from your draft, flags assumptions, surfaces Open Questions with leans (Claude's suggested defaults).

You **review the brief**. If a lean is wrong, tell Claude in chat — it patches the brief directly. You can iterate until satisfied.

#### Step 3 — Run the pipeline

```
run agent:all tasks:<name>
```

After **spec** and **architect**, Claude pauses and asks "Continue to next agent? (y/n)". You can:

- Reply `y` — continue.
- Reply `y, Q1: <answer>; Q3: <answer>` — patch the spec's Assumptions with your answers, then continue.
- Reply `n` — stop.
- Reply `y (skip)` — proceed AND skip remaining pauses for the rest of the pipeline.

Or run end-to-end from the start by including `(skip)` in the command:
```
run agent:all tasks:<name> (skip)
```

After the **reviewer**, if STATUS is FAIL the fixer runs automatically followed by a re-review (up to 3 iterations). If STATUS is PASS, the pipeline ends.

#### Step 4 — Archive

```
done task:<name>
```

Moves all `tasks/<name>-*.md` files (plus the original draft) into `tasks/done/<NN>-<name>/` with the next sequential prefix. The `tasks/` root returns to a clean `draft / incoming / done` shape.

### Lite Mode

Small tasks (polish, refactor, restructure, fix-only, single-component tweaks) produce smaller artefacts. Claude auto-detects lite mode when:

- The brief contains "fast", "lite", "polish", "fix", "tweak", or similar tight-scope language.
- The brief is under ~80 lines AND touches ≤ 3 source files.
- The brief is a continuation / fix of a prior task (e.g. `<task>-fixes`, `<task>-improvements`).

In lite mode the spec, plan, build summary, and review are all trimmed. The test-results file may be a one-line redirect to the build summary's `## Tests` section. PASS reviews are ~10–20 lines and don't re-list ACs.

You can force lite mode by saying "do this task fast" in the draft or chat.

### Single-Agent Runs

You can run any agent in isolation. Useful for re-running just the spec after you've edited the brief, or re-running tests after a manual fix:

```
run agent:spec tasks:<name>
run agent:test tasks:<name>
run agent:reviewer tasks:<name>
```

The agent reads its inputs from `tasks/...` files; it does not re-run upstream agents.

### When Things Go Wrong

- **Reviewer returns FAIL repeatedly**: open `tasks/<name>-review.md`. The Blockers section tells you what the fixer couldn't resolve surgically. Usually the spec needs adjusting. Edit `tasks/<name>-spec.md` and re-run from architect.
- **Fixer escalates**: it wrote `tasks/<name>-escalation.md`. The Blocker requires re-architecture — re-run the architect with the updated context.
- **The brief doesn't match what you wanted**: edit `tasks/incoming/<name>.md` in chat ("update the brief to include X") and re-run `run agent:spec tasks:<name>`.
- **Stuck in a loop**: stop, read the current `tasks/<name>-*.md` files yourself, decide whether to patch the spec/plan and re-run a single agent, or scrap and re-draft.

### Conventions for Reading the Project

Before working in the codebase, read:

1. **`CLAUDE.md`** — project-wide conventions. TypeScript rules, code-layout discipline, component rules, Next.js best practices, testing rules, forbidden patterns. **Mandatory read.**
2. **`agents/*-agent.md`** — each agent's role and output format. Useful if you're tweaking the pipeline.
3. **`tasks/done/`** — examples of every kind of task that's shipped. Look at recent ones to see typical brief / spec / plan shapes.

### Anti-Patterns

Things that break the flow:

- **Skipping the brief review**: just running `run agent:all` on an unreviewed brief means the spec inherits any draft ambiguities. Spend 30 seconds reading the brief first.
- **Running the builder on an outdated spec**: if you edited the spec after the plan was written, re-run the architect too.
- **Touching `/tasks/done/`**: archived tasks are immutable history. Treat them as read-only.
- **Mixing concerns in one task**: a draft that bundles "refactor X + add feature Y + fix bug Z" produces a sprawling spec and a hard-to-review PR. Split them.
- **Letting the artefacts drift**: if you hand-edit a source file mid-pipeline, the spec/plan no longer matches reality. Either run the affected agent again or roll your manual edit into the spec first.
