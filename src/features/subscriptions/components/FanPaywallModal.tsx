import { Modal, Pressable, View } from "react-native";

import { IconButton } from "@/components/ui/IconButton";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Text } from "@/components/ui/Text";
import { CURRENT_FAN_ID } from "@/features/chat/constants/mockConversations";
import {
  FAN_PRODUCT_DESCRIPTION,
  FAN_PRODUCT_NAME,
  formatFanProductPrice,
} from "@/features/subscriptions/constants/fanProduct";
import { useSubscription } from "@/features/subscriptions/hooks/useSubscription";
import { SubscriptionStatus } from "@/features/subscriptions/types";
import {
  getFanPurchaseButtonLabel,
  getFanStatusMessage,
} from "@/features/subscriptions/utils/fanPaywallMessages";

interface FanPaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FanPaywallModal({ visible, onClose }: FanPaywallModalProps) {
  const { purchaseState, status, isAwaitingOutcome, purchase, resolveOutcome, restore } =
    useSubscription(CURRENT_FAN_ID);

  const isBusy = purchaseState === "purchasing" || purchaseState === "restoring";
  const isAlreadyActive = status === SubscriptionStatus.Active;
  const statusMessage = getFanStatusMessage(purchaseState, status);
  const showPrimaryActions = !isAlreadyActive && !isAwaitingOutcome;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/20 p-4">
        <View className="w-full max-w-md overflow-hidden rounded-2xl bg-surface p-6">
          <IconButton
            name="close"
            onPress={onClose}
            accessibilityLabel="Close"
            className="absolute right-3 top-3 z-10"
          />

          <Text className="text-h4 font-sans-semibold text-foreground-primary">
            {FAN_PRODUCT_NAME}
          </Text>
          <Text className="mt-1 text-body text-foreground-secondary">
            {FAN_PRODUCT_DESCRIPTION}
          </Text>
          <Text className="mt-3 text-h3 font-sans-semibold text-foreground-primary">
            {formatFanProductPrice()}
          </Text>

          <View className="mt-4 rounded-lg bg-highlight px-3 py-2">
            <Text className="text-caption font-sans-medium text-foreground-secondary">
              SIMULATED BILLING — No real payment will be charged.
            </Text>
          </View>

          {statusMessage !== null && (
            <Text className="mt-4 text-body text-foreground-primary">{statusMessage}</Text>
          )}

          {showPrimaryActions && (
            <PrimaryButton
              label={getFanPurchaseButtonLabel(purchaseState)}
              onPress={() => void purchase()}
              disabled={isBusy}
              className="mt-5"
            />
          )}

          {isAwaitingOutcome && (
            <View className="mt-5">
              <Text className="text-center text-caption text-foreground-secondary">
                Simulated payment sheet — choose how it resolves:
              </Text>
              <View className="mt-3 flex-row justify-center gap-3">
                <Pressable
                  onPress={() => void resolveOutcome("succeed")}
                  accessibilityRole="button"
                  className="rounded-control bg-primary px-4 py-2"
                >
                  <Text className="text-body font-sans-medium text-primary-foreground">
                    Success
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void resolveOutcome("cancel")}
                  accessibilityRole="button"
                  className="rounded-control border border-border-light px-4 py-2"
                >
                  <Text className="text-body font-sans-medium text-foreground-primary">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => void resolveOutcome("fail")}
                  accessibilityRole="button"
                  className="rounded-control border border-border-light px-4 py-2"
                >
                  <Text className="text-body font-sans-medium text-foreground-primary">Fail</Text>
                </Pressable>
              </View>
            </View>
          )}

          {showPrimaryActions && (
            <Pressable
              onPress={() => void restore()}
              accessibilityRole="button"
              disabled={isBusy}
              className="mt-4 items-center"
            >
              <Text className="text-body text-foreground-secondary">
                Already purchased?{" "}
                <Text className="font-sans-medium text-primary">Restore purchase</Text>
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}
