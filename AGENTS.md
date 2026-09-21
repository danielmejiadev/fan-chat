# fan-chat — Agent conventions

Stack: Expo (React Native) + TypeScript (strict) + Expo Router (routes under
`src/app/`) + NativeWind v4 (Tailwind for RN) + pnpm.

## Code conventions

- **Variable names are always descriptive** — never a single letter or
  context-less (`e`, `el`, `li`, `i`, `s`, `d`...). Name things for what
  they hold (`event`, `element`, `index`...), even in small callbacks
  (`.map`, `.filter`, event handlers).
- **Code comments are in English, and rare.** Only write one when
  something isn't obvious from the code itself — a non-obvious "why", a
  constraint from a library/platform, a deliberate deviation from the
  usual pattern. Never restate what a well-named symbol already says (no
  `// Skeleton` above a `Skeleton` component). Keep the ones you do write
  to a sentence, not a paragraph.
- **Non-trivial logic stays out of components.** Anything that isn't pure
  render (formatting, slugs, computations, event-name constants) belongs
  in `utils/`, grouped by what it relates to, never written inline inside
  a component body.
- **Braces are mandatory on every `if`/`for`/`while`, always as a
  multi-line block.** Never a bare one-liner without braces:

  ```ts
  if (condition) {
    return ...
  }
  ```

  Never `if (condition) return x;`. Enforced via ESLint (`curly: ["error",
  "all"]`, already configured in `eslint.config.js`).

## Forms

`react-hook-form` + `zod` as the standard for any form with more than one
field:

- One `zod` schema per form, colocated with the form (e.g.
  `loginFormSchema` next to `LoginForm`) — the single source of truth.
- That same schema feeds both client-side validation (`zodResolver()`) and
  the form's TypeScript type (`z.infer<typeof schema>`) — never hand-write
  a parallel `interface` that can drift out of sync with the schema.
- If a backend endpoint also validates the same data, reuse the same
  schema (`.safeParse()`) instead of duplicating the rules there.
- A trivial single-field form (e.g. a search box) can stay a plain
  `useState` without needing this pattern.

## Data fetching / server state

TanStack Query (`@tanstack/react-query`) for any fetch that happens after
first render — never a hand-rolled `useEffect` + `fetch` + `useState`. The
fetcher lives in the corresponding module's `services/` (see "Modular
feature organization" below) and gets wrapped in a `useQuery`/`useMutation`
inside a `hooks/` hook.

## Shared global state

**Zustand** (`src/store/`) as the standard for global client state — UI
state, session, preferences, or any other state that lives outside what
React Query manages and that several unrelated components need to read or
write.

- **React Context is reserved for specific cases**: dependency injection
  (e.g. an already-configured client) or theming/configuration values that
  almost never change once mounted. It's not for state that changes
  frequently — that's Zustand's job, which avoids the cascading re-renders
  Context produces in that scenario.

## Modular feature organization

A single `src/` folder:

```
src/
  app/          — Expo Router routes (layouts, screens) only
  features/     — feature modules by domain (src/features/<name>/), each
                   with its own components/ and, where it has non-trivial
                   logic, its own hooks/, utils/, and services/
  components/   — shared UI
  hooks/        — shared hooks
  lib/          — configured clients (API client, etc.), low-level utils
  store/        — Zustand global stores
  context/      — React Context providers (DI / near-static theming only)
  constants/
  types/
```

Layers:

- **`services/`** — the only layer that touches network or external
  providers (the API client, a third-party SDK). Business rules live here.
  No JSX.
- **`hooks/`** — the client-side fetching layer: React Query hooks that
  call `services/`. No business logic, no direct network calls — that
  lives in `services/`.
- **`utils/`** — pure, deterministic helpers with no external calls. If it
  calls an external provider or depends on I/O, it's not `utils/`, it's
  `services/`.
- **`components/`** — all the real UI. Components call a hook from
  `hooks/` to read/mutate data — never `services/` directly.

Anything shared by more than one feature module (a button, a formatter, a
cross-cutting hook, global constants) goes in `src/components/`,
`src/hooks/`, `src/utils/`, `src/lib/`, or `src/services/` at the root
level — never duplicated per module.

## Global styles and theming

- Tailwind entry point: `src/global.css`, imported once in
  `src/app/_layout.tsx`. Design tokens (colors, spacing, etc.) live in
  `tailwind.config.js` — never hardcode colors inside a component's
  `className`.
- **Dynamic theming (accent color, dark mode) always through NativeWind's
  theme/tokens**, never hardcoded colors per component. Dark mode uses
  NativeWind's `dark:` variant (`darkMode: "class"` in
  `tailwind.config.js`).
- Never component-specific styling inside `tailwind.config.js` or
  `global.css` — that goes with the component (utility classes in JSX).

## Git & GitHub

- **No AI attribution in commits or PRs**: never a `Co-Authored-By`
  trailer from Claude/AI in a commit message, and never a "Generated by
  Claude" (or similar) line in a PR description.
- **Commits and PRs are always under the user's own identity**: git
  author/committer must always resolve to the user's own configured
  `user.name`/`user.email`, and any `gh` action must run under the user's
  own GitHub account. Before pushing or creating a PR, check
  `gh auth status` — if the active account isn't the user's, stop and ask
  them to switch it instead of proceeding.
- **Commit messages and PR titles/descriptions are always in English.**
