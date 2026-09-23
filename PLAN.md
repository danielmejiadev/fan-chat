# Plan — Senior React Native Technical Test @ Fans Holdings

Repo: `fan-chat`. Budget: 6-7 hours. Delivery: zip + 30-minute walkthrough.

Evaluation criteria: messaging & recovery (30%), payments/paid access (25%),
UI + performance (30%), testing/explanation (15%).

Approach: **functionality first, UI/styling last**. Each phase leaves
something testable before moving to the next.

> **This file is the single source of truth for progress.** It lets work
> resume with any agent (Claude, another model, another session) without
> losing context. Maintenance rules:
> - Every time something is finished, it gets marked `[x]` here **in the
>   same turn** it's finished — never left for later.
> - The **"Work in progress"** section further down is the only place for
>   half-done work / bugs being diagnosed. An entry is added when starting
>   to investigate something non-trivial, and removed (not archived) as
>   soon as it's resolved and verified — its content then lives on as a
>   resolved checkbox in the corresponding phase.
> - If anything here goes stale relative to the code, the code wins; this
>   file gets corrected so it's true again.

## Architecture decisions (confirmed)

| Decision | Chosen | Why |
|---|---|---|
| Test platform | iOS Simulator + Web (Metro) | macOS local; web is also used to iterate quickly on UI |
| Persistence | `expo-sqlite` via Drizzle ORM, one shared database (`src/lib/database.ts`) | One engine, typed schema + migrations, efficient paginated queries, no duplicated storage logic across features |
| Virtualized list | `@shopify/flash-list` | Better performance on an inverted, chat-style list with 50k items |
| Design source | Real Figma (FanSuite), extracted via "Copy as code → CSS (all layers)" + desktop/mobile screenshots, saved under `docs/design-kit/` | The Figma MCP has no editor access; this path doesn't need it |
| Responsive layout | `useIsDesktopLayout` + `DesktopSidebar`/`MobileTabBar` | Each route decides its own layout at runtime instead of duplicating screens per platform |
| Payments domain split | One shared purchase ledger (`src/features/purchases/`) underneath two independent features — `gifts` (one-off) and `subscriptions` (recurring, with its own entitlement state) | A tip and a membership share the same "did the store charge succeed" bookkeeping, but only a membership needs an ongoing entitlement to track — modeling them as one feature would force gifts to carry state it never uses |
| Messages storage | One `messages` table, one row per message, `id` fixed at creation and never reassigned | Every delivery-state transition (Pending → Sent → Confirmed/Failed) is a single `UPDATE` by that `id`, so there's never a window where a message exists in neither an "outbox" table nor a "confirmed" table |

## Design tokens extracted from Figma (FanSuite, node 1:9)

Live in `tailwind.config.js` (colors, `boxShadow`, `borderRadius`) — **not
repeated as hardcoded values here**; `tailwind.config.js` is the source of
truth for exact token values. Original source: CSS copied from the
"Messages Fan /Mobile/" frame + screenshots under `docs/design-kit/`.

## Phase 0 — Setup & base architecture

- [x] Jest + jest-expo + `@testing-library/react-native` v14; `pnpm test`,
  `pnpm run typecheck`, `pnpm run lint` clean.
- [x] `expo-sqlite`, `drizzle-orm`, `@shopify/flash-list` installed.
- [x] Domain types colocated per feature module (`src/features/<name>/types.ts`)
  instead of one shared file — `chat` owns `Message`/`MessageStatus`,
  `purchases` owns `StorePurchase`/`StorePurchaseStatus`, `subscriptions`
  owns `SubscriptionStatus`.
- [x] One shared SQLite handle (`src/lib/database.ts`), combining the
  chat + purchases + subscriptions Drizzle schemas, initialized before
  first render via `useAppReady` (`src/app/_layout.tsx`).

**Architecture note**: a `storage/` layer per feature module, separate from
`services/` — `storage/` owns the schema and raw CRUD; `services/` owns the
business logic (idempotency, reconciliation order, retries).

## Phase 1 — Reliable messaging (30%)

- [x] Reproduce the duplicate-message bug (lost response followed by a
  retry) before touching any fix, documented in `chatService.test.ts`.
- [x] Pending messages persisted to SQLite before being queued, keyed by a
  stable `clientId` (UUID via `expo-crypto`).
- [x] Dedup by `clientId` in the mock backend.
- [x] One `messages` table — a message is written once (`INSERT`, `id` =
  its `clientId` if it originated on this device, else its `serverId`) and
  every later state change (Sent, Confirmed, Failed) is an `UPDATE` of that
  same row by `id`. A lost response followed by a retry can never produce a
  duplicate, no matter how many times it's replayed, because reconciliation
  always resolves back to the same fixed row.
- [x] `chatService.ts` complete, with an injectable `ChatStore` for
  in-memory tests.
- [x] The 5 required scenarios covered by tests (`chatService.test.ts`) —
  force-quit persistence covered by `chatService.persistenceGuarantee.test.ts`
  (honestly testable in Jest, since it only needs a row surviving in the
  store rather than an actual process kill) plus a manual checklist for
  recording the remaining scenarios in the Simulator (Jest can't kill and
  reopen a real native process).
- [x] `useChatThread` composes `useMessages` (confirmed thread, keyset
  pagination + full non-confirmed array, one stale-read guard) and
  `useChatConnection` (opens/closes the mock connection for the thread's
  lifetime): `sendMessage` (optimistic), `retryMessage`,
  `loadOlderMessages` (growing window). Covered by
  `hooks/__tests__/useChatThread.test.ts`.
- [x] **Event-driven sync, no polling.** `mockChatBackend.subscribe()`
  notifies listeners the instant a message joins the canonical thread — a
  delayed confirmation of the sender's own submission, or an incoming
  message from the other participant. `mockChatConnection` reconciles
  (flush pending + pull the canonical thread) only when that event fires,
  or on reconnect (`NetInfo`) / app-foreground (`AppState`) — never on a
  timer. Reconciliation itself is serialized (a single in-flight run, at
  most one queued rerun) so concurrent triggers can't resolve out of order.
- [x] **UI wired end-to-end**: Expo Router navigation
  (`src/app/index.tsx` = list, `src/app/chat/[conversationId].tsx` =
  thread); each route resolves its own responsive layout via
  `useIsDesktopLayout` (desktop: `DesktopSidebar` + `Conversations` +
  `ThreadPane`; mobile: `Conversations`/`ThreadPane` full-screen +
  `MobileTabBar`). Components organized by sub-feature:
  `features/chat/components/conversations/` (`Conversations`,
  `ConversationListItem`, `ConversationListView`, `ConversationSearch`,
  `ChatListHeader`) and `features/chat/components/chatDetail/`
  (`ThreadPane`, `MessagesList`, `MessageBubble`, `MessageInput`,
  `ChatThreadHeader`, `GiftRow`, `OfflineBanner`).
- [x] **WhatsApp-style delivery ticks** (Pending → clock, Sent → single
  check, Confirmed → double check): the mock backend accepts a send
  immediately (`submitMessage` resolves synchronously) but only joins it to
  the canonical thread after a simulated confirmation delay (~600ms), at
  which point `receiveMessages()` flips the row to Confirmed. Icons in
  `MessageBubble.tsx` come from a pure `getMessageDeliveryTick.ts` helper,
  kept outside the component.
- [x] Demo seeding and the full flow verified end-to-end on web
  (Playwright): open a conversation, send a message and watch it move
  through all three delivery states, trigger "Drop next response" / retry
  from `ChatDebugMenu` and see the failed state.

## Phase 2 — Shared purchase ledger

- [x] `src/features/purchases/` as its own top-level feature module, not
  nested inside `gifts` or `subscriptions` — both build on it instead of
  duplicating "did the store charge succeed" bookkeeping.
- [x] `store_purchases` table: one row per purchase attempt
  (`purchaseId` PK, `productId`, `priceCents`, `currency`, `status`,
  `createdAt`), insert-only.
- [x] `purchaseService.ts`: `initiatePurchase(productId, priceCents, currency)`
  idempotent per product — returns the existing `Pending` purchase instead
  of creating a duplicate if one is already in flight — plus
  `updatePurchaseStatus` and `getPurchasesForProduct`.
- [x] Covered by tests: successful purchase, cancellation, failure, repeated
  taps not duplicating a purchase, isolation between different purchases.

## Phase 3 — Gifts, one-off tips (part of the 25% payments criterion)

- [x] `mockPurchaseBackend.ts`: `purchase()` resolves `Succeeded`
  immediately — a gift is meant to feel instant, with no confirmation
  step to wait on.
- [x] `giftPurchaseService.ts`: calls the gift mock backend, then writes
  the result back through the shared `purchaseService`. Each gift is an
  independent, never-restored transaction — there's no ledger reuse across
  gifts the way there is across subscription renewal attempts.
- [x] **UI wired end-to-end**: `GiftModal` (react-hook-form + Zod,
  responsive — amount, payment method, subtotal/fees/total) +
  `useGiftPurchase` (`pay`/`reset`, states
  `idle/pending/confirmed/failed/canceled`). Opened from `MessageInput` →
  `ThreadPane`; on confirmation, drops a `GiftRow` system message into the
  thread via `onGiftSent`.
- [x] Covered by tests (`giftPurchaseService.test.ts`): success, failure,
  cancellation, repeated taps not duplicating a charge.

## Phase 4 — Subscriptions, recurring membership (part of the 25% payments criterion)

- [x] `mockFanPurchaseBackend.ts`: resolves to whichever outcome the
  paywall's simulated payment sheet reports (succeed / cancel / fail) —
  unlike a gift, the store result and the user's answer to the payment
  sheet are two distinct, independently-timed moments.
- [x] `mockSubscriptionBackend.ts`: `confirmSubscription(purchaseId)`
  simulates backend-side receipt validation on a ~1.5s delay, idempotent
  via a confirmed-ids set plus an in-flight map — a duplicate confirmation
  call for the same purchase is a no-op instead of double-granting access.
- [x] `subscriptions` table, one row per user (`userId` PK, `status`,
  `purchaseId`), upserted — mirrored into a Zustand store
  (`useSubscriptionStore`) so the UI reads current status reactively
  without a service round trip.
- [x] `subscriptionService.ts`: purchase result and entitlement
  confirmation kept as two separate, independently-timed steps — a
  succeeded store purchase with no confirmation yet reads as
  `PendingConfirmation`, never `Active`. Status only ever moves
  `Inactive → PendingConfirmation → Active`; a later failed purchase never
  rolls an already-active subscription back. `restoreSubscription` finds a
  prior Succeeded/Restored purchase and reactivates it without duplicating
  the ledger row.
- [x] **UI wired end-to-end**: `BecomeFanButton` (label follows live
  status: Inactive → "Become a Fan", PendingConfirmation → "Confirming
  access…", Active → "Fan in All Access") opens `FanPaywallModal`, which
  simulates an open payment sheet (Success/Cancel/Fail buttons) plus a
  "Restore purchase" link.
- [x] Covered by tests (`subscriptionService.test.ts`): purchase +
  separate confirmation, cancellation, failure, restore without
  duplicating, delayed confirmation, repeated taps, duplicate confirmation,
  isolation between users.

## Phase 5 — Data at scale & performance

- [x] 50,000 repeatable mock messages (fixed seed, mulberry32 PRNG) for
  `conversationId = "perf-test"` — `generatePerfTestMessages.ts` +
  `ensurePerfTestMessagesSeeded()` (idempotent).
- [x] Keyset pagination by `(createdAt, serverId)` in both the SQLite and
  the in-memory store, verified against the full 50k dataset with no gaps
  or duplicates (`chatStorePagination.test.ts`).
- [x] Pagination wired into the real UI: `MessagesList` uses `FlashList`
  with `onStartReached` + `useChatThread.loadOlderMessages`, loading a
  growing window 30 messages at a time — generic, works for any
  conversation with long history.
- [x] The 50k conversation reachable from the normal chat list, not a
  hidden test route — "Perf Test (50k messages)" is a regular entry in
  `MOCK_CONVERSATIONS`, seeded on first open.
- [x] Run and record the repeatable scroll+type profiling sequence against
  that conversation (fixed script: fast scroll to the bottom, slow scroll
  while reading, typing in the input while scrolling).

## Phase 6 — UI/UX & styling

- [x] Figma tokens in `tailwind.config.js` (colors, shadows, radii) — never
  hardcoded inside a component.
- [x] Responsive desktop/mobile layout: `useIsDesktopLayout` +
  `src/components/layout/` (`DesktopSidebar`, `MobileTabBar`,
  `SidebarItem`, `TabIcon`).
- [x] Atomic components, one per file, every conditional `className`
  through `clsx` (see `AGENTS.md`).
- [x] `KeyboardAvoidingView` in `ThreadPane` (iOS `padding`), `SafeAreaView`
  on every screen.
- [x] Two-tier color system: raw primitives feed semantic tokens (with
  `-foreground` pairs, shadcn/ui-style) via CSS variables in
  `src/design/colors.css`, consumed from `tailwind.config.js` as
  `rgb(var(--x) / <alpha-value>)`. Icons (`Ionicons`) read the same tokens
  through `cssInterop` (`src/components/Icon.tsx`) instead of a hardcoded
  `color="#hex"` — no hardcoded color hex left in any component.
- [x] Real Geist font loaded via `@expo-google-fonts/geist` + `useFonts` in
  `src/app/_layout.tsx` (weights 400/500/600), with `expo-splash-screen`
  blocking first render until they're ready.
- [x] Named type scale (`h1`–`h5`, `body`, `caption`) in
  `tailwind.config.js`, anchored on the sizes confirmed by Figma. Since RN
  can't synthesize a bolder weight from one font file, every size class
  pairs with an explicit family class (`font-sans`/`font-sans-medium`/
  `font-sans-semibold`), never NativeWind's plain `font-medium`/
  `font-semibold`.
- [x] `src/components/Text.tsx` / `TextInput.tsx`: thin wrappers baking in
  `font-sans` (Geist regular) as the default, since NativeWind doesn't
  apply a default font-family to bare `Text`/`TextInput`. All call sites
  import from `@/components/...`, never directly from `react-native`.
- [x] Automatic dark mode following the OS — `darkMode: "media"` in
  `tailwind.config.js`, no manual toggle. Dark values live under
  `@media (prefers-color-scheme: dark)` in `src/design/colors.css`.
- [x] Accessibility audit across every `Pressable`/`TouchableOpacity`:
  icon-only tab bar items, payment-method chips, quick reactions, gift
  amount chips and the retry button all carry an explicit
  `accessibilityLabel`/`accessibilityRole`/`accessibilityState` where the
  visible content alone wasn't a reliable accessible name.
- [x] `useReducedMotion` (wraps `AccessibilityInfo.isReduceMotionEnabled`)
  respected by every entrance animation (`OfflineBanner`'s fade-in and
  later additions), so the app skips them when the system has reduced
  motion enabled.
- [x] Full visual review of the design kit (colors, typography, dark mode)
  on an actual running Simulator/browser session.

## Phase 7 — Profiling with evidence

- [x] Run the Phase 5 scroll+type sequence against the 50k-message
  conversation.
- [x] Measure frame timing / dropped frames / memory (Flipper, RN Perf
  Monitor, or `react-native-performance`).
- [x] Identify one concrete bottleneck, show before/after.
- [x] Be explicit in the README about anything that couldn't be measured
  and why.

## Phase 8 — Deliverables

- [x] Recordings of the required scenarios (Phases 1, 3 and 4).
- [x] `README.md`: bug found, decisions made, tests, performance results,
  known limitations, time spent per phase.
- [x] `AI.md`: what AI assistance was used and how.
- [x] Written explanation: resuming a large upload (background vs.
  force-quit).
- [x] App Store / Google Play rules on creator content and payments, with
  official links.
- [x] `Firstname_Lastname.zip` → sent to `join@fansapi.com`.

## Work in progress (bugs / half-done tasks)

Nothing open right now.
