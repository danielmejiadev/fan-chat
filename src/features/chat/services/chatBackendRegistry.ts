import {
  createMockChatBackend,
  type MockChatBackend,
} from "@/features/chat/services/mockChatBackend";

/**
 * MockChatBackend stands in for "the server" for the whole app, but nothing
 * currently owns a shared instance of it. Keying one per conversationId
 * (instead of a single global instance) keeps independent conversations from
 * cross-talking while still giving every consumer of a given conversation —
 * multiple hook instances, retries, a future second screen — the same
 * backend, which is what "the server" has to mean for reconciliation to work.
 */
const backendsByConversationId = new Map<string, MockChatBackend>();

export function getConversationBackend(conversationId: string): MockChatBackend {
  let backend = backendsByConversationId.get(conversationId);

  if (backend === undefined) {
    backend = createMockChatBackend();
    backendsByConversationId.set(conversationId, backend);
  }

  return backend;
}

/** Test-only: clears the registry so conversationId reuse across tests doesn't leak backend state. */
export function resetConversationBackends(): void {
  backendsByConversationId.clear();
}
