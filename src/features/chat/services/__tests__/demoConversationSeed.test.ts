import { resetConversationBackends } from "@/features/chat/services/chatBackendRegistry";
import { getConfirmedThread } from "@/features/chat/services/chatService";
import { ensureDemoConversationSeeded } from "@/features/chat/services/demoConversationSeed";
import { createInMemoryChatStore } from "@/features/chat/storage/createInMemoryChatStore";

const conversationId = "conversation-1";

describe("ensureDemoConversationSeeded", () => {
  afterEach(() => {
    resetConversationBackends();
  });

  it("seeds opening messages from the creator for a known conversation", () => {
    const store = createInMemoryChatStore();

    ensureDemoConversationSeeded(conversationId, store);

    const thread = getConfirmedThread(conversationId, store);
    expect(thread.length).toBeGreaterThan(0);
    expect(thread.every((message) => message.senderId === "creator-alex")).toBe(true);
  });

  it("does not reseed or duplicate on a second call", () => {
    const store = createInMemoryChatStore();

    ensureDemoConversationSeeded(conversationId, store);
    const firstCount = getConfirmedThread(conversationId, store).length;

    ensureDemoConversationSeeded(conversationId, store);
    const secondCount = getConfirmedThread(conversationId, store).length;

    expect(secondCount).toBe(firstCount);
  });

  it("does nothing for an unknown conversation id", () => {
    const store = createInMemoryChatStore();

    ensureDemoConversationSeeded("not-a-real-conversation", store);

    expect(getConfirmedThread("not-a-real-conversation", store)).toHaveLength(0);
  });
});
