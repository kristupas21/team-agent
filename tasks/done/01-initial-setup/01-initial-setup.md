# Task: Initial Next.js App Setup

## Description
Scaffold a new Next.js application from scratch. No business logic. The goal is a clean, runnable foundation that every future feature task builds on top of. All tooling configured, all conventions from `CLAUDE.md` in place, folder structure established.

## Stack
- Next.js with App Router
- TypeScript (strict mode)
- Tailwind CSS + tailwind-merge + clsx
- NextAuth.js (Auth.js v5) — skeleton only
- MongoDB — local instance via Docker (no external registration)
- Mongoose — ODM for MongoDB
- ESLint (Next.js recommended config)
- Prettier
- Vitest + React Testing Library + `@testing-library/jest-dom` + `@testing-library/user-event`

## Pages
Single page at this stage:
- `/` — home page with placeholder heading and paragraph text. No logic, no data. Just confirms the app runs and is styled.

## Folder Structure to Create
Follow `CLAUDE.md` exactly. All folders created, index files or `.gitkeep` where needed so structure is visible:

```
/src
  /app
    /api
    /(auth)
    layout.tsx
    page.tsx
  /components
    /ui
    /features
    /layout
  /lib
    auth.ts
    db.ts
    utils.ts
  /types
    index.ts
  /hooks
  /actions
  /styles
    globals.css
middleware.ts
```

## Configuration Files to Set Up

### TypeScript
- `tsconfig.json` with strict mode on
- Path alias: `@/*` maps to `./src/*`

### Tailwind
- `tailwind.config.ts` configured for `/src` directory
- `globals.css` with Tailwind base/components/utilities imports
- CSS variables block in `globals.css` for future design tokens (empty but structured)

### ESLint
- `.eslintrc.json` using `next/core-web-vitals` and `next/typescript`
- No overrides — recommended settings only

### Prettier
- `.prettierrc` with these settings:
  - `semi: false`
  - `singleQuote: true`
  - `tabWidth: 2`
  - `trailingComma: 'es5'`
  - `printWidth: 100`
  - `plugins: ['prettier-plugin-tailwindcss']` for automatic Tailwind class sorting
- `.prettierignore` excluding `.next`, `node_modules`, `public`

### Environment Variables
- `.env.local` with all required variables (values as placeholders)
- `.env.example` documenting every variable — this is committed to git

Required variables:
```
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# NextAuth
AUTH_SECRET=                  # generate with: npx auth secret
AUTH_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/appdb
```

## MongoDB Setup

### Why Docker
No external registration required. MongoDB runs locally in a Docker container.

### docker-compose.yml
Create at project root:
```yaml
services:
  mongo:
    image: mongo:7
    container_name: app_mongo
    ports:
      - '27017:27017'
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

### Mongoose connection
`/src/lib/db.ts` — singleton connection pattern safe for Next.js hot reload:
- Connects once and reuses the connection across requests
- Reads `MONGODB_URI` from environment
- Exports a `connectDB()` function called at the top of server actions and API routes that need DB access
- Handles connection errors gracefully with a console error and rethrow

## NextAuth Skeleton

`/src/lib/auth.ts`:
- NextAuth config exported as `{ handlers, auth, signIn, signOut }`
- Providers array: empty, ready for providers to be added in a future task
- Adapter: MongoDBAdapter wired to the Mongoose connection
- Session strategy: `database`
- Callbacks: empty stubs for `session` and `jwt`, commented with where logic goes

`/src/app/api/auth/[...nextauth]/route.ts`:
- Re-exports `handlers` from `/lib/auth.ts` as `GET` and `POST`

`middleware.ts` at project root:
- Exports NextAuth middleware
- `matcher` config protecting nothing yet — commented example showing how to add protected routes

## `cn()` Utility
`/src/lib/utils.ts` must export a `cn()` helper:
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
This is the only way class names are merged anywhere in the codebase.

## Root Layout
`/src/app/layout.tsx`:
- Sets `<html lang="en">`
- Imports `globals.css`
- Metadata export with placeholder title and description
- No font setup yet — use Tailwind's default sans stack for now

## Home Page
`/src/app/page.tsx`:
- Server component (no `"use client"`)
- Centered layout using Tailwind
- Placeholder `<h1>` and `<p>` — just enough to confirm styles are loading
- No business logic, no data fetching

## Testing Setup

### Vitest (unit/component tests)

`vitest.config.ts` at project root — NOT inside `next.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
})
```

`vitest.setup.ts` at project root:
```ts
import '@testing-library/jest-dom'
```

`/__tests__` folder at project root — empty subfolders matching `/src` structure:
```
/__tests__
  /components
    /ui
    /features
    /layout
  /hooks
  /actions
  /lib
```

Add to `package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

## README.md
Create at project root covering:
- Prerequisites (Node version, Docker)
- How to start MongoDB: `docker compose up -d`
- How to install and run: `npm install` → `npm run dev`
- How to generate `AUTH_SECRET`
- Brief explanation of folder structure

## Done Criteria
- `npm run dev` starts without errors
- Home page renders at `http://localhost:3000` with placeholder text and Tailwind styles applied
- `tsc --noEmit` passes with zero errors
- `npm run lint` passes with zero errors
- `npm run test:run` passes (no tests yet, but Vitest runs without config errors)
- MongoDB container starts with `docker compose up -d` and the app connects without errors
- `.env.example` is committed, `.env.local` is in `.gitignore`
- All folders from `CLAUDE.md` structure exist including `/__tests__`
- `cn()` utility is in place and importable
- NextAuth route handler responds at `/api/auth/*`
- `middleware.ts` is in place
- `vitest.config.ts` and `vitest.setup.ts` are in place

## What This Task Does NOT Include
- Any auth provider configuration
- Any database models or schemas
- Any UI components beyond the home page
- Any business logic of any kind
- Any actual test cases — Vitest is configured and scaffolded, but no tests are written yet
