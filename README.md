# fan-chat

## Requirements

- Node.js
- pnpm
- Xcode (for the iOS simulator) or Android Studio (for the Android emulator)

## Install

```bash
pnpm install
```

## Run the project

```bash
pnpm start
```

This opens the Metro bundler with Expo Dev Tools. From there you can pick a platform, or run directly:

```bash
pnpm ios      # opens the iOS simulator (requires Xcode installed)
pnpm android  # opens the Android emulator (requires Android Studio installed)
pnpm web      # opens in the browser
```

### iOS simulator, step by step

1. Install Xcode from the App Store (it includes the iOS simulator).
2. Open Xcode once and accept the license / install any "Additional Components" it asks for.
3. Run `pnpm ios` — Expo builds the app and opens the simulator automatically.

If the simulator doesn't open on its own, launch it manually from `Xcode > Open Developer Tool > Simulator`, then run `pnpm ios` with the simulator already open.

### Physical device (Expo Go)

1. Install the **Expo Go** app from the App Store or Play Store.
2. Run `pnpm start`.
3. Scan the QR code shown in the terminal/Dev Tools with your camera (iOS) or from the Expo Go app (Android).

## Other commands

```bash
pnpm lint       # ESLint
pnpm typecheck  # tsc --noEmit
pnpm test       # Jest
```

## Architecture

Interactive diagram: https://claude.ai/artifact/2P2MKsg49pMUmZPbVY9Cf1

The app is split into five layers, and every dependency between them points
in one direction only (UI → Hooks → Services → Storage / mockApi). That's
what makes the retry/idempotency logic testable in Jest without a real
device or network: swap the bottom layer for an in-memory fake, keep
everything above it unchanged.

### UI — `src/app/`, `src/features/*/components/`, `src/components/`

Pure render. A screen under `src/app/` only composes components and wires a
single hook to them — no business logic, no direct calls into `storage/` or
`mockApi/`. Components like `MessageBubble`, `GiftModal`, `ChatDebugMenu` and
`DemoResetButton` read whatever a hook already computed and render it;
conditional styling (pending/failed/offline states) lives here as plain
`clsx` classes, never as logic that decides *whether* something failed.

### Hooks — `src/features/*/hooks/`, `src/hooks/`

The client-side glue layer: local React state and optimistic updates.
`useChatThread` doesn't own all of this itself — it composes three smaller
hooks:

- `useConfirmedMessages` — the paginated, server-confirmed window of the
  thread.
- `usePendingMessages` — the local outbox (messages this device queued but
  the backend hasn't confirmed).
- `useChatConnection` — opens/closes the mock connection on
  mount/unmount and re-renders whenever it reports something new. It has
  nothing else to expose: the connection itself is fully event-driven and
  owns its own `AppState`/`NetInfo` wiring (see `mockChatConnection.ts`
  below) — there's no "sync now" function for a hook or component to call.

Sending or retrying a message doesn't go through `useChatConnection` at
all — `useChatThread` calls `chatService.submitPendingMessages()` directly,
since that's a self-contained request/response round trip. Anything this
device didn't initiate (an incoming message, the backend's own confirmation
delay, the debug menu's simulated events) still reaches the UI through
`useChatConnection`'s connection.

### Services — `src/features/*/services/`, `src/services/`

`chatService.ts` and `purchaseService.ts` hold every rule that actually
matters for the task: writing a message to the local outbox *before* any
network attempt, deduping retries by `clientId`, keeping a purchase's store
result separate from its backend entitlement confirmation, and deciding
reconciliation order. `resetDemoData.ts` lives directly under
`src/services/` instead of inside `chat/` or `purchases/`, because it spans
both features.

This is also the only layer with test-only escape hatches
(`setChatServiceStoreForTests`, `setPurchaseServiceStoreForTests`) —
production code always resolves the real SQLite-backed store; tests inject
an in-memory one implementing the same contract.

### Storage — `src/features/*/storage/`

A typed CRUD contract (`ChatStore`, `PurchaseStore`) implemented twice:
once against `expo-sqlite` for the real app (`chatDatabase.ts`,
`purchasesDatabase.ts`), once fully in memory for Jest, which can't load a
native SQLite binary (`createInMemoryChatStore.ts`). Services only ever
depend on the contract, never on which implementation is behind it — that's
what makes a pending message survive a force-quit: the moment
`enqueueMessage` runs, it's a row in `pending_messages`, not a value sitting
in a JS variable that dies with the process.

### mockApi — `src/mockApi/chat/`, `src/mockApi/purchases/`

Everything that stands in for a real backend, kept in its own top-level
folder instead of inside `services/` — this is the one layer a real API
integration would replace outright, without touching anything above it:

- `mockChatBackend.ts` — accepts sends, remembers `accepted_client_ids` for
  idempotency, and can be told to drop a response or reject a message's
  content outright (used by the demo controls to reproduce the required
  failure scenarios on demand).
- `mockChatConnection.ts` — event-driven, like a real socket/channel
  subscription: `mockChatBackend.subscribe()` notifies it the moment a
  message actually joins the canonical thread, instead of polling on a
  timer to find out. Owns every trigger for reconciling itself — the
  backend's own change events, reconnect (`@react-native-community/netinfo`),
  and app-foreground (`AppState`) — so nothing outside this file ever needs
  to ask it to sync; it reconciles (flush + full resync) on all of them to
  catch up on anything missed while offline.
- `mockPurchaseBackend.ts` — the store's purchase result and the backend's
  entitlement confirmation as two separate, independently-timed calls.

Connecting this to a real backend later means implementing the same
`MockChatBackend` / `ChatConnection` / `MockPurchaseBackend` shapes against
real endpoints — `chatService.ts` and `purchaseService.ts` wouldn't need to
change at all.

### Demo controls

Two dev-only affordances make every required scenario reachable by tapping
the screen instead of only from a test:

- **`ChatDebugMenu`** (floating bug icon in a chat thread, `__DEV__` only) —
  "Drop next response" and "Reject next message" force the two chat failure
  modes on demand; "Simulate 4 incoming messages" adds messages from the
  other participant, useful combined with going offline first.
- **`DemoResetButton`** (sidebar on desktop, floating button on the
  conversation list on mobile — always visible, not `__DEV__`-gated, since
  the task asks for a reset action) — wipes every chat/purchase table and
  drops the in-memory mock backends, so each recording starts clean.

### Technical implementation notes

- **Idempotent messaging by `clientId`.** `enqueueMessage`
  (`src/features/chat/services/chatService.ts`) writes a message to the
  local outbox, keyed by a stable `clientId` generated up front, before any
  network attempt. `flushPendingMessages` reuses that same `clientId` on
  every retry; the mock backend dedupes by it (`accepted_client_ids`), so a
  lost response followed by a retry never produces a duplicate message no
  matter how many times it's replayed.
- **SQLite-backed pending-message persistence.** A pending message becomes
  a row in the SQLite `pending_messages` table the instant `enqueueMessage`
  runs — never just a value sitting in a JS variable — so it survives a
  force-quit. `ChatStore`/`PurchaseStore` (`src/features/*/storage/`) are
  typed contracts implemented once against SQLite (via Drizzle ORM) for the
  real app and once fully in memory for Jest, which can't load a native
  SQLite binary.
- **Keyset pagination for the 50k-message dataset.** `getThreadMessagesPage`
  paginates by `(createdAt, serverId)` instead of offset, verified against
  the full 50k-message seeded dataset with no gaps or duplicates
  (`chatStorePagination.test.ts`). `MessagesList` renders it with
  `@shopify/flash-list` and loads older pages via
  `onStartReached`/`useChatThread.loadOlderMessages` in a growing window.
- **Two-phase purchase state.** `purchaseService.ts` keeps a purchase's
  store result (`processPurchase` — succeeded/failed/canceled) and its
  backend entitlement confirmation (`confirmPurchase`) as two separate,
  independently-timed steps — a succeeded purchase with no confirmation yet
  reads as `Pending`, never `Active`. `useGiftPurchase` exposes this as an
  explicit `idle → pending → pending-confirmation → confirmed/failed/canceled`
  state machine so the UI can show the real in-between state instead of
  optimistically granting access on payment alone.
- **SQLite on web (`SharedArrayBuffer`/`Sync operation timeout`).** Opening
  `expo-sqlite` in a browser initially failed with a missing
  `SharedArrayBuffer`, then with a `Sync operation timeout` even after
  COOP/COEP headers were added — the web backend's "synchronous" API is
  actually an `Atomics` busy-wait against a Web Worker, and the first,
  slow `openDatabaseSync` was running too early to give the worker time to
  initialize. Fixed by moving database setup behind an async bootstrap
  step (`useAppReady`, `src/app/_layout.tsx`) that the rest of the app
  awaits before rendering. Full root-cause writeup in `PLAN.md`, under
  "Resuelto: `expo-sqlite` en web".

### Known limitations / not yet done

Tracked in detail in `PLAN.md`'s phase checklists — pulled out here so
they're not missed:

- Performance profiling on the 50k-message conversation (frame timing,
  dropped frames, memory) has not been run yet — it needs a real
  Simulator/device session.
- No screen recordings of the required messaging/purchase scenarios exist
  yet.
- The design kit (colors, typography, dark mode) has been verified via
  typecheck/lint/tests/`expo export`, but not visually reviewed on screen
  against the Figma source.
