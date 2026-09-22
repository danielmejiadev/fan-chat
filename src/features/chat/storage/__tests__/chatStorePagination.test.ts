import { createInMemoryChatStore } from "@/features/chat/storage/createInMemoryChatStore";
import {
  generatePerfTestMessages,
  PERF_TEST_CONVERSATION_ID,
} from "@/features/chat/utils/generatePerfTestMessages";
import { MessageStatus, type Message } from "@/features/chat/types";

function confirmedMessage(overrides: Partial<Message>): Message {
  return {
    id: overrides.serverId ?? "srv",
    serverId: null,
    clientId: null,
    conversationId: "conversation-1",
    senderId: "creator-1",
    text: "",
    createdAt: 0,
    status: MessageStatus.Confirmed,
    failureReason: null,
    ...overrides,
  };
}

describe("ChatStore.getConfirmedMessagesPage", () => {
  it("returns the newest page first, then walks older pages without gaps or duplicates", async () => {
    const store = createInMemoryChatStore();
    const conversationId = "conversation-1";
    const messages: Message[] = Array.from({ length: 23 }, (_, index) =>
      confirmedMessage({
        id: `srv_${index}`,
        serverId: `srv_${index}`,
        conversationId,
        text: `message ${index}`,
        createdAt: index * 1000,
      }),
    );

    await store.insertMessages(messages);

    const seenServerIds: string[] = [];
    let cursor: { createdAt: number; serverId: string } | undefined;

    for (let safety = 0; safety < 10; safety += 1) {
      const page = await store.getConfirmedMessagesPage(conversationId, {
        limit: 7,
        before: cursor,
      });
      if (page.length === 0) {
        break;
      }
      seenServerIds.push(...page.map((message) => message.serverId as string));
      cursor = {
        createdAt: page[page.length - 1].createdAt,
        serverId: page[page.length - 1].serverId as string,
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
      confirmedMessage({
        id: "srv_a",
        serverId: "srv_a",
        conversationId,
        text: "a",
        createdAt: 100,
      }),
      confirmedMessage({
        id: "srv_b",
        serverId: "srv_b",
        conversationId,
        text: "b",
        createdAt: 100,
      }),
      confirmedMessage({
        id: "srv_c",
        serverId: "srv_c",
        conversationId,
        text: "c",
        createdAt: 50,
      }),
    ]);

    const firstPage = await store.getConfirmedMessagesPage(conversationId, { limit: 1 });
    expect(firstPage.map((message) => message.serverId)).toEqual(["srv_b"]);

    const secondPage = await store.getConfirmedMessagesPage(conversationId, {
      limit: 1,
      before: { createdAt: firstPage[0].createdAt, serverId: firstPage[0].serverId as string },
    });
    expect(secondPage.map((message) => message.serverId)).toEqual(["srv_a"]);

    const thirdPage = await store.getConfirmedMessagesPage(conversationId, {
      limit: 1,
      before: { createdAt: secondPage[0].createdAt, serverId: secondPage[0].serverId as string },
    });
    expect(thirdPage.map((message) => message.serverId)).toEqual(["srv_c"]);
  });

  it("only ever returns Confirmed messages, never Pending/Sent/Failed ones", async () => {
    const store = createInMemoryChatStore();
    const conversationId = "conversation-1";

    await store.insertMessage({
      id: "client-1",
      serverId: null,
      clientId: "client-1",
      conversationId,
      senderId: "fan-1",
      text: "still pending",
      createdAt: 100,
      status: MessageStatus.Pending,
      failureReason: null,
    });
    await store.insertMessages([
      confirmedMessage({
        id: "srv_a",
        serverId: "srv_a",
        conversationId,
        text: "confirmed",
        createdAt: 50,
      }),
    ]);

    const page = await store.getConfirmedMessagesPage(conversationId, { limit: 10 });
    expect(page.map((message) => message.text)).toEqual(["confirmed"]);
  });

  it("paginates the full 50k perf dataset without gaps or duplicates", async () => {
    const store = createInMemoryChatStore();
    await store.insertMessages(generatePerfTestMessages());

    let total = 0;
    let cursor: { createdAt: number; serverId: string } | undefined;
    const seen = new Set<string>();

    for (let safety = 0; safety < 2000; safety += 1) {
      const page = await store.getConfirmedMessagesPage(PERF_TEST_CONVERSATION_ID, {
        limit: 50,
        before: cursor,
      });
      if (page.length === 0) {
        break;
      }
      for (const message of page) {
        const serverId = message.serverId as string;
        expect(seen.has(serverId)).toBe(false);
        seen.add(serverId);
      }
      total += page.length;
      cursor = {
        createdAt: page[page.length - 1].createdAt,
        serverId: page[page.length - 1].serverId as string,
      };
    }

    expect(total).toBe(await store.countConfirmedMessages(PERF_TEST_CONVERSATION_ID));
  });
});
