import { useState } from "react";
import { Modal, Pressable } from "react-native";
import { clsx } from "clsx";

import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import {
  dropNextResponse,
  rejectNextMessage,
  simulateIncomingMessages,
} from "@/features/chat/services/chatService";
import { CURRENT_FAN_ID } from "@/features/chat/constants/mockConversations";
import { clearSubscriptionAccess } from "@/features/subscriptions/services/subscriptionService";
import { useDebugNetworkStore } from "@/store/debugNetworkStore";

const SIMULATED_INCOMING_TEXTS = [
  "Hey, you still there?",
  "Just following up on this 🙂",
  "Let me know when you're back online.",
  "No rush, whenever works for you!",
];

interface ChatDebugMenuProps {
  conversationId: string;
  participantId: string;
}

/**
 * Floating control for reproducing the failure scenarios the task requires
 * (lost response, rejected content, incoming messages while offline)
 * without a real backend to trigger them from. Always visible for this demo
 * build — there's no other way to reach these scenarios by tapping the app.
 */
export function ChatDebugMenu({ conversationId, participantId }: ChatDebugMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isForcedOffline = useDebugNetworkStore((state) => state.isForcedOffline);
  const setForcedOffline = useDebugNetworkStore((state) => state.setForcedOffline);

  const handleToggleOffline = () => {
    setForcedOffline(!isForcedOffline);
  };

  const handleDropNextResponse = () => {
    dropNextResponse(conversationId);
    setIsOpen(false);
  };

  const handleRejectNextMessage = () => {
    rejectNextMessage(conversationId);
    setIsOpen(false);
  };

  const handleClearSubscriptionAccess = () => {
    void clearSubscriptionAccess(CURRENT_FAN_ID);
    setIsOpen(false);
  };

  const handleSimulateIncoming = () => {
    // simulateIncomingMessages pushes straight into the backend, which
    // notifies mockChatConnection's own subscription — no separate sync
    // trigger needed here.
    simulateIncomingMessages(conversationId, participantId, SIMULATED_INCOMING_TEXTS);
    setIsOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={
          isForcedOffline ? "Open demo controls (offline forced)" : "Open demo controls"
        }
        className={clsx(
          "absolute right-4 top-1/2 h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full shadow-lg",
          { "bg-error": !isForcedOffline, "bg-offline": isForcedOffline },
        )}
      >
        <Icon
          name={isForcedOffline ? "cloud-offline-outline" : "bug-outline"}
          size={22}
          className="text-white"
        />
      </Pressable>
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/20 p-4"
          onPress={() => setIsOpen(false)}
        >
          <Pressable
            accessible={false}
            className="w-full max-w-sm gap-3 rounded-2xl bg-surface p-5"
            onPress={() => {}}
          >
            <Text className="text-h5 font-sans-medium text-foreground-primary">Demo controls</Text>
            <Text className="text-caption text-foreground-secondary">
              Dev-only — simulates failure scenarios the mock backend can&apos;t trigger from a real
              UI action.
            </Text>
            <Pressable
              onPress={handleToggleOffline}
              accessibilityRole="button"
              className={clsx("rounded-lg border px-4 py-3", {
                "border-border-light": !isForcedOffline,
                "border-offline bg-offline/5": isForcedOffline,
              })}
            >
              <Text className="text-body font-sans-medium text-foreground-primary">
                {isForcedOffline ? "Go back online" : "Go offline"}
              </Text>
              <Text className="text-caption text-foreground-secondary">
                Forces every send to stay queued (clock icon) instead of reaching the backend — the
                Simulator has no real network radio to toggle, so this stands in for Airplane Mode.
                Toggle off to reconnect and flush the queue.
              </Text>
            </Pressable>
            <Pressable
              onPress={handleDropNextResponse}
              accessibilityRole="button"
              className="rounded-lg border border-border-light px-4 py-3"
            >
              <Text className="text-body font-sans-medium text-foreground-primary">
                Drop next response
              </Text>
              <Text className="text-caption text-foreground-secondary">
                Next send is accepted by the backend but its confirmation never arrives — send a
                message, watch it fail, then retry to confirm no duplicate is created.
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSimulateIncoming}
              accessibilityRole="button"
              className="rounded-lg border border-border-light px-4 py-3"
            >
              <Text className="text-body font-sans-medium text-foreground-primary">
                Simulate 4 incoming messages
              </Text>
              <Text className="text-caption text-foreground-secondary">
                Adds 4 messages from the other participant — go offline first to see them recovered
                on reconnect.
              </Text>
            </Pressable>
            <Pressable
              onPress={handleRejectNextMessage}
              accessibilityRole="button"
              className="rounded-lg border border-border-light px-4 py-3"
            >
              <Text className="text-body font-sans-medium text-foreground-primary">
                Reject next message (non-recoverable)
              </Text>
              <Text className="text-caption text-foreground-secondary">
                Next send is refused outright by the backend — no retry offered, since resending the
                same text would fail again.
              </Text>
            </Pressable>
            <Pressable
              onPress={handleClearSubscriptionAccess}
              accessibilityRole="button"
              className="rounded-lg border border-border-light px-4 py-3"
            >
              <Text className="text-body font-sans-medium text-foreground-primary">
                Clear subscription access
              </Text>
              <Text className="text-caption text-foreground-secondary">
                Simulates a reinstall: wipes local fan access but keeps the store purchase record,
                so "Restore purchase" in the paywall has something to find.
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
