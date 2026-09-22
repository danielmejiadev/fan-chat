import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { clsx } from "clsx";

import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { TextInput } from "@/components/ui/TextInput";
import type { Conversation } from "@/features/chat/constants/mockConversations";
import { CURRENT_FAN_ID } from "@/features/chat/constants/mockConversations";
import { formatUsdFromCents, GIFT_AMOUNT_CENTS } from "@/features/purchases/constants/giftAmounts";
import { PaymentMethodChip } from "@/features/purchases/components/PaymentMethodChip";
import { useGiftPurchase } from "@/features/purchases/hooks/useGiftPurchase";
import { useIsDesktopLayout } from "@/hooks/useIsDesktopLayout";
import type { PurchaseAttemptOutcome } from "@/mockApi/purchases/mockPurchaseBackend";
import { StorePurchaseStatus } from "@/features/purchases/types";

type PaymentMethod = "card" | "apple" | "paypal" | "crypto";

const DEBUG_OUTCOMES: { label: string; value: PurchaseAttemptOutcome }[] = [
  { label: "Success", value: StorePurchaseStatus.Succeeded },
  { label: "Cancel", value: StorePurchaseStatus.Canceled },
  { label: "Fail", value: StorePurchaseStatus.Failed },
];

interface GiftModalProps {
  conversation: Conversation;
  visible: boolean;
  onClose: () => void;
  onGiftSent: (text: string) => void;
  onEntitlementChange: () => void;
}

export function GiftModal({
  conversation,
  visible,
  onClose,
  onGiftSent,
  onEntitlementChange,
}: GiftModalProps) {
  const isDesktop = useIsDesktopLayout();
  const [selectedAmountCents, setSelectedAmountCents] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [email, setEmail] = useState("ethanss@gmail.com");
  const [debugOutcome, setDebugOutcome] = useState<PurchaseAttemptOutcome | undefined>(undefined);
  const { state, errorMessage, pay, restore, reset } = useGiftPurchase(
    CURRENT_FAN_ID,
    `gift-${conversation.id}`,
  );

  // Fires once the backend's delayed confirmation resolves — pay() itself
  // can't close the modal synchronously, since "confirmed" only arrives
  // after that delay.
  useEffect(() => {
    if (state === "confirmed") {
      onGiftSent(`You sent a ${formatUsdFromCents(selectedAmountCents)} gift!`);
      onEntitlementChange();
      reset();
      onClose();
    }
  }, [state, selectedAmountCents, onGiftSent, onEntitlementChange, reset, onClose]);

  const handlePay = () => {
    pay(selectedAmountCents, debugOutcome);
  };

  const handleRestore = () => {
    const didRestore = restore();
    if (didRestore) {
      onEntitlementChange();
    }
  };

  const payButtonLabel = () => {
    if (state === "pending") {
      return "Processing…";
    }
    if (state === "pending-confirmation") {
      return "Confirming access…";
    }
    return `Pay ${formatUsdFromCents(selectedAmountCents)}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/20 p-4">
        <View
          className={clsx("max-h-[90%] w-full rounded-2xl bg-surface p-6", {
            "max-w-[720px]": isDesktop,
            "max-w-md": !isDesktop,
          })}
        >
          <View className="mb-6 flex-row items-center">
            <Text className="flex-1 text-h4 font-sans-medium text-foreground-primary">
              Gift the creator
            </Text>
            <View className="flex-row items-center gap-2">
              <Avatar
                name={conversation.participantName}
                size={28}
                tint={conversation.avatarTint}
              />
              <View>
                <Text className="text-h5 font-sans-medium text-foreground-primary">
                  {conversation.participantName}
                </Text>
                <Text className="text-caption text-foreground-secondary">
                  {conversation.participantHandle}
                </Text>
              </View>
            </View>
          </View>

          <View className={clsx({ "flex-row gap-8": isDesktop, "gap-6": !isDesktop })}>
            <View className="flex-1 gap-4">
              <Text className="text-h5 font-sans-medium text-foreground-primary">
                Payment method
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <PaymentMethodChip
                  label="Card"
                  icon="card-outline"
                  isSelected={paymentMethod === "card"}
                  onPress={() => setPaymentMethod("card")}
                />
                <PaymentMethodChip
                  label="Apple Pay"
                  icon="logo-apple"
                  isSelected={paymentMethod === "apple"}
                  onPress={() => setPaymentMethod("apple")}
                />
                <PaymentMethodChip
                  label="PayPal"
                  icon="logo-paypal"
                  isSelected={paymentMethod === "paypal"}
                  onPress={() => setPaymentMethod("paypal")}
                />
                <PaymentMethodChip
                  label="Crypto"
                  icon="logo-bitcoin"
                  isSelected={paymentMethod === "crypto"}
                  onPress={() => setPaymentMethod("crypto")}
                />
              </View>

              <View className="rounded-xl border border-border p-4">
                <Text className="mb-3 text-h5 font-sans-medium text-foreground-primary">
                  Gift for the creator
                </Text>
                <View className="mb-3 flex-row gap-2">
                  {GIFT_AMOUNT_CENTS.map((amountCents) => (
                    <Pressable
                      key={amountCents}
                      onPress={() => setSelectedAmountCents(amountCents)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedAmountCents === amountCents }}
                      className={clsx("h-9 flex-1 items-center justify-center rounded-lg border", {
                        "border-primary bg-highlight": selectedAmountCents === amountCents,
                        "border-border-light bg-surface": selectedAmountCents !== amountCents,
                      })}
                    >
                      <Text className="text-caption text-foreground-primary">
                        {formatUsdFromCents(amountCents)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-body text-foreground-secondary">Subtotal</Text>
                  <Text className="text-body text-foreground-primary">
                    {formatUsdFromCents(selectedAmountCents)}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-body text-foreground-secondary">Fees</Text>
                  <Text className="text-body text-foreground-primary">$0.00</Text>
                </View>
                <View className="mt-2 flex-row justify-between border-t border-border pt-2">
                  <Text className="text-h5 font-sans-medium text-foreground-primary">Total</Text>
                  <Text className="text-h5 font-sans-medium text-foreground-primary">
                    {formatUsdFromCents(selectedAmountCents)}
                  </Text>
                </View>
              </View>

              <View className="gap-2 rounded-xl border border-dashed border-border-light p-3">
                <Text className="text-caption font-sans-medium text-foreground-secondary">
                  Demo: force store outcome
                </Text>
                <View className="flex-row gap-2">
                  {DEBUG_OUTCOMES.map((outcome) => (
                    <Pressable
                      key={outcome.value}
                      onPress={() => setDebugOutcome(outcome.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: debugOutcome === outcome.value }}
                      className={clsx("h-8 flex-1 items-center justify-center rounded-lg border", {
                        "border-primary bg-highlight": debugOutcome === outcome.value,
                        "border-border-light bg-surface": debugOutcome !== outcome.value,
                      })}
                    >
                      <Text className="text-caption text-foreground-primary">{outcome.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={handleRestore} accessibilityRole="button">
                  <Text className="text-caption font-sans-medium text-primary">
                    Restore purchases
                  </Text>
                </Pressable>
              </View>
            </View>

            <View className="flex-1 gap-4">
              <Text className="text-h5 font-sans-medium text-foreground-primary">
                Payment details
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor="#737373"
                className="h-10 rounded-lg border border-border-light px-3 text-body text-foreground-primary"
              />
              <View className="h-10 flex-row items-center rounded-lg border border-border-light px-3">
                <Icon name="card-outline" size={16} className="text-foreground-muted" />
                <Text className="ml-2 flex-1 text-body text-foreground-secondary">
                  •••• •••• •••• 4242
                </Text>
              </View>
              <Pressable
                onPress={handlePay}
                accessibilityRole="button"
                disabled={state === "pending" || state === "pending-confirmation"}
                className={clsx("h-11 items-center justify-center rounded-[10px] bg-primary", {
                  "opacity-60": state === "pending" || state === "pending-confirmation",
                })}
              >
                <Text className="text-h5 font-sans-medium text-white">{payButtonLabel()}</Text>
              </Pressable>
              {state === "pending-confirmation" && (
                <Text className="text-caption text-foreground-secondary">
                  Payment received — waiting for the backend to confirm access.
                </Text>
              )}
              {errorMessage && <Text className="text-caption text-error">{errorMessage}</Text>}
              {state === "canceled" && (
                <Text className="text-caption text-foreground-secondary">Purchase canceled.</Text>
              )}
              <Text className="text-caption text-foreground-secondary">
                By clicking Pay, you agree to a mock FanSuite gift checkout.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
