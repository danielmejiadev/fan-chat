import NetInfo from "@react-native-community/netinfo";
import { AppState, type AppStateStatus } from "react-native";

import type { ChatConnection } from "@/mockApi/chat/chatConnection";
import { getConversationBackend } from "@/mockApi/chat/chatBackendRegistry";
import { flushPendingMessages, syncThread } from "@/features/chat/services/chatService";

export const mockChatConnection: ChatConnection = {
  connect(conversationId, senderId, onChange) {
    let isConnected = true;

    // reconcile can be triggered from several independent, non-exclusive
    // sources — all internal to this connection (initial connect, the
    // backend's own change event, reconnect, app foregrounding). Without
    // this guard, two overlapping runs would each take their own flush/sync
    // snapshot, and whichever's onChange fired last could overwrite fresher
    // state with a stale one. Concurrent triggers now share the in-flight
    // run instead of starting a new one, and a trigger that arrives mid-run
    // schedules exactly one more run after it finishes so it still gets
    // served.
    let inFlightRun: Promise<void> | null = null;
    let rerunRequested = false;

    const runOnce = async (): Promise<void> => {
      if (isConnected) {
        await flushPendingMessages(conversationId, senderId);
        await syncThread(conversationId);
      }
      onChange();
    };

    const reconcile = (): void => {
      if (inFlightRun !== null) {
        rerunRequested = true;
        return;
      }

      inFlightRun = (async () => {
        try {
          await runOnce();

          while (rerunRequested) {
            rerunRequested = false;
            await runOnce();
          }
        } finally {
          inFlightRun = null;
        }
      })();
    };

    // The mock backend behaves like a socket channel here: it notifies this
    // listener the moment a message actually joins the canonical thread
    // (this client's own delayed confirmation, or the other participant's
    // incoming message) instead of making the client poll on a timer to
    // find out. While offline, the notification is ignored — nothing would
    // be readable anyway — and reconcile() on reconnect catches up on
    // whatever was missed via syncThread's full listMessages() pull.
    const unsubscribeFromBackend = getConversationBackend(conversationId).subscribe(() => {
      if (isConnected) {
        reconcile();
      }
    });

    reconcile();

    // Syncs right away on reconnect instead of waiting for the next backend event.
    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      const wasConnected = isConnected;
      isConnected = state.isConnected !== false;

      if (!wasConnected && isConnected) {
        reconcile();
      }
    });

    // Reconciles right away when the app returns to the foreground, instead
    // of waiting for the next backend event.
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          reconcile();
        }
      },
    );

    return {
      disconnect: () => {
        unsubscribeFromBackend();
        netInfoUnsubscribe();
        appStateSubscription.remove();
      },
    };
  },
};
