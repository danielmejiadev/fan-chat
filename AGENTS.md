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
- **Conditional JSX rendering uses `&&`, never a ternary with `null`.**
  `{condition && <Component />}`, not `{condition ? <Component /> : null}`.
  Only fall back to a ternary when both branches render something (an
  actual if/else, not an if/nothing).
- **Conditional `className` always goes through `clsx`, using its object
  form** — never a template literal or an inline `&&`/ternary string
  concatenation:

  ```tsx
  className={clsx("base classes", { "is-active-class": isActive })}
  ```

  not `` className={`base classes ${isActive ? "is-active-class" : ""}`} ``.
  Import it as `import { clsx } from "clsx"` (named import, not default —
  avoids the `import/no-named-as-default` ESLint warning).
- **Component props use a named `interface ComponentNameProps`, never an
  inline object type on the function signature:**

  ```tsx
  interface MessageBubbleProps {
    threadMessage: ThreadMessage;
    onRetry: (clientId: string) => void;
  }

  export function MessageBubble({ threadMessage, onRetry }: MessageBubbleProps) {
    // ...
  }
  ```

  not `export function MessageBubble({ threadMessage, onRetry }: {
  threadMessage: ThreadMessage; onRetry: (clientId: string) => void }) {`.
  The interface is named after the component (`MessageBubbleProps`,
  `IconButtonProps`), declared right above it in the same file — never
  reused across unrelated components even if two happen to share a shape.

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

**Screens stay as lite as possible.** A route file under `src/app/` only
composes components and wires a `hooks/` hook to them — no inline JSX
beyond that composition, no business logic, no raw styling. Components
are atomic: one component per file, named for what it renders (e.g.
`MessageBubble`, `MessageInput`, not one file with several sub-components
defined inline), each owning only the logic and markup it needs. If a
screen file is growing past a simple composition, extract another
component instead of nesting more JSX in the screen.

Anything shared by more than one feature module (a button, a formatter, a
cross-cutting hook, global constants) goes in `src/components/`,
`src/hooks/`, `src/utils/`, `src/lib/`, or `src/services/` at the root
level — never duplicated per module.

### `src/components/` subfolders: `ui/` vs `layout/`

- **`src/components/ui/`** — the native primitive library: `Text`,
  `TextInput`, `Icon`, `IconButton`, `Avatar`, and anything else in that
  same category (no business logic, no knowledge of the app's navigation
  or a specific screen).
- **`src/components/layout/`** — the app's navigational/structural shell:
  things like `DesktopSidebar`, `MobileTabBar`, `SidebarItem`, `TabIcon`.
  These compose `ui/` primitives but aren't primitives themselves, and
  they aren't a business-domain `features/` module either (no
  `hooks/`/`services/` of their own tied to a domain) — they're the frame
  the app's screens render inside.
- A component that's shared but doesn't fit either bucket (not a
  primitive, not navigation/layout) stays directly in `src/components/`.

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

### Design kit: primitives + semantic color tokens via CSS variables

Two-tier pattern (what shadcn/ui, Radix, and Material 3 all use, and what
Tailwind itself documents for v3): raw color **primitives** (a `primary`
50–950 scale, a neutral scale, …) feed **semantic** role tokens (`primary`,
`surface`, `background`, `error`, …). The semantic tokens are backed by CSS
custom properties, not static hex — re-theming becomes "change the
variable," not "grep every component."

- **One file, `src/design/colors.css`, is the single source of truth.**
  `@import`ed at the top of `global.css`, before `@tailwind base;`. Defines
  every raw value once, as a `:root` block (and a `.dark` block for dark
  mode, once real dark values exist — never fabricate them, leave the
  block scaffolded with a `TODO` comment until there's a real design
  reference).
- **Values are RGB channel triplets, not hex or `rgb()`/`hsl()` strings**
  (`--color-primary-500: 88 99 222;`, no wrapping function) — this is
  Tailwind v3's documented format for CSS-variable colors, and it's a hard
  requirement on React Native: RN's style engine doesn't understand
  `oklch()`/`hsl()` color functions at all, only hex/rgb. Tailwind v4's
  OKLCH-based `@theme` approach doesn't apply here for that same reason.
- **`tailwind.config.js` reads each variable with the alpha-value
  format**: `primary: { 500: "rgb(var(--color-primary-500) /
  <alpha-value>)", … }`. This keeps Tailwind's opacity modifiers working
  (`bg-primary/10`) and means a color like a "selected row" tint doesn't
  need its own separate token — it can just be `primary` at low alpha.
- **Every background token gets a matching `-foreground` token right next
  to it** (`primary` + `primary-foreground`, `surface` +
  `surface-foreground`, …) — the text/icon color guaranteed to read
  correctly on top of that background, instead of each component guessing.
  Grouped together in `colors.css` (background then its `-foreground`
  right below), not off in a separate "foreground" section.
- **No invented brand colors.** A semantic role only exists if the design
  source (Figma export, screenshots) actually has it — an app with only
  one brand color gets `primary` and skips `secondary` rather than
  fabricating a second one.
- **Third-party icon libraries (e.g. `@expo/vector-icons`) don't read
  `className`** — they take color through their own `color` prop. Wrap
  them once with NativeWind's `cssInterop()` (`src/components/Icon.tsx`:
  `cssInterop(Ionicons, { className: { target: "style",
  nativeStyleToProp: { color: true } } })`, re-exported with `className?:
  string` added to its prop type) so icons read the same tokens as
  everything else via `className="text-primary"` instead of a hardcoded
  hex `color` prop. This is the one legitimate reason to wrap a
  third-party component — do it once, centrally, never per call site.
- **Runtime overrides (per-session accent, a future dark-mode toggle,
  …) go through the same variables, not a second theming system.** A
  semantic var can point at an override var with a fallback:
  `--color-primary: var(--override-primary, 88 99 222);`. Something up
  the tree sets `--override-primary` once (NativeWind's `vars()` applied
  to a wrapping `View`, e.g. a `ThemeProvider`), and every component below
  it keeps using `bg-primary`/`text-primary` exactly as before, with zero
  awareness the value is dynamic. Don't invent a parallel prop-drilled
  theme object for this — the CSS variable indirection is the mechanism.

### Typography: named type scale, size and weight as separate classes

`theme.extend.fontSize` defines type roles by name (`h1`…`h5`, `body`,
`caption` — size + line-height only, anchored on the sizes already
confirmed by the Figma guides where they exist), not raw px values in
components.

- **On React Native, a custom font's weights are separate font files, not
  a `fontWeight` style on one family** — a browser can synthesize a bolder
  weight from a single font file, RN can't. `useFonts()` (in
  `src/app/_layout.tsx`) loads each weight under its own name
  (`Geist_400Regular`, `Geist_500Medium`, `Geist_600SemiBold`), and
  `theme.extend.fontFamily` exposes them as `font-sans` /
  `font-sans-medium` / `font-sans-semibold`.
- **Always pair a size class with a weight class**: `text-h4
  font-sans-medium`, never `text-h4 font-medium` — NativeWind's plain
  `font-medium`/`font-semibold` only set a numeric `fontWeight` style,
  which doesn't select the right Geist weight file on native.
- **Never import `Text`/`TextInput` from `react-native` directly — import
  them from `@/components/Text` / `@/components/TextInput`.** NativeWind
  doesn't apply a default font family the way a browser's `body {
  font-family }` cascade would (overriding `theme.fontFamily.sans` alone
  doesn't make it apply automatically — nativewind/nativewind#387), so
  these two thin wrappers bake `font-sans` (regular weight) in as the
  default. Callers only ever add `font-sans-medium`/`font-sans-semibold`
  when the weight actually deviates from regular — never `font-sans`
  itself, since it's already the default. Same pattern, same reasoning,
  as the `Icon` wrapper above — one central place, never per call site.

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
