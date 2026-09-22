import { createInMemoryChatStore } from "@/features/chat/storage/createInMemoryChatStore";
import {
  generatePerfTestMessages,
  PERF_TEST_CONVERSATION_ID,
} from "@/features/chat/utils/generatePerfTestMessages";
import type { ServerMessage } from "@/features/chat/types";

describe("ChatStore.getThreadMessagesPage", () => {
  it("returns the newest page first, then walks older pages without gaps or duplicates", async () => {
    const store = createInMemoryChatStore();
    const conversationId = "conversation-1";
    const messages: ServerMessage[] = Array.from({ length: 23 }, (_, index) => ({
      serverId: `srv_${index}`,
      clientId: null,
      conversationId,
      senderId: "creator-1",
      text: `message ${index}`,
      createdAt: index * 1000,
    }));

    await store.insertMessages(messages);

    const seenServerIds: string[] = [];
    let cursor: { createdAt: number; serverId: string } | undefined;

    for (let safety = 0; safety < 10; safety += 1) {
      const page = await store.getThreadMessagesPage(conversationId, { limit: 7, before: cursor });
      if (page.length === 0) {
        break;
      }
      seenServerIds.push(...page.map((message) => message.serverId));
      cursor = {
        createdAt: page[page.length - 1].createdAt,
        serverId: page[page.length - 1].serverId,
      };
    }

    // Newest first: srv_22 down to srv_0, every message exactly once.
    const expectedOrder = messages
      .slice()
      .reverse()
      .map((message) => message.serverId);
    expect(seenServerIds).toEqual(expectedOrder);
  });

  it("breaks ties on serverId when two messages share a createdAt", async () => {
    const store = createInMemoryChatStore();
    const conversationId = "conversation-1";

    await store.insertMessages([
      {
        serverId: "srv_a",
        clientId: null,
        conversationId,
        senderId: "x",
        text: "a",
        createdAt: 100,
      },
      {
        serverId: "srv_b",
        clientId: null,
        conversationId,
        senderId: "x",
        text: "b",
        createdAt: 100,
      },
      {
        serverId: "srv_c",
        clientId: null,
        conversationId,
        senderId: "x",
        text: "c",
        createdAt: 50,
      },
    ]);

    const firstPage = await store.getThreadMessagesPage(conversationId, { limit: 1 });
    expect(firstPage.map((message) => message.serverId)).toEqual(["srv_b"]);

    const secondPage = await store.getThreadMessagesPage(conversationId, {
      limit: 1,
      before: { createdAt: firstPage[0].createdAt, serverId: firstPage[0].serverId },
    });
    expect(secondPage.map((message) => message.serverId)).toEqual(["srv_a"]);

    const thirdPage = await store.getThreadMessagesPage(conversationId, {
      limit: 1,
      before: { createdAt: secondPage[0].createdAt, serverId: secondPage[0].serverId },
    });
    expect(thirdPage.map((message) => message.serverId)).toEqual(["srv_c"]);
  });

  it("paginates the full 50k perf dataset without gaps or duplicates", async () => {
    const store = createInMemoryChatStore();
    await store.insertMessages(generatePerfTestMessages());

    let total = 0;
    let cursor: { createdAt: number; serverId: string } | undefined;
    const seen = new Set<string>();

    for (let safety = 0; safety < 2000; safety += 1) {
      const page = await store.getThreadMessagesPage(PERF_TEST_CONVERSATION_ID, {
        limit: 50,
        before: cursor,
      });
      if (page.length === 0) {
        break;
      }
      for (const message of page) {
        expect(seen.has(message.serverId)).toBe(false);
        seen.add(message.serverId);
      }
      total += page.length;
      cursor = {
        createdAt: page[page.length - 1].createdAt,
        serverId: page[page.length - 1].serverId,
      };
    }

    expect(total).toBe(await store.countMessages(PERF_TEST_CONVERSATION_ID));
  });
});
