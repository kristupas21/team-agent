# Spec: Initial Next.js App Setup

## Summary
Scaffold a brand-new Next.js (App Router) application with all baseline tooling, conventions, and folder structure required by `CLAUDE.md`. No business logic is added. The outcome is a clean, runnable foundation that future feature tasks build on: TypeScript strict, Tailwind, NextAuth.js skeleton, MongoDB (local Docker), Mongoose, ESLint, Prettier, Vitest + RTL, and a single home page that proves the stack boots and styles load.

## Assumptions
- Next.js version: the latest stable Next.js 15.x line is acceptable (App Router is the only supported style per `CLAUDE.md`).
- Node version: 20.x LTS or newer (Next.js 15 requirement). README documents this.
- Package manager: `npm` (the task uses `npm` scripts and `npm run`/`npm install` consistently).
- TypeScript: strict mode is enforced from the start; no `any`, no implicit returns.
- `.eslintrc.json` format is acceptable; if Next.js scaffolding produces `eslint.config.mjs` (flat config) instead, that is also acceptable provided the same rule sets are extended.
- Tailwind version: v3.x (the spec references `tailwind.config.ts`, `globals.css` with `@tailwind base/components/utilities`, and `prettier-plugin-tailwindcss`, all of which align with v3).
- NextAuth.js version: Auth.js v5 (explicit in the task).
- MongoDB image: `mongo:7` (explicit in the task).
- `MongoDBAdapter` package: `@auth/mongodb-adapter` is the official adapter for Auth.js v5 and is the one wired in `/src/lib/auth.ts`.
- The MongoDB adapter requires a `MongoClient` (driver) connection; even though Mongoose is the ODM, the adapter uses the underlying MongoDB driver client. `/src/lib/db.ts` exposes both: the Mongoose `connectDB()` for app use and a `MongoClient` promise for the adapter. This is the standard Auth.js v5 + Mongoose pattern.
- `cn()` utility lives at `/src/lib/utils.ts` (matches `CLAUDE.md` structure).
- `vitest.setup.ts` only imports `@testing-library/jest-dom` for now — no global mocks.
- `globals.css` lives under `/src/styles/globals.css` per `CLAUDE.md` project structure (the task's wording "globals.css with Tailwind base/components/utilities imports" does not specify a path, so the `CLAUDE.md` location wins).
- `.gitignore` includes `.env.local`, `.next`, `node_modules`, and similar standard Next.js ignores.
- Git is initialised at the project root (a Next.js scaffolded app normally does this; if not, this task initialises one).
- The `/__tests__` empty folder structure is created using `.gitkeep` files so empty directories are visible in git.
- The `/(auth)` route group is created as an empty folder with a `.gitkeep` — no auth pages yet.
- `/src/types/index.ts` is created with a single placeholder type or an empty export so the file is valid TypeScript.
- `/src/hooks` and `/src/actions` are created with `.gitkeep` files (no contents yet).
- No favicon or custom font is configured at this stage.
- README is written in English at the project root.

## Routes / Pages

| Path | File | Title | Purpose |
|---|---|---|---|
| `/` | `/src/app/page.tsx` | "App" (placeholder via metadata) | Home page — placeholder heading + paragraph confirming the app runs and Tailwind styles load. Server component, no data. |
| `/api/auth/[...nextauth]` | `/src/app/api/auth/[...nextauth]/route.ts` | n/a | NextAuth.js route handler. Re-exports `GET` and `POST` from `/lib/auth.ts`. No providers configured yet, so requests resolve but return no authenticated session. |

No other routes are added at this stage. The `/(auth)` route group folder exists but contains no pages.

## Data

### API Endpoints
- `GET /api/auth/[...nextauth]` and `POST /api/auth/[...nextauth]`
  - Request payload: handled internally by NextAuth.js (varies by sub-route: `/signin`, `/callback`, `/session`, etc.).
  - Response shape: handled internally by NextAuth.js. With no providers configured, `/api/auth/session` returns `{}` (no session) and other endpoints return the NextAuth default error/empty responses.
  - Error codes: standard NextAuth responses (e.g. `400` for malformed requests, `404` for unknown sub-routes).

No other API endpoints exist in this task.

### Data Types

```ts
// /src/types/index.ts
// Placeholder export to keep the file valid; future shared types live here.
export {}
```

```ts
// /src/lib/auth.ts — return shape from NextAuth() factory
type AuthExports = {
  handlers: { GET: (req: Request) => Promise<Response>; POST: (req: Request) => Promise<Response> }
  auth: () => Promise<Session | null>
  signIn: (...args: unknown[]) => Promise<unknown>
  signOut: (...args: unknown[]) => Promise<unknown>
}
```

```ts
// /src/lib/db.ts — exports
export function connectDB(): Promise<typeof import('mongoose')>
export const clientPromise: Promise<import('mongodb').MongoClient>
```

No domain types are defined at this stage (no business logic).

## Components

| Name | Purpose | Props |
|---|---|---|
| `RootLayout` | Wraps every page. Sets `<html lang="en">`, imports `globals.css`, defines metadata. | `{ children: React.ReactNode }` |
| `HomePage` (default export of `/src/app/page.tsx`) | Renders placeholder heading and paragraph to confirm app runs. | none — server component |

No reusable UI components are created at this stage. Architect decides file placement for future work.

## User Interactions

### Happy path: confirm the app runs
1. Developer runs `docker compose up -d` — MongoDB container starts on port 27017.
2. Developer runs `npm install` — dependencies install without errors.
3. Developer runs `npm run dev` — Next.js dev server starts on port 3000 without errors.
4. Developer opens `http://localhost:3000` — home page renders with the placeholder heading and paragraph, Tailwind styles visibly applied (centered layout, typography from Tailwind defaults).
5. Developer runs `tsc --noEmit` — exits with zero errors.
6. Developer runs `npm run lint` — exits with zero errors.
7. Developer runs `npm run test:run` — Vitest starts, finds no tests, exits 0 without config errors.

### Failure path: missing `.env.local`
1. Developer runs `npm run dev` without creating `.env.local` from `.env.example`.
2. App starts but logs a clear console error when DB connection is first attempted, indicating `MONGODB_URI` is not set. The home page still renders because it does not touch the database.

### Failure path: MongoDB not running
1. Developer runs `npm run dev` without starting Docker.
2. App starts; home page renders. Any code path that calls `connectDB()` would throw a connection error, but no such path exists in this task. Behaviour is documented in README.

### Failure path: NextAuth route hit with no providers
1. Developer navigates to `/api/auth/signin`.
2. NextAuth returns its default "no providers configured" page/response. This is expected — no providers are wired yet.

## States

### Home page (`/`)
- **Populated**: heading text `"Next.js App"` and paragraph text `"Foundation in place. Build features from here."`. Centered using Tailwind utilities (`min-h-screen flex items-center justify-center` on a wrapper, `text-center` inside).
- **Loading / Error / Empty**: not applicable — no data fetching.

### MongoDB connection (`connectDB()`)
- **Success**: returns the active Mongoose connection.
- **Error**: logs `"[db] MongoDB connection error: <message>"` to the console and rethrows. No user-facing UI consumes this in this task.

### NextAuth handlers
- **No providers**: NextAuth's built-in default response is acceptable. No custom error pages added in this task.

## Acceptance Criteria

1. Given a clean machine with Node 20+ and Docker installed, when the developer runs `docker compose up -d`, then a MongoDB 7 container named `app_mongo` starts and exposes port `27017`.
2. Given dependencies installed, when the developer runs `npm run dev`, then the Next.js dev server starts on port 3000 with zero compile errors.
3. Given the dev server is running, when the developer opens `http://localhost:3000`, then the page renders the placeholder heading and paragraph with Tailwind styling visibly applied (centered, default sans font).
4. Given the project root, when the developer runs `tsc --noEmit`, then the command exits with code 0 and no diagnostics.
5. Given the project root, when the developer runs `npm run lint`, then the command exits with code 0 and no warnings or errors.
6. Given the project root, when the developer runs `npm run test:run`, then Vitest runs to completion (no tests found is acceptable) with exit code 0 and no config errors.
7. Given the file tree, when listing files, then all folders from `CLAUDE.md` structure exist: `/src/app`, `/src/app/api`, `/src/app/(auth)`, `/src/components/ui`, `/src/components/features`, `/src/components/layout`, `/src/lib`, `/src/types`, `/src/hooks`, `/src/actions`, `/src/styles`, `/__tests__/components/ui`, `/__tests__/components/features`, `/__tests__/components/layout`, `/__tests__/hooks`, `/__tests__/actions`, `/__tests__/lib`.
8. Given `/src/lib/utils.ts`, when imported as `import { cn } from '@/lib/utils'`, then `cn('a', 'b')` returns `'a b'` and `cn('p-2', 'p-4')` returns `'p-4'` (tailwind-merge behaviour).
9. Given a running dev server, when a request is made to `GET /api/auth/session`, then NextAuth responds with HTTP 200 and an empty JSON object.
10. Given the project root, when inspecting tracked files, then `.env.example` is committed and `.env.local` is excluded by `.gitignore`.
11. Given `middleware.ts` at project root, when running the app, then it exports NextAuth middleware with a commented `matcher` example and does not block any current routes.
12. Given `vitest.config.ts` at project root, when running `npm run test:run`, then Vitest resolves the `@/*` path alias correctly and uses the `jsdom` environment.
13. Given `tailwind.config.ts`, when building the app, then Tailwind scans `/src` paths and applies utility classes visible on the home page.
14. Given `.prettierrc`, when running Prettier, then it uses: `semi: false`, `singleQuote: true`, `tabWidth: 2`, `trailingComma: 'es5'`, `printWidth: 100`, and the `prettier-plugin-tailwindcss` plugin.
15. Given `README.md` at the project root, when read, then it documents: prerequisites (Node version + Docker), how to start MongoDB (`docker compose up -d`), how to install (`npm install`), how to run (`npm run dev`), how to generate `AUTH_SECRET` (`npx auth secret`), and a brief explanation of the folder structure.
16. Given the `.env.example` file, when read, then it lists exactly: `NEXT_PUBLIC_APP_URL`, `AUTH_SECRET`, `AUTH_URL`, `MONGODB_URI` with placeholder/empty values and the same comments as in the task description.
17. Given the home page (`/src/app/page.tsx`), when grep'd, then it does NOT contain the string `"use client"`.
18. Given the codebase, when grep'd, then no `any` types, no `getServerSideProps`, no `getStaticProps`, no `useEffect` for data fetching, and no manual class name concatenation are present.
