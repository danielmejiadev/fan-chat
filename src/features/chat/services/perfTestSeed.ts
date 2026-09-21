import { createSqliteChatStore } from "@/features/chat/storage/chatDatabase";
import type { ChatStore } from "@/features/chat/storage/chatStore";
import {
  generatePerfTestMessages,
  PERF_TEST_CONVERSATION_ID,
  PERF_TEST_MESSAGE_COUNT,
} from "@/features/chat/utils/generatePerfTestMessages";

/**
 * Seeds the 50k-message perf dataset once, the first time it's needed —
 * idempotent, so opening the perf-test conversation repeatedly never
 * re-inserts or duplicates it.
 */
export function ensurePerfTestMessagesSeeded(store: ChatStore = createSqliteChatStore()): void {
  const existingCount = store.countMessages(PERF_TEST_CONVERSATION_ID);

  if (existingCount >= PERF_TEST_MESSAGE_COUNT) {
    return;
  }

  store.insertMessages(generatePerfTestMessages());
}
