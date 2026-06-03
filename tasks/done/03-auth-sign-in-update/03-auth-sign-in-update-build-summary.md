# Build Summary: Auth — Sign In Update

## Files Created
None.

## Files Modified

### `package.json`
Added two production dependencies:
- `react-hook-form` (^7.53.2)
- `@hookform/resolvers` (^3.9.1)
No script changes. No devDependency changes.

### `src/lib/validation/signIn.ts`
Replaced the password chain.
- **Was**: `.min(8, 'Password must be at least 8 characters.').max(128, 'Password is too long.')`
- **Now**: `.min(1, 'Password is required.').max(128, 'Password is too long.')`
The exported names (`signInSchema`, `SignInInput`) and the inferred type are unchanged. All call-sites (`signInAction`, `Credentials.authorize`, `SignInForm`) consume the relaxed schema without code edits.

### `src/app/(auth)/sign-in/SignInForm.tsx`
Rewritten to use `react-hook-form` + `zodResolver`.
- Imports removed: `useState`, `useTransition`, `type FormEvent`.
- Imports added: `useForm` from `react-hook-form`, `zodResolver` from `@hookform/resolvers/zod`, `type SignInInput` from `@/lib/validation/signIn`.
- Form state: now owned entirely by RHF (`useForm<SignInInput>({ resolver: zodResolver(signInSchema) })`).
- Validation: declarative via the resolver — no manual `safeParse` call.
- Pending state: `formState.isSubmitting` (set automatically while the async `onValid` handler runs). `useTransition` removed.
- Server-error handling: `setError('root', { message: result.error })` inside `onValid`; rendered as `<p>{formState.errors.root.message}</p>` below the submit button.
- Per-field errors: rendered as `<p>{formState.errors.<field>.message}</p>` immediately under each input (new placement).
- `clearErrors('root')` is called at the top of `onValid` to satisfy AC #8 (the previous server error must not render during a fresh submit).
- `'use client'` directive retained; still the only client boundary on the sign-in path.

### `src/app/page.tsx`
- Heading text is now a ternary on `name`: signed-in renders `"Welcome, ${name}"`; signed-out renders `"Hello there"`. Same `text-4xl font-semibold` classes.
- Paragraph text is now a ternary on `name`: signed-in renders `"You're signed in."`; signed-out renders `"Please sign in to continue."`. Same `mt-4 text-base text-gray-600` classes.
- The previous standalone `<p>{name}</p>` element in the signed-in branch is removed — the name lives in the heading now, so showing it twice was redundant.
- The Sign Out form (signed-in) and `<Link href="/sign-in">Sign In</Link>` (signed-out) remain unchanged in placement and markup.
- The centered Tailwind wrapper (`<main className="flex min-h-screen items-center justify-center">` + inner `<div className="text-center">`) is preserved.

## Deviations

None worth flagging. The plan was followed step-for-step. The only stylistic micro-choice was the JSX template literal `` `Welcome, ${name}` `` versus string concatenation; chose the template literal for clarity. No structural impact.

## Ambiguities

None required `// NOTE:` markers. Two judgment calls handled inline:

- **`clearErrors('root')` placement** — at the very top of `onValid`. The plan suggested this exact location to satisfy AC #8. The alternative (only clearing inside the `if (!result.success)` branch) would leave a stale root error visible on a successful submit, which would race with `router.push('/')` but is observable in dev tools. Top-of-handler clearing eliminates the race.
- **`onValid` return type explicitly `Promise<void>`** — react-hook-form's `handleSubmit` accepts any `SubmitHandler`; declaring the return type explicitly aligns with the CLAUDE.md rule "All server action return types must be explicit" — which doesn't strictly cover client handlers, but the same principle applies and matches the plan's spelled-out signature.

## Known Issues

- **The two markdown diagnostics in `tasks/incoming/auth-sign-in-update.md`** (Expression expected at lines 30 and 37) are markdown-parser false positives caused by the IDE trying to parse JSX-like content (`<p>{name}</p>`, `<Link href="/sign-in">`) inside prose. Not source code, not a real issue. Will go away when we archive the task to `tasks/done/...`.
- **`bcryptjs` audit warnings** still surface — unchanged from the previous task, out of scope.
- **`next lint` deprecation warning** still emits — unchanged, tracked in the prior reviews.
- **`SignInInput`** type inferred from `signInSchema` continues to be re-exported from the validation module. RHF infers `name`/`password` fields from the generic parameter, so any future drift between the schema and the form would surface at compile time.
- **No `revalidatePath('/')` after sign-out** — same as before. Next's form-action auto re-render covers it; verified by `next build` only. If the manual smoke shows stale UI, add the call to `signOutAction`.

## Verification Run

- `npx tsc --noEmit` — exit 0, no diagnostics.
- `npm run lint` — "No ESLint warnings or errors".
- `npm run test:run` — exit 0 (still no tests by design).
- `npx next build` — succeeded. Route set unchanged: `ƒ /`, `ƒ /sign-in`, `ƒ /api/auth/[...nextauth]`, `○ /_not-found`. Note that `/sign-in` First Load JS grew from 116 kB → 126 kB and main bundle from 13.8 kB → 23.4 kB, attributable to react-hook-form being included.
- `mcp__ide__getDiagnostics` — no diagnostics in any `src` or `scripts` file. (Two false positives in the task brief markdown, unrelated.)

Runtime path (form submit → action → JWT cookie → home page re-render) was not exercised by the builder; the dev-run manual checklist is in the architect plan's step 8.
