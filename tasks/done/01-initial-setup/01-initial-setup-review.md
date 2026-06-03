# Review: Initial Next.js App Setup

## STATUS: PASS

## Acceptance Criteria Check

- [x] 1 — `docker-compose.yml` defines `mongo:7` image, `app_mongo` container, port `27017:27017`, named volume `mongo_data`. Matches spec exactly.
- [x] 2 — `npx next build` succeeded end-to-end (verified by builder). `npm run dev` will start cleanly.
- [x] 3 — `src/app/page.tsx` renders `<h1>Next.js App</h1>` and `<p>Foundation in place. Build features from here.</p>` inside `<main className="flex min-h-screen items-center justify-center">` with `<div className="text-center">`. Matches spec strings and centering approach.
- [x] 4 — `tsc --noEmit` exits 0 (verified post-build).
- [x] 5 — `npm run lint` exits 0 — "No ESLint warnings or errors".
- [x] 6 — `npm run test:run` exits 0 — "No test files found, exiting with code 0" (achieved via `passWithNoTests: true`).
- [x] 7 — All required folders exist: `src/app`, `src/app/api`, `src/app/(auth)`, `src/components/{ui,features,layout}`, `src/lib`, `src/types`, `src/hooks`, `src/actions`, `src/styles`, and the `__tests__` mirror. `.gitkeep` placeholders are in place.
- [x] 8 — `src/lib/utils.ts` exports `cn(...inputs)` returning `twMerge(clsx(inputs))`. Identical to the spec's required block — `cn('a','b') → 'a b'` and `cn('p-2','p-4') → 'p-4'` are direct consequences of `twMerge`. Verified by inspection. (No unit test added — see Notes.)
- [x] 9 — `src/app/api/auth/[...nextauth]/route.ts` re-exports `{ GET, POST } = handlers`. `next build` confirms the route is registered as `ƒ /api/auth/[...nextauth]`. NextAuth's default empty-providers response satisfies "returns 200 + empty session" semantics.
- [x] 10 — `.env.example` is present at project root; `.gitignore` contains `.env*.local` (excludes `.env.local`). Pattern is broader than spec wording but strictly satisfies it.
- [x] 11 — `middleware.ts` exports `auth as middleware` and includes a commented `matcher` example. No routes are currently protected.
- [x] 12 — `vitest.config.mts` declares `environment: 'jsdom'` and uses `vite-tsconfig-paths` for `@/*` resolution. Vitest started without config errors. The `.mts` extension (vs the plan's `.ts`) is the documented builder deviation and is functionally equivalent — Vitest auto-discovers both.
- [x] 13 — `tailwind.config.ts` has `content: ['./src/**/*.{ts,tsx}']`. The `next build` output includes the home page with Tailwind classes applied.
- [x] 14 — `.prettierrc` contains exactly: `semi: false`, `singleQuote: true`, `tabWidth: 2`, `trailingComma: 'es5'`, `printWidth: 100`, `plugins: ["prettier-plugin-tailwindcss"]`.
- [x] 15 — `README.md` documents prerequisites (Node 20+, Docker), `docker compose up -d`, `npm install`, `npm run dev`, `npx auth secret`, and an overview of `/src` folder structure.
- [x] 16 — `.env.example` lists exactly `NEXT_PUBLIC_APP_URL`, `AUTH_SECRET`, `AUTH_URL`, `MONGODB_URI` with the comment annotations from the task description.
- [x] 17 — `grep "use client" src/` returns nothing. Home page is a server component.
- [x] 18 — `grep` confirms no `: any`, no `getServerSideProps`, no `getStaticProps`, no `useEffect` in `/src`. TS strict + ESLint flat config are wired to keep it that way.

## Blockers
None.

## Notes (non-blocking)

1. **Builder deviation #1 — `vitest.config.mts`** (build summary §Deviations). Renaming was necessary because `vite-tsconfig-paths` is pure ESM. Documented and justified. Worth a one-line mention in README if the team later wonders why the config has an `.mts` extension.

2. **Builder deviation #2 — `passWithNoTests: true`** (build summary §Deviations). Required to satisfy AC 6 today. Once real tests exist, the flag is harmless (only triggers on the empty-collection case). Worth removing once the first test lands so accidentally-deleted suites don't pass silently — but not blocking.

3. **`src/lib/db.ts` throws at module load when `MONGODB_URI` is missing.** Today no page/layout imports it, so the home page still renders. As soon as a server component imports anything that imports `db.ts`, a missing `MONGODB_URI` will break that page. Acceptable for the scaffold stage but the *first* DB-touching task should consider whether to move the check inside `connectDB()` so import-time stays safe. Not in scope here.

4. **Two MongoDB connection pools** — one from Mongoose (`connectDB()`), one from the driver (`clientPromise` for `MongoDBAdapter`). This is the standard Auth.js v5 + Mongoose pattern and matches the architect's plan. Reviewer flags it only as something to track if connection pressure ever becomes real.

5. **`AUTH_SECRET` is blank in `.env.local`.** README tells the developer to run `npx auth secret`. NextAuth will refuse to start until that's done. Not a code issue — just a developer-onboarding step.

6. **`cn()` is untested.** Per the spec's explicit no-tests scope, the test agent correctly skipped it. The test-results doc flags it as the first cheap test to add when the test suite gains its first real entry.

7. **`next lint` deprecation warning** appears on every `npm run lint`. Next.js 15 surfaces a notice that `next lint` will be removed in Next 16 and points to `npx @next/codemod@canary next-lint-to-eslint-cli .`. Migration is a follow-up task — does not affect current correctness.

8. **`npm audit` reports 9 vulnerabilities** (7 moderate, 2 critical) in transitive dependencies post-install. `npm audit fix --force` would pull breaking changes. Leave for a dedicated dependency-hygiene task; not in scope here.

## Approved Files

All implementation files. Listed in detail in the build summary §Files Created.

- Root config: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `.gitignore`, `.env.example`, `.env.local`, `next-env.d.ts`, `docker-compose.yml`, `vitest.config.mts`, `vitest.setup.ts`, `middleware.ts`, `README.md`.
- Source: `src/styles/globals.css`, `src/lib/utils.ts`, `src/lib/db.ts`, `src/lib/auth.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/api/auth/[...nextauth]/route.ts`, `src/types/index.ts`.
- Placeholders: all listed `.gitkeep` files in `src/` and `__tests__/`.

No files require changes. STATUS: PASS.
