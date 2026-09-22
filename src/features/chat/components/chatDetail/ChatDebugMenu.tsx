import { useState } from "react";
import { Modal, Pressable } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import {
  dropNextResponse,
  rejectNextMessage,
  simulateIncomingMessages,
} from "@/features/chat/services/chatService";

const SIMULATED_INCOMING_TEXTS = [
  "Hey, you still there?",
  "Just following up on this 🙂",
  "Let me know when you're back online.",
  "No rush, whenever works for you!",
];

interface ChatDebugMenuProps {
  conversationId: string;
  participantId: string;
  onForceSync: () => void;
}

/**
 * Floating control for reproducing the failure scenarios the task requires
 * (lost response, rejected content, incoming messages while offline)
 * without a real backend to trigger them from. Always visible for this demo
 * build — there's no other way to reach these scenarios by tapping the app.
 */
export function ChatDebugMenu({ conversationId, participantId, onForceSync }: ChatDebugMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDropNextResponse = () => {
    dropNextResponse(conversationId);
    setIsOpen(false);
  };

  const handleRejectNextMessage = () => {
    rejectNextMessage(conversationId);
    setIsOpen(false);
  };

  const handleSimulateIncoming = () => {
    simulateIncomingMessages(conversationId, participantId, SIMULATED_INCOMING_TEXTS);
    onForceSync();
    setIsOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Open demo controls"
        className="absolute bottom-24 right-4 h-12 w-12 items-center justify-center rounded-full bg-error shadow-lg"
      >
        <Icon name="bug-outline" size={22} className="text-white" />
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
            className="w-full max-w-sm gap-3 rounded-2xl bg-surface p-5"
            onPress={() => {}}
          >
            <Text className="text-h5 font-sans-medium text-foreground-primary">Demo controls</Text>
            <Text className="text-caption text-foreground-secondary">
              Dev-only — simulates failure scenarios the mock backend can&apos;t trigger from a real
              UI action.
            </Text>
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
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
