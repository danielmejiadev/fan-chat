import { ensurePerfTestMessagesSeeded } from "@/features/chat/services/perfTestSeed";
import { createInMemoryChatStore } from "@/features/chat/storage/createInMemoryChatStore";
import {
  generatePerfTestMessages,
  PERF_TEST_CONVERSATION_ID,
  PERF_TEST_MESSAGE_COUNT,
} from "@/features/chat/utils/generatePerfTestMessages";

describe("generatePerfTestMessages", () => {
  it("is deterministic across calls", () => {
    expect(generatePerfTestMessages()).toEqual(generatePerfTestMessages());
  });

  it("generates exactly PERF_TEST_MESSAGE_COUNT messages for the perf-test conversation", () => {
    const messages = generatePerfTestMessages();

    expect(messages).toHaveLength(PERF_TEST_MESSAGE_COUNT);
    expect(messages.every((message) => message.conversationId === PERF_TEST_CONVERSATION_ID)).toBe(
      true,
    );
  });

  it("orders messages oldest first, with unique serverIds", () => {
    const messages = generatePerfTestMessages();

    for (let index = 1; index < messages.length; index += 1) {
      expect(messages[index].createdAt).toBeGreaterThan(messages[index - 1].createdAt);
    }

    expect(new Set(messages.map((message) => message.serverId)).size).toBe(PERF_TEST_MESSAGE_COUNT);
  });
});

describe("ensurePerfTestMessagesSeeded", () => {
  it("seeds the full dataset when the conversation is empty", () => {
    const store = createInMemoryChatStore();

    ensurePerfTestMessagesSeeded(store);

    expect(store.countMessages(PERF_TEST_CONVERSATION_ID)).toBe(PERF_TEST_MESSAGE_COUNT);
  });

  it("does not reseed when the dataset is already present", () => {
    const store = createInMemoryChatStore();
    const insertMessagesSpy = jest.spyOn(store, "insertMessages");

    ensurePerfTestMessagesSeeded(store);
    ensurePerfTestMessagesSeeded(store);

    expect(insertMessagesSpy).toHaveBeenCalledTimes(1);
    expect(store.countMessages(PERF_TEST_CONVERSATION_ID)).toBe(PERF_TEST_MESSAGE_COUNT);
  });
});
