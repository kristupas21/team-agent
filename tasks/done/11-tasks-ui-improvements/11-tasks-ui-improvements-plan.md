# Build Plan: Tasks UI Improvements + Palette Revert

## Overview
One new file (`Textarea.tsx` + its test), six modifications. No new deps. No new domain models. Structural calls worth flagging:

1. **Palette + maxWidth in one config edit**: `tailwind.config.ts` gets both the palette swap and the new `maxWidth.content = '1100px'` entry. Single file, single commit-worthy change.
2. **`Textarea` mirrors `Input` exactly**: same `forwardRef` pattern, same variant map, same error rendering shape, same `cn()` composition. The only differences are the element (`<textarea>` vs `<input>`), the base class `resize-none`, and a `rows = 4` default.
3. **TaskCard adds two new behaviours via consumer-side classes + onClick prop forwarding through Card**: no edit to `Card.tsx` or `Button.tsx` needed. The `h-full`, `md:max-w-none`, `cursor-pointer`, `hover:shadow-lg`, `transition-shadow` flow through `cn()` + `tailwind-merge`. The `md:max-w-none` overrides Card's default `md:max-w-md` thanks to `tailwind-merge`'s conflict awareness.
4. **`stopPropagation` ordering matters**: Delete's `onClick` must call `event.stopPropagation()` **before** `onDelete(task._id)`. Calling `onDelete` first triggers React state changes that may invalidate the event before stopPropagation runs (rare but possible with synthetic events).
5. **Tests for `console.log`** use `vi.spyOn(console, 'log')` in a `beforeEach`. The TaskCard test file already mocks nothing in particular — adding the spy is the simplest extension.

## Reuse

Existing files unchanged:
- `src/lib/*` (auth, tasks, validation, etc.) — unchanged.
- `src/actions/*` — unchanged.
- `src/models/*` — unchanged.
- `src/middleware.ts`, `redirect-rules.ts` — unchanged.
- `src/components/ui/Button.tsx`, `Card.tsx`, `Input.tsx`, `buttonClass.ts` — unchanged.
- `src/components/features/MainHeader.tsx`, `MainHeaderNav.tsx`, `SignInForm.tsx`, `SignUpForm.tsx` — unchanged.
- `src/app/layout.tsx`, `(main)/layout.tsx`, `error.tsx`, `not-found.tsx`, `(main)/page.tsx`, sign-in/sign-up pages, `(main)/(private)/create-task/page.tsx` — unchanged.
- All other test files except the three listed below — unchanged.
- `vitest.config.mts`, `package.json`, `tsconfig.json`, etc. — unchanged.

## Files to Create

### `src/components/ui/Textarea.tsx`
- **Type**: client component (`'use client'`)
- **Purpose**: UI primitive — non-expandable textarea with variants + optional inline error.
- **Outline** (mirrors `src/components/ui/Input.tsx` shape):
  ```tsx
  'use client'

  import { forwardRef, type TextareaHTMLAttributes } from 'react'
  import { cn } from '@/lib/utils'

  type TextareaVariant = 'primary' | 'secondary' | 'danger'

  export type TextareaProps = Readonly<
    TextareaHTMLAttributes<HTMLTextAreaElement> & {
      variant?: TextareaVariant
      error?: string
    }
  >

  const BASE_CLASSES =
    'block w-full resize-none rounded-md border px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60'

  const VARIANT_CLASSES: Record<TextareaVariant, string> = {
    primary: 'border-neutral-200 focus-visible:ring-primary-500',
    secondary: 'border-neutral-200 focus-visible:ring-secondary-500',
    danger: 'border-danger-500 focus-visible:ring-danger-500',
  }

  const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
    { variant = 'primary', error, className, rows = 4, ...props },
    ref
  ) {
    const effectiveVariant: TextareaVariant = error ? 'danger' : variant

    return (
      <>
        <textarea
          ref={ref}
          rows={rows}
          className={cn(BASE_CLASSES, VARIANT_CLASSES[effectiveVariant], className)}
          {...props}
        />
        {error ? <p className="mt-1 text-base text-danger-500">{error}</p> : null}
      </>
    )
  })

  Textarea.displayName = 'Textarea'

  export default Textarea
  ```
- **Reference pattern**: `src/components/ui/Input.tsx` — byte-similar shape.

### `__tests__/components/ui/Textarea.test.tsx`
- Mirror of `__tests__/components/ui/Input.test.tsx` with `<Textarea>` and `getByPlaceholderText` queries against the rendered textarea.
- 9 cases:
  1. Renders a textarea with the provided placeholder.
  2. Applies primary variant classes by default.
  3. Applies secondary variant classes when `variant="secondary"`.
  4. Applies danger variant classes when `variant="danger"`.
  5. Disabled: `disabled` attribute + `disabled:opacity-60` + `disabled:cursor-not-allowed`.
  6. Renders error message + applies danger classes when `error` is set.
  7. Error overrides explicit non-danger variant.
  8. Forwards ref to the underlying `<textarea>` element (assert `ref.current?.tagName === 'TEXTAREA'`).
  9. `onChange` fires when the user types.

## Files to Modify

### `tailwind.config.ts`
- **What changes**:
  1. Replace every hex in `theme.extend.colors` with the `09-design-updates-retro` values (Assumption 1 in the spec).
  2. Add `theme.extend.maxWidth.content = '1100px'`.
- **Final `theme.extend` outline**:
  ```ts
  theme: {
    extend: {
      colors: {
        primary: { 50: '#e7f0ee', 500: '#7faaa3', 700: '#5f8b85' },
        secondary: { 50: '#f6e6e2', 500: '#c89b94', 700: '#a37b75' },
        neutral: {
          50: '#f5efe1',
          100: '#fbf7eb',
          200: '#e6dcc6',
          500: '#857c70',
          700: '#4a4030',
          900: '#2f2a23',
        },
        danger: { 50: '#f5e1dc', 500: '#c97c6d', 700: '#a35a4c' },
        success: { 50: '#e4e6cc', 500: '#8aa775', 700: '#688553' },
      },
      maxWidth: {
        content: '1100px',
      },
      fontFamily: { /* unchanged */ },
      fontSize: { /* unchanged */ },
      spacing: { /* unchanged */ },
    },
  },
  ```

### `src/components/features/TaskCard.tsx`
- **What changes**: full restructure per the spec's target shape.
- **Outline**:
  ```tsx
  'use client'

  import type { MouseEvent } from 'react'
  import { MdDelete } from 'react-icons/md'
  import Button from '@/components/ui/Button'
  import Card from '@/components/ui/Card'
  import type { TaskDoc } from '@/models/Task'

  type TaskCardProps = Readonly<{
    task: TaskDoc
    onDelete: (id: string) => void
    isDeleting: boolean
  }>

  export default function TaskCard({ task, onDelete, isDeleting }: TaskCardProps) {
    const handleCardClick = () => {
      console.log({ id: task._id, title: task.title })
    }

    const handleDeleteClick = (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onDelete(task._id)
    }

    return (
      <Card
        onClick={handleCardClick}
        className="h-full cursor-pointer transition-shadow hover:shadow-lg md:max-w-none"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-2xl text-neutral-900">{task.title}</h3>

          <Button
            type="button"
            variant="danger"
            aria-label="Delete"
            leftIcon={<MdDelete />}
            loading={isDeleting}
            onClick={handleDeleteClick}
          />
        </div>

        {task.description && (
          <p className="mt-2 text-base text-neutral-500">{task.description}</p>
        )}
      </Card>
    )
  }
  ```
- **Key choices**:
  - Card's `onClick` flows through via `HTMLAttributes<HTMLDivElement>` already spread inside `Card.tsx`. No Card edit.
  - The `className="... md:max-w-none ..."` overrides Card's default `md:max-w-md` via `tailwind-merge` inside `cn()`.
  - `event.stopPropagation()` runs BEFORE `onDelete(task._id)` — order is critical so the synthetic event's propagation is halted before any state update queues.
  - Title classes: `font-display text-2xl text-neutral-900`. The previous `font-semibold` is dropped — Oleo Script Swash Caps has its own implicit weight via `weight: ['400', '700']` on the font import.

### `src/components/features/TasksList.tsx`
- **What changes**: add `whileHover={{ scale: 1.02 }}` prop to the `motion.div`.
- **One-line addition** to the existing motion.div:
  ```tsx
  <motion.div
    key={task._id}
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    whileHover={{ scale: 1.02 }}      // ← NEW
    transition={{ duration: 0.2 }}
  >
  ```
- Nothing else changes in `TasksList.tsx`. The grid, the AnimatePresence wrapping, the delete handling, the "Create new task" link — all unchanged.

### `src/components/features/CreateTaskForm.tsx`
- **What changes**:
  1. Import `Textarea` from `@/components/ui/Textarea`.
  2. Replace the description `<Input>` with `<Textarea>`. The `{...register('description')}` spread continues to work because `Textarea` accepts all native `<textarea>` attributes.
  3. Change submit button text `"Create"` → `"Create Task"`.
- **Diff in spirit**:
  ```tsx
  // BEFORE
  import Input from '@/components/ui/Input'
  // ...
  <Input type="text" {...register('description')} ... />
  <Button ...>Create</Button>

  // AFTER
  import Input from '@/components/ui/Input'
  import Textarea from '@/components/ui/Textarea'
  // ...
  <Textarea {...register('description')} disabled={formState.isSubmitting} error={formState.errors.description?.message} />
  <Button ...>Create Task</Button>
  ```
- Title field continues to use `Input`. No changes to validation, RHF wiring, or the action call.

### `src/app/(main)/(private)/dashboard/page.tsx`
- **What changes**: one-token swap of the wrapper width.
- **Diff**: `max-w-3xl` → `max-w-content` in the inner `<div>`'s className.
- No other changes — the heading, `<TasksList />` render, `font-display` usage all stay.

### `__tests__/components/features/TaskCard.test.tsx`
- **What changes**: add 3 new test cases on top of the existing 4. Plus a `beforeEach` that mocks `console.log`.
- **New cases**:
  1. **Card click logs `{ id, title }`**:
     ```tsx
     it('logs { id, title } to the console when the card is clicked', async () => {
       const user = userEvent.setup()
       render(<TaskCard task={baseTask} onDelete={vi.fn()} isDeleting={false} />)

       await user.click(screen.getByText('Buy groceries'))

       expect(consoleSpy).toHaveBeenCalledTimes(1)
       expect(consoleSpy).toHaveBeenCalledWith({ id: 'task-1', title: 'Buy groceries' })
     })
     ```
  2. **Delete is icon-only (no visible "Delete" text)**:
     ```tsx
     it('renders the Delete button as icon-only via aria-label (no visible text "Delete")', () => {
       render(<TaskCard task={baseTask} onDelete={vi.fn()} isDeleting={false} />)

       const deleteButton = screen.getByRole('button', { name: 'Delete' })

       expect(deleteButton).toBeInTheDocument()
       expect(deleteButton).not.toHaveTextContent('Delete')
     })
     ```
  3. **Clicking Delete does NOT trigger card-click**:
     ```tsx
     it('does NOT log to console when the Delete button is clicked (stopPropagation)', async () => {
       const user = userEvent.setup()
       const onDelete = vi.fn()
       render(<TaskCard task={baseTask} onDelete={onDelete} isDeleting={false} />)

       await user.click(screen.getByRole('button', { name: 'Delete' }))

       expect(onDelete).toHaveBeenCalledTimes(1)
       expect(consoleSpy).not.toHaveBeenCalled()
     })
     ```
- **`beforeEach`** added at the top of the describe block:
  ```ts
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })
  ```
- **The existing 4 cases** are unchanged; they don't interact with `console.log` or the card-level click handler. The "delete button click calls `onDelete`" case becomes slightly stronger — same assertion, now backed by the spy demonstrating no spurious console output.

### `__tests__/components/features/CreateTaskForm.test.tsx`
- **What changes**: one matcher update.
- The existing "renders the title and description inputs and the Create button" test uses `getByRole('button', { name: /create/i })`. The new label is `"Create Task"`, which still matches `/create/i`. **No assertion change needed** — `/create/i` is a substring match.
- Similarly, the "calls createTaskAction once" test clicks `getByRole('button', { name: /create/i })` — still works.
- The "renders root error" test triggers a submit by clicking the button — same matcher; still works.
- The "Loading..." pending-state test queries by `{ name: /loading/i }` — unaffected.
- **All 6 existing tests continue to pass without modification.** The `/create/i` matcher is intentionally a substring and survives the relabel.

**However**, one structural concern: the description query `getByRole('textbox', { name: /description/i })` works for both `<input>` and `<textarea>` since both expose the `textbox` ARIA role. No edit needed.

Net: `CreateTaskForm.test.tsx` requires NO edits. Existing 6 cases stay green.

## File Tree

```
/
├── tailwind.config.ts                                       (modified — palette revert + maxWidth.content)
└── src/
    ├── app/(main)/(private)/dashboard/page.tsx              (modified — max-w-3xl → max-w-content)
    └── components/
        ├── ui/Textarea.tsx                                  (new)
        └── features/
            ├── TaskCard.tsx                                 (modified — full restructure)
            ├── TasksList.tsx                                (modified — +whileHover)
            └── CreateTaskForm.tsx                           (modified — Input→Textarea, Create→Create Task)

__tests__/
├── components/ui/Textarea.test.tsx                          (new)
└── components/features/TaskCard.test.tsx                    (modified — +3 cases, +console.log spy)
```

## Build Order

1. **`tailwind.config.ts`** — palette revert + `maxWidth.content = '1100px'`. Single file.
2. **`src/components/ui/Textarea.tsx`** — new file. No dependencies on other new files.
3. **Intermediate `tsc --noEmit`** — confirm Textarea compiles cleanly.
4. **`src/components/features/TaskCard.tsx`** — restructure.
5. **`src/components/features/TasksList.tsx`** — add `whileHover` prop.
6. **`src/components/features/CreateTaskForm.tsx`** — swap Input→Textarea, change button text.
7. **`src/app/(main)/(private)/dashboard/page.tsx`** — wrapper width swap.
8. **`__tests__/components/ui/Textarea.test.tsx`** — 9 cases.
9. **`__tests__/components/features/TaskCard.test.tsx`** — extend with 3 new cases + console.log spy in beforeEach/afterEach.
10. **Verify**:
    - `npx tsc --noEmit` → exit 0.
    - `npm run lint` → exit 0.
    - `npm run test:run` → exit 0 with **at least 134 tests across 20 files** (122 previous + 9 new Textarea + 3 new TaskCard).
    - `rm -rf .next && npx next build` → exit 0. Route table unchanged from `10-tasks`.
11. **Diagnostic sweep**: `mcp__ide__getDiagnostics`. Clean expected in `/src` and `/__tests__`.
12. **CSS palette + maxWidth verification (optional)**:
    - `find .next -name "*.css" -exec grep -l "rgb(127 170 163)" {} \;` — confirms primary-500 (`#7faaa3`).
    - `find .next -name "*.css" -exec grep -l "max-w-content" {} \;` — should find the rule mapping `.max-w-content { max-width: 1100px }`.
13. **No runtime smoke required.** All behavioural ACs covered by unit/RTL tests; visual ACs are flow-through via Tailwind class names.

## Notes for the Builder

- **`tailwind-merge` conflict awareness on max-width**: `tailwind-merge` (used inside `cn()`) is class-conflict-aware. Adding `md:max-w-none` from the TaskCard consumer overrides the Card's default `md:max-w-md`. Verify visually: at `md` viewport widths, the card should span its full grid column rather than capping at 28 rem.
- **`stopPropagation` order**: in TaskCard's `handleDeleteClick`, call `event.stopPropagation()` BEFORE `onDelete(task._id)`. The order matters because React's synthetic event pooling might invalidate the event after a state-mutating callback fires. The test asserts `consoleSpy` was NOT called when Delete is clicked — that's only true if propagation is stopped.
- **`'use client'` placement**: Textarea needs `'use client'` because it forwards a ref and consumes `onChange`. TaskCard already has `'use client'` from `10-tasks`; the new handlers don't change that.
- **Mocking `console.log`**: the spy mock pattern is `vi.spyOn(console, 'log').mockImplementation(() => undefined)`. The `mockImplementation` silences the actual output so test logs stay clean. Restore in `afterEach`.
- **Card's `onClick` prop forwarding**: `Card.tsx` spreads `{...props}` onto the underlying `<div>`. The TypeScript signature `HTMLAttributes<HTMLDivElement>` includes `onClick`. No Card edit needed.
- **Textarea ref-forwarding test**: use `createRef<HTMLTextAreaElement>()` and render `<Textarea ref={ref} placeholder="p" />`, then assert `ref.current?.tagName === 'TEXTAREA'` and `ref.current === screen.getByPlaceholderText('p')`.
- **Submit button matcher in CreateTaskForm tests**: existing `/create/i` matcher continues to work for `"Create Task"`. No edit needed.
- **Visual rhythm**: follow CLAUDE.md's "Code Layout — Visual Rhythm" in all new and modified files.
