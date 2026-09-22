import { clearChatData } from "@/features/chat/storage/chatDatabase";
import { resetChatServiceStore } from "@/features/chat/services/chatService";
import { clearPurchasesData } from "@/features/purchases/storage/purchasesDatabase";
import { resetPurchaseServiceStore } from "@/features/purchases/services/purchaseService";
import { resetConversationBackends } from "@/mockApi/chat/chatBackendRegistry";
import { resetPurchaseBackend } from "@/mockApi/purchases/purchaseBackendRegistry";

/**
 * The app's single reset action: wipes every persisted chat/purchase table
 * and drops the in-memory mock backends, so the next screen visit reseeds
 * conversations and gift entitlements from scratch. Spans both features —
 * that's why it lives here instead of inside chat/ or purchases/.
 */
export function resetDemoData(): void {
  clearChatData();
  clearPurchasesData();
  resetChatServiceStore();
  resetConversationBackends();
  resetPurchaseServiceStore();
  resetPurchaseBackend();
}
