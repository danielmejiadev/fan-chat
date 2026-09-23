import { createMockSubscriptionBackend } from "@/mockApi/subscriptions/mockSubscriptionBackend";
import type { MockSubscriptionBackend } from "@/mockApi/subscriptions/mockSubscriptionBackend";

let subscriptionBackend: MockSubscriptionBackend | null = null;

export function getSubscriptionBackend(): MockSubscriptionBackend {
  if (subscriptionBackend === null) {
    subscriptionBackend = createMockSubscriptionBackend();
  }

  return subscriptionBackend;
}

/** Test-only: injects a fake backend instead of the default one. */
export function setSubscriptionBackendForTests(backend: MockSubscriptionBackend): void {
  subscriptionBackend = backend;
}

/** Test-only: clears the cached backend so each test starts from a fresh one. */
export function resetSubscriptionBackend(): void {
  subscriptionBackend = null;
}
