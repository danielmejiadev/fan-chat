# Manual verification scenarios

These are scenarios that cannot be verified by a Jest test because they
depend on native behavior (a real SQLite file on disk, an actual process
kill) that only exists on a real iOS Simulator/device run, not inside
Node. They're run manually and recorded as part of Fase 6 ("Grabaciones
de los escenarios obligatorios").

## Fase 1 — force-quit recovery of pending messages

**Why this can't be a Jest test**: `expo-sqlite` is a native module. Jest
(via `jest-expo`) runs in Node, which cannot execute the native SQLite
binary — there is no in-Node way to write to a real `.db` file, kill the
process, and reopen it. `chatService`'s own tests substitute an in-memory
`ChatStore` fake for exactly this reason (see
`src/features/chat/services/__tests__/chatService.test.ts`), which proves
the business logic (idempotency, ordering, reconciliation) but not that
bytes survive a process restart. What Jest *can* and does prove instead is
the precondition that makes recovery possible in the first place: that
`enqueueMessage` writes to the store synchronously before any network
call — see
`src/features/chat/services/__tests__/chatService.persistenceGuarantee.test.ts`.

**Manual checklist** (iOS Simulator):

1. Put the device/simulator in Airplane Mode (or otherwise make the mock
   backend unreachable, since there's no real network to cut — e.g. a
   debug toggle that forces `flushPendingMessages` to fail).
2. Send 3 messages in a conversation.
3. Verify all 3 render with a "pending"/"sending" indicator and are not in
   the confirmed thread.
4. Force-quit the app completely (swipe it away from the app switcher —
   not just backgrounding it).
5. Reopen the app.
6. Verify the same 3 messages are still there, same text, same order,
   still in "pending" state.
7. Turn Airplane Mode off and verify all 3 get delivered without creating
   duplicates (confirmed thread ends up with exactly 3 messages, not 6).

Record this as a screen recording per Fase 6's requirements.
