import { createSqliteChatStore } from "@/features/chat/storage/chatDatabase";
import type { ChatStore } from "@/features/chat/storage/chatStore";
import {
  generatePerfTestMessages,
  PERF_TEST_CONVERSATION_ID,
  PERF_TEST_MESSAGE_COUNT,
} from "@/features/chat/utils/generatePerfTestMessages";

let storeOverrideForTests: ChatStore | null = null;

/** Test-only: forces ensurePerfTestMessagesSeeded to use this store instead of SQLite. */
export function setPerfTestSeedStoreForTests(store: ChatStore): void {
  storeOverrideForTests = store;
}

/** Test-only: clears the store override. */
export function resetPerfTestSeedStore(): void {
  storeOverrideForTests = null;
}

/**
 * Seeds the 50k-message perf dataset once, the first time it's needed —
 * idempotent, so opening the perf-test conversation repeatedly never
 * re-inserts or duplicates it.
 */
export async function ensurePerfTestMessagesSeeded(): Promise<void> {
  const store = storeOverrideForTests ?? createSqliteChatStore();
  const existingCount = await store.countMessages(PERF_TEST_CONVERSATION_ID);

  if (existingCount >= PERF_TEST_MESSAGE_COUNT) {
    return;
  }

  await store.insertMessages(generatePerfTestMessages());
}
