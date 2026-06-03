# Build Summary: Initial Next.js App Setup

## Files Created

### Root config
- `package.json` — deps, devDeps, scripts (`dev`, `build`, `start`, `lint`, `test`, `test:run`, `test:coverage`).
- `tsconfig.json` — strict TS, `@/*` path alias, Next.js plugin.
- `next.config.ts` — empty `NextConfig`.
- `tailwind.config.ts` — scans `./src/**/*.{ts,tsx}`.
- `postcss.config.mjs` — Tailwind + Autoprefixer plugins.
- `eslint.config.mjs` — flat config extending `next/core-web-vitals` and `next/typescript`.
- `.prettierrc` — `semi: false`, `singleQuote: true`, `tabWidth: 2`, `trailingComma: 'es5'`, `printWidth: 100`, `prettier-plugin-tailwindcss`.
- `.prettierignore` — `.next`, `node_modules`, `public`, `coverage`.
- `.gitignore` — standard Next.js/Node + `.env*.local`. Keeps `next-env.d.ts` committed.
- `.env.example` — `NEXT_PUBLIC_APP_URL`, `AUTH_SECRET`, `AUTH_URL`, `MONGODB_URI`.
- `.env.local` — same keys with placeholder values.
- `docker-compose.yml` — MongoDB 7 container (`app_mongo`) on port 27017.
- `vitest.config.mts` — jsdom env, RTL-ready, path aliases, `passWithNoTests: true`. (See Deviations.)
- `vitest.setup.ts` — imports `@testing-library/jest-dom`.
- `middleware.ts` — re-exports NextAuth `auth` as middleware; commented `matcher` example.
- `next-env.d.ts` — Next ambient types (touched by `next lint` to add routes reference).
- `README.md` — prereqs, setup, scripts, folder overview.

### Source
- `src/styles/globals.css` — Tailwind base/components/utilities + empty `:root` token block.
- `src/lib/utils.ts` — `cn()` via `twMerge(clsx(...))`.
- `src/lib/db.ts` — Mongoose `connectDB()` singleton + `clientPromise` for NextAuth adapter, both cached on `globalThis` for hot-reload safety. Throws on missing `MONGODB_URI`.
- `src/lib/auth.ts` — Auth.js v5 config with `MongoDBAdapter`, `database` session strategy, empty providers, stubbed `session`/`jwt` callbacks.
- `src/app/layout.tsx` — root layout, `<html lang="en">`, imports `globals.css`, metadata.
- `src/app/page.tsx` — home page (server component), centered placeholder.
- `src/app/api/auth/[...nextauth]/route.ts` — re-exports `{ GET, POST } = handlers`.
- `src/types/index.ts` — placeholder `export {}`.

### Placeholders for empty folders (`.gitkeep`)
`src/app/(auth)`, `src/components/ui`, `src/components/features`, `src/components/layout`, `src/hooks`, `src/actions`, `__tests__/components/ui`, `__tests__/components/features`, `__tests__/components/layout`, `__tests__/hooks`, `__tests__/actions`, `__tests__/lib`.

## Files Modified
None. Greenfield project. (`next-env.d.ts` was touched by `next lint` after creation to add the routes type reference — automatic, intentional.)

## Deviations

1. **`vitest.config.ts` → `vitest.config.mts`**
   The architect's plan called for `vitest.config.ts`. `vite-tsconfig-paths` is published as ESM-only; loading it from a `.ts` config goes through esbuild's `externalize-deps` plugin and fails with `"ESM file cannot be loaded by require"`. Renaming to `.mts` forces Vitest's loader to treat the file as ESM and resolves the import cleanly. No structural impact — Vitest auto-discovers `vitest.config.{ts,mts,js,mjs}`. Acceptance criterion 12 still holds.

2. **`passWithNoTests: true` added to `vitest.config.mts`**
   The architect's plan did not list this flag explicitly, but acceptance criterion 6 requires `npm run test:run` to exit 0 when no tests are present. Vitest's default is to exit 1 on "no tests found". Setting `passWithNoTests: true` is the minimal config change to satisfy the criterion. It remains correct once tests are added (it only changes behaviour when zero tests match).

## Ambiguities

None that required `// NOTE:` markers in code. The two deviations above are documented here rather than inline because they relate to config behaviour, not implementation choices in app code.

## Known Issues

- `npm install` reported `9 vulnerabilities (7 moderate, 2 critical)` in transitive deps. None are in direct deps and `npm audit fix --force` would pull breaking changes. Recommend leaving for a follow-up task.
- `npm run lint` prints a deprecation warning from Next.js 15 that `next lint` will be removed in Next 16. The lint still passes. Migration to the ESLint CLI is a follow-up task.
- `.env.local` is committed-shaped (placeholder values, no real secret). `AUTH_SECRET` is blank — must be filled by the developer with `npx auth secret` before any auth flow is exercised.
- `src/lib/db.ts` throws at module load if `MONGODB_URI` is missing. Today no path imports it during page render (home page is data-less), so the home page still renders without Mongo. If a future change imports `db.ts` from a page or layout, missing `MONGODB_URI` would break that page — reviewer should note this when DB-using code lands.
- `connectDB()` and `clientPromise` use the same `MONGODB_URI` but maintain separate connection pools (one Mongoose, one MongoDB driver). This is the standard pattern for Auth.js v5 + Mongoose coexistence but does double the connection count. Acceptable for this stage; revisit if connection pressure becomes an issue.

## Verification Run

All required commands executed locally before finishing the build:

- `npx tsc --noEmit` → exit 0, no diagnostics.
- `npm run lint` → exit 0, "No ESLint warnings or errors".
- `npm run test:run` → exit 0, "No test files found".
- `npx next build` → succeeded; routes detected: `/`, `/_not-found`, `/api/auth/[...nextauth]`.

`npm run dev` was not started by the builder (long-running). `next build` is sufficient evidence the app compiles end-to-end; the test agent or reviewer can launch `dev` if needed.
