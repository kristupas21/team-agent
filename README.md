# Next.js App

Foundation Next.js application. App Router, TypeScript strict, Tailwind, NextAuth.js skeleton, MongoDB via local Docker, Vitest + React Testing Library.

## Prerequisites

- Node.js 20+
- Docker (for the local MongoDB container)

## Getting Started

1. Start MongoDB:
   ```
   docker compose up -d
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Copy environment variables and fill them in:
   ```
   cp .env.example .env.local
   ```
4. Generate an `AUTH_SECRET` for NextAuth and paste it into `.env.local`:
   ```
   npx auth secret
   ```
5. Seed the admin user (see [Admin User](#admin-user) below).
6. Run the dev server:
   ```
   npm run dev
   ```
7. Open http://localhost:3000.

## Admin User

The app has a single pre-seeded admin user — no sign-up flow. Set the credentials in `.env.local`:

```
ADMIN_NAME=admin
ADMIN_PASSWORD=<choose-something-strong>
```

Run the seed script once. It's idempotent — re-running it will skip if the user already exists:

```
npm run seed:admin
```

Then visit http://localhost:3000, click **Sign In**, and authenticate with those credentials. Click **Sign Out** on the home page to end the session.

## Scripts

- `npm run dev` — start the Next.js dev server.
- `npm run build` — production build.
- `npm run start` — start the production build.
- `npm run lint` — ESLint.
- `npm run test` / `npm run test:run` — Vitest.
- `npm run test:coverage` — Vitest with coverage.
- `npm run seed:admin` — seed the admin user from `.env.local`.

## Folder Structure

```
/src
  /app          App Router routes (layout.tsx, page.tsx, /api, route groups)
  /components   /ui (generic), /features (feature), /layout (structural)
  /lib          auth.ts (NextAuth), db.ts (Mongo/Mongoose), utils.ts (cn)
  /types        Shared TypeScript types
  /hooks        Client hooks
  /actions      Server actions
  /styles       globals.css (Tailwind base + design tokens)
/__tests__      Mirrors /src for Vitest + RTL tests
middleware.ts   NextAuth middleware (no protected routes yet)
```

See `CLAUDE.md` for full project conventions.
