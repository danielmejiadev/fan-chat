import { createMockFanPurchaseBackend } from "@/mockApi/subscriptions/mockFanPurchaseBackend";
import type { MockFanPurchaseBackend } from "@/mockApi/subscriptions/mockFanPurchaseBackend";

let fanPurchaseBackend: MockFanPurchaseBackend | null = null;

export function getFanPurchaseBackend(): MockFanPurchaseBackend {
  if (fanPurchaseBackend === null) {
    fanPurchaseBackend = createMockFanPurchaseBackend();
  }

  return fanPurchaseBackend;
}

/** Test-only: injects a fake backend instead of the default one. */
export function setFanPurchaseBackendForTests(backend: MockFanPurchaseBackend): void {
  fanPurchaseBackend = backend;
}

/** Test-only: clears the cached backend so each test starts from a fresh one. */
export function resetFanPurchaseBackend(): void {
  fanPurchaseBackend = null;
}
