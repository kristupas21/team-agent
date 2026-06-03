# Build Plan: Initial Next.js App Setup

## Overview
This plan covers scaffolding a new Next.js App Router project from an empty `/src` directory. Key structural decisions: (a) one `db.ts` exports both a Mongoose `connectDB()` for app code and a `MongoClient` promise for the NextAuth adapter; (b) empty folders are preserved via `.gitkeep`; (c) Tailwind v3 with `prettier-plugin-tailwindcss`; (d) ESLint uses the modern flat config (`eslint.config.mjs`) targeting `next/core-web-vitals` and `next/typescript`; (e) Next.js config and Tailwind config use `.ts` extensions.

## Reuse
None. The `/src` directory is empty and no prior files exist that can be reused.

## Files to Create

### Root-level config

- **Path**: `package.json`
  - **Type**: config
  - **Purpose**: declare dependencies, devDependencies, and npm scripts.
  - **Key contents**:
    - `dependencies`: `next`, `react`, `react-dom`, `next-auth@beta` (Auth.js v5), `@auth/mongodb-adapter`, `mongodb`, `mongoose`, `clsx`, `tailwind-merge`, `zod` (the spec mentions Zod-shaped server actions; safe to install now even if unused).
    - `devDependencies`: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `tailwindcss@^3`, `postcss`, `autoprefixer`, `prettier`, `prettier-plugin-tailwindcss`, `eslint`, `eslint-config-next`, `@eslint/eslintrc`, `vitest`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@vitest/coverage-v8`.
    - `scripts`: `"dev": "next dev"`, `"build": "next build"`, `"start": "next start"`, `"lint": "next lint"`, `"test": "vitest"`, `"test:run": "vitest run"`, `"test:coverage": "vitest run --coverage"`.
  - **Reference pattern**: none — bootstrap.

- **Path**: `tsconfig.json`
  - **Type**: config
  - **Purpose**: TypeScript strict mode + Next.js compiler options + `@/*` path alias.
  - **Key contents**: `"strict": true`, `"noImplicitAny": true`, `"target": "ES2022"`, `"lib": ["dom", "dom.iterable", "esnext"]`, `"module": "esnext"`, `"moduleResolution": "bundler"`, `"jsx": "preserve"`, `"plugins": [{ "name": "next" }]`, `"paths": { "@/*": ["./src/*"] }`, `"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`, `"exclude": ["node_modules"]`.
  - **Reference pattern**: none — bootstrap.

- **Path**: `next.config.ts`
  - **Type**: config
  - **Purpose**: Next.js configuration. Minimal — no overrides.
  - **Key contents**: default `NextConfig` export with no flags. Typed import from `next`.

- **Path**: `tailwind.config.ts`
  - **Type**: config
  - **Purpose**: Tailwind scans `/src` for class usage.
  - **Key contents**: `content: ['./src/**/*.{ts,tsx}']`, default theme, no plugins, exports `Config` from `tailwindcss`.

- **Path**: `postcss.config.mjs`
  - **Type**: config
  - **Purpose**: required for Tailwind v3 + Next.js.
  - **Key contents**: `plugins: { tailwindcss: {}, autoprefixer: {} }`.

- **Path**: `eslint.config.mjs`
  - **Type**: config
  - **Purpose**: Flat ESLint config extending `next/core-web-vitals` and `next/typescript`. No overrides.
  - **Key contents**: uses `FlatCompat` from `@eslint/eslintrc` to bring in the legacy `next/*` configs.

- **Path**: `.prettierrc`
  - **Type**: config
  - **Purpose**: Prettier rules for the codebase.
  - **Key contents** (JSON): `semi: false`, `singleQuote: true`, `tabWidth: 2`, `trailingComma: "es5"`, `printWidth: 100`, `plugins: ["prettier-plugin-tailwindcss"]`.

- **Path**: `.prettierignore`
  - **Type**: config
  - **Purpose**: skip generated and external files.
  - **Key contents**: `.next`, `node_modules`, `public`, `coverage`.

- **Path**: `.gitignore`
  - **Type**: config
  - **Purpose**: standard Next.js + Node ignores plus `.env*.local`.
  - **Key contents**: `node_modules`, `.next`, `out`, `coverage`, `.env*.local`, `.DS_Store`, `*.log`, `next-env.d.ts` is committed per Next.js convention — do NOT ignore it.

- **Path**: `.env.example`
  - **Type**: config
  - **Purpose**: documents required env vars; committed.
  - **Key contents**: exactly the block from the task description (NEXT_PUBLIC_APP_URL, AUTH_SECRET, AUTH_URL, MONGODB_URI, with the same comments).

- **Path**: `.env.local`
  - **Type**: config
  - **Purpose**: local dev values (placeholders).
  - **Key contents**: same keys as `.env.example`. AUTH_SECRET left blank with a comment to run `npx auth secret`.

- **Path**: `docker-compose.yml`
  - **Type**: config
  - **Purpose**: local MongoDB 7 container.
  - **Key contents**: exactly the YAML from the task description.

- **Path**: `vitest.config.ts`
  - **Type**: config
  - **Purpose**: Vitest setup — jsdom environment, RTL ready, path aliases via `vite-tsconfig-paths`.
  - **Key contents**: exactly the config from the task description.

- **Path**: `vitest.setup.ts`
  - **Type**: config
  - **Purpose**: imports `@testing-library/jest-dom` for DOM matchers.
  - **Key contents**: `import '@testing-library/jest-dom'`.

- **Path**: `middleware.ts`
  - **Type**: middleware
  - **Purpose**: NextAuth.js middleware export. Currently a pass-through with a commented `matcher` example.
  - **Key signature**:
    ```ts
    export { auth as middleware } from '@/lib/auth'
    // export const config = { matcher: ['/dashboard/:path*'] }  // example
    ```

- **Path**: `next-env.d.ts`
  - **Type**: type declaration
  - **Purpose**: Next.js ambient types. Generated automatically by `next dev` but builder should run dev once or create the standard 2-line stub so `tsc --noEmit` works pre-dev.

- **Path**: `README.md`
  - **Type**: docs
  - **Purpose**: project README per task requirements.
  - **Key contents**: Prerequisites (Node 20+, Docker), `docker compose up -d`, `npm install`, `npm run dev`, AUTH_SECRET generation (`npx auth secret`), folder structure overview.

### `/src/styles`

- **Path**: `src/styles/globals.css`
  - **Type**: style
  - **Purpose**: Tailwind base + structured CSS variables block for future tokens.
  - **Key contents**:
    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    :root {
      /* Design tokens go here */
    }
    ```

### `/src/lib`

- **Path**: `src/lib/utils.ts`
  - **Type**: util
  - **Purpose**: `cn()` class-name merger.
  - **Key signature**: `export function cn(...inputs: ClassValue[]): string` — uses `twMerge(clsx(inputs))` exactly per the task block.

- **Path**: `src/lib/db.ts`
  - **Type**: util
  - **Purpose**: provides (a) `connectDB()` Mongoose singleton for app code; (b) `clientPromise: Promise<MongoClient>` for the NextAuth MongoDB adapter. Safe across Next.js hot reload via `globalThis` caching.
  - **Key signature**:
    ```ts
    export function connectDB(): Promise<typeof mongoose>
    export const clientPromise: Promise<MongoClient>
    ```
  - **Implementation outline (structural — builder writes the bodies)**:
    - Read `MONGODB_URI` from `process.env`; throw clear error if missing.
    - Use a global cached connection (`globalThis.__mongoose`) keyed by promise + connection to avoid reconnecting in dev.
    - Separately export a `MongoClient` promise (cached the same way under `globalThis.__mongoClientPromise`) for the adapter.
    - On error: `console.error('[db] MongoDB connection error:', err)` then rethrow.

- **Path**: `src/lib/auth.ts`
  - **Type**: util (NextAuth config)
  - **Purpose**: central NextAuth.js v5 configuration.
  - **Key signature**:
    ```ts
    export const { handlers, auth, signIn, signOut } = NextAuth({
      adapter: MongoDBAdapter(clientPromise),
      session: { strategy: 'database' },
      providers: [],
      callbacks: {
        session: async ({ session, user }) => { /* extend session here */ return session },
        jwt: async ({ token }) => { /* extend token here */ return token },
      },
    })
    ```
  - Empty providers array. Adapter wired to `clientPromise` from `db.ts`. Comments mark where future logic goes.

### `/src/app`

- **Path**: `src/app/layout.tsx`
  - **Type**: page (root layout)
  - **Purpose**: root layout. Sets `<html lang="en">`, imports `globals.css`, exports metadata.
  - **Key signature**:
    ```ts
    export const metadata: Metadata = { title: 'Next.js App', description: 'Foundation app.' }
    export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element
    ```
  - Server component. No `"use client"`.

- **Path**: `src/app/page.tsx`
  - **Type**: page
  - **Purpose**: home page placeholder.
  - **Key signature**: `export default function HomePage(): JSX.Element`
  - Server component. Centered Tailwind layout (`min-h-screen flex items-center justify-center text-center`). Heading `"Next.js App"`, paragraph `"Foundation in place. Build features from here."`.

- **Path**: `src/app/api/auth/[...nextauth]/route.ts`
  - **Type**: api route
  - **Purpose**: NextAuth route handlers.
  - **Key signature**: `export const { GET, POST } = handlers` — re-exported from `@/lib/auth`.

### `.gitkeep` placeholders for empty folders

These keep the structure visible in git:

- `src/app/(auth)/.gitkeep`
- `src/app/api/.gitkeep` (the `[...nextauth]/route.ts` lives inside, so this `.gitkeep` is optional; builder may skip if the route file exists)
- `src/components/ui/.gitkeep`
- `src/components/features/.gitkeep`
- `src/components/layout/.gitkeep`
- `src/hooks/.gitkeep`
- `src/actions/.gitkeep`
- `__tests__/components/ui/.gitkeep`
- `__tests__/components/features/.gitkeep`
- `__tests__/components/layout/.gitkeep`
- `__tests__/hooks/.gitkeep`
- `__tests__/actions/.gitkeep`
- `__tests__/lib/.gitkeep`

### `/src/types`

- **Path**: `src/types/index.ts`
  - **Type**: type
  - **Purpose**: placeholder export so the file is valid TypeScript and `/types` is visible.
  - **Key contents**: `export {}`.

## Files to Modify
None. Greenfield project.

## Data Flow
There is no application data flow at this stage. The only data path is:

1. NextAuth requests (`/api/auth/*`) → `handlers` in `src/lib/auth.ts` → MongoDB adapter → MongoDB (via `clientPromise`). With no providers configured, the flow terminates harmlessly at NextAuth defaults.
2. App code that needs Mongoose models calls `connectDB()` from `src/lib/db.ts`. No such code exists yet.

No fetching from components. No server actions. No mutations.

## State Management
- **Server state**: none yet. Future server data lives in server components and server actions, per CLAUDE.md.
- **Client/UI state**: none yet. No `"use client"` files exist after this task.
- **Global state**: explicitly none. CLAUDE.md forbids Context API for global state and reserves the Zustand decision for a future task.

## Types

```ts
// src/types/index.ts
export {}
```

```ts
// src/lib/db.ts — exported shapes
export function connectDB(): Promise<typeof import('mongoose')>
export const clientPromise: Promise<import('mongodb').MongoClient>
```

```ts
// src/lib/auth.ts — re-exports from NextAuth() factory
export const handlers: {
  GET: (req: Request) => Promise<Response>
  POST: (req: Request) => Promise<Response>
}
export const auth: () => Promise<import('next-auth').Session | null>
export const signIn: typeof import('next-auth').signIn
export const signOut: typeof import('next-auth').signOut
```

```ts
// src/lib/utils.ts
import type { ClassValue } from 'clsx'
export function cn(...inputs: ClassValue[]): string
```

No domain types are introduced.

## File Tree

```
/
├── .env.example
├── .env.local
├── .gitignore
├── .prettierignore
├── .prettierrc
├── README.md
├── docker-compose.yml
├── eslint.config.mjs
├── middleware.ts
├── next-env.d.ts
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── vitest.setup.ts
├── __tests__/
│   ├── actions/.gitkeep
│   ├── components/
│   │   ├── features/.gitkeep
│   │   ├── layout/.gitkeep
│   │   └── ui/.gitkeep
│   ├── hooks/.gitkeep
│   └── lib/.gitkeep
└── src/
    ├── actions/.gitkeep
    ├── app/
    │   ├── (auth)/.gitkeep
    │   ├── api/
    │   │   └── auth/
    │   │       └── [...nextauth]/
    │   │           └── route.ts
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/
    │   ├── features/.gitkeep
    │   ├── layout/.gitkeep
    │   └── ui/.gitkeep
    ├── hooks/.gitkeep
    ├── lib/
    │   ├── auth.ts
    │   ├── db.ts
    │   └── utils.ts
    ├── styles/
    │   └── globals.css
    └── types/
        └── index.ts
```

## Build Order

The builder must follow this order to avoid dependency issues:

1. **Root config files**: `package.json`, `tsconfig.json`, `.gitignore`, `.prettierrc`, `.prettierignore`, `eslint.config.mjs`, `next.config.ts`, `postcss.config.mjs`, `tailwind.config.ts`.
2. **Run `npm install`** — installs all declared deps so subsequent steps can typecheck.
3. **Environment files**: `.env.example`, `.env.local`.
4. **Infra**: `docker-compose.yml`.
5. **Vitest config**: `vitest.config.ts`, `vitest.setup.ts`.
6. **Styles**: `src/styles/globals.css`.
7. **Lib (no internal deps first)**: `src/lib/utils.ts`.
8. **Lib (DB → Auth)**: `src/lib/db.ts`, then `src/lib/auth.ts` (auth depends on db's `clientPromise`).
9. **Middleware**: `middleware.ts` (depends on `@/lib/auth`).
10. **App routes**: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/api/auth/[...nextauth]/route.ts`.
11. **Types placeholder**: `src/types/index.ts`.
12. **Empty folder structure**: all `.gitkeep` files listed above.
13. **README.md**.
14. **Verify**:
    - `npx tsc --noEmit` — must pass with zero errors.
    - `npm run lint` — must pass with zero errors.
    - `npm run test:run` — must exit 0 (no tests found is acceptable).
    - `npm run dev` — must start without errors; reachable at `http://localhost:3000`.
