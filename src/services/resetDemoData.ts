import { clearChatData } from "@/features/chat/storage/chatDatabase";
import { resetChatServiceStore } from "@/features/chat/services/chatService";
import { clearPurchasesData } from "@/features/purchases/storage/purchasesDatabase";
import { resetPurchaseServiceStore } from "@/features/purchases/services/purchaseService";
import { clearSubscriptionsData } from "@/features/subscriptions/storage/subscriptionsDatabase";
import {
  resetSubscriptionServiceState,
  resetSubscriptionServiceStore,
} from "@/features/subscriptions/services/subscriptionService";
import { resetConversationBackends } from "@/mockApi/chat/chatBackendRegistry";
import { resetPurchaseBackend } from "@/mockApi/gifts/purchaseBackendRegistry";
import { resetFanPurchaseBackend } from "@/mockApi/subscriptions/fanPurchaseBackendRegistry";
import { resetSubscriptionBackend } from "@/mockApi/subscriptions/subscriptionBackendRegistry";
import { resetSubscriptionStore } from "@/store/subscriptionStore";

/**
 * The app's single reset action: wipes every persisted chat/purchase/
 * subscription table and drops the in-memory mock backends, so the next
 * screen visit reseeds conversations and gift/fan entitlements from
 * scratch. Spans multiple features — that's why it lives here instead of
 * inside chat/, purchases/, gifts/, or subscriptions/.
 */
export async function resetDemoData(): Promise<void> {
  await clearChatData();
  await clearPurchasesData();
  await clearSubscriptionsData();
  resetChatServiceStore();
  resetConversationBackends();
  resetPurchaseServiceStore();
  resetPurchaseBackend();
  resetSubscriptionServiceState();
  resetSubscriptionServiceStore();
  resetFanPurchaseBackend();
  resetSubscriptionBackend();
  resetSubscriptionStore();
}
