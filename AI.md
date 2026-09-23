# AI.md

How AI assistance was used to build this project, for whoever grades it.

## Tool

**Claude Code (Sonnet)**, used interactively throughout — no other AI
tool or code-gen pipeline involved.

## Working method

Two files carried the process:

- **`PLAN.md`** is the single source of truth for progress. This task
  runs 6–7 hours across multiple sessions, and an agent (or a different
  model, or a different session of the same model) has no memory between
  sessions — `PLAN.md` is what lets any of them resume without losing
  context: architecture decisions already made, what's checked off per
  phase, and a "Work in progress" section for whatever bug is mid-diagnosis
  at the moment a session ends. The rule enforced throughout: mark `[x]`
  the same turn something is finished, never later, and if the file and
  the code ever disagree, the code wins and the file gets corrected (this
  is literally what the PLAN.md fix committed alongside this file was —
  a stale note claiming `SQLiteProvider` and `getDatabase()` opened two
  different SQLite files, which stopped being true once `SQLiteProvider`
  was replaced by a `useAppReady` bootstrap hook).
- **`AGENTS.md`** is the enforced code-style contract every generated diff
  had to satisfy: mandatory multi-line braces on every `if`/`for`/`while`
  (`curly: ["error", "all"]` in ESLint), `clsx`'s object form for
  conditional `className`, `react-hook-form` + `zod` for any multi-field
  form, named `ComponentNameProps` interfaces instead of inline prop
  types, no business logic or network calls outside `services/`, and the
  five-layer module structure (`app/` → `features/*/{components,hooks,
  services,storage}` → shared `components/`, `hooks/`, `lib/`, `store/`).

## Iteration loop

Per feature chunk (one messaging scenario, one purchase state transition,
one UI slice):

1. Write the test for that slice first, so it fails on the actual bug
   before any fix exists — this is why the test suite is organized
   per-scenario rather than as one broad integration test:
   `chatService.test.ts` covers each of the 5 required messaging
   scenarios as its own test, `chatService.persistenceGuarantee.test.ts`
   isolates the force-quit case specifically (Jest can't kill/reopen a
   real native process, so this test asserts the durability guarantee —
   a pending message is a row in SQLite the instant it's enqueued, not a
   JS variable — instead of literally simulating a force-quit), and
   `subscriptionService.test.ts` covers each purchase transition (success +
   delayed confirmation, cancellation, failure, restore without
   duplicating, repeated taps, duplicate confirmation, cross-purchase
   isolation) as a separate case, and `purchaseService.test.ts` /
   `giftPurchaseService.test.ts` cover the shared ledger and the gift flow
   directly.
2. Write the implementation.
3. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`.
4. Review the diff by hand for correctness and for AGENTS.md adherence
   (brace style, layer placement, prop-interface naming, no stray
   business logic in a component).
5. Fix whatever the review or the test run caught, re-verify, commit.

## Example of AI output that was checked and corrected

The `expo-sqlite`-on-web bug (documented in full in `PLAN.md`, "Resuelto"
section under Fase 0/1). Opening the app in a browser failed first with
`SharedArrayBuffer is not defined`, then — once COOP/COEP headers were
patched into `metro.config.js` — with `Sync operation timeout`. The
first AI-proposed fix was the COOP/COEP header change alone, treating
`SharedArrayBuffer is not defined` as the whole problem; that fix was
necessary but not sufficient, and the timeout that surfaced afterward
showed the diagnosis was incomplete. Root-causing further led to the
real mechanism: `expo-sqlite`'s web backend (`wa-sqlite` over OPFS)
implements its "synchronous" API with an `Atomics` busy-wait against a
Web Worker, capped at a fixed number of iterations, and the app's first
`openDatabaseSync` (loading the wasm, spinning up the worker, opening
the OPFS file) is slow enough on a cold start to blow past that cap when
triggered synchronously and too early. The corrected fix moved database
initialization behind an async bootstrap step that awaits before
rendering the rest of the app (later consolidated into the `useAppReady`
hook in `src/app/_layout.tsx`), giving the worker time to finish
initializing before any synchronous call could run against it.

## Verification status

- **Visual QA**: done — design kit (colors, typography, dark mode)
  reviewed on screen in the iOS Simulator.
- **Performance profiling on the 50k-message dataset**: done — see
  `README.md`, "Performance: profiling the 50k-message conversation".
- **Geist font rendering**: done — confirmed in the Simulator.
- **Messaging and purchase scenarios**: done — exercised end-to-end on
  web and the iOS Simulator (Release build).
