import { getSeedMessagesForConversation } from "@/features/chat/constants/mockMessages";
import {
  createMockChatBackend,
  type MockChatBackend,
} from "@/features/chat/services/mockChatBackend";

/** One backend instance per conversationId, shared by every consumer of that conversation. */
const backendsByConversationId = new Map<string, MockChatBackend>();

export function getConversationBackend(conversationId: string): MockChatBackend {
  let backend = backendsByConversationId.get(conversationId);

  if (backend === undefined) {
    backend = createMockChatBackend(true, getSeedMessagesForConversation(conversationId));
    backendsByConversationId.set(conversationId, backend);
  }

  return backend;
}

/** Test-only: clears the registry so conversationId reuse across tests doesn't leak backend state. */
export function resetConversationBackends(): void {
  backendsByConversationId.clear();
}

/** Test-only: forces a conversationId to resolve to a specific (e.g. failure-simulating) backend. */
export function setConversationBackendForTests(
  conversationId: string,
  backend: MockChatBackend,
): void {
  backendsByConversationId.set(conversationId, backend);
}
