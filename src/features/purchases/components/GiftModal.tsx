import { useEffect } from "react";
import { Modal, ScrollView, View } from "react-native";
import { clsx } from "clsx";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";

import type { Conversation } from "@/features/chat/constants/mockConversations";
import { CURRENT_FAN_ID } from "@/features/chat/constants/mockConversations";
import { formatUsdFromCents } from "@/features/purchases/constants/giftAmounts";
import { DebugOutcomeSelector } from "@/features/purchases/components/DebugOutcomeSelector";
import { GiftAmountSelector } from "@/features/purchases/components/GiftAmountSelector";
import { GiftModalHeader } from "@/features/purchases/components/GiftModalHeader";
import { GiftPaymentDetailsForm } from "@/features/purchases/components/GiftPaymentDetailsForm";
import { PaymentMethodSelector } from "@/features/purchases/components/PaymentMethodSelector";
import { useGiftPurchase } from "@/features/purchases/hooks/useGiftPurchase";
import { StorePurchaseStatus } from "@/features/purchases/types";
import { giftFormSchema, type GiftFormValues } from "@/features/purchases/utils/giftFormSchema";
import { useIsDesktopLayout } from "@/hooks/useIsDesktopLayout";

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
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<GiftFormValues>({
    resolver: zodResolver(giftFormSchema),
    defaultValues: {
      email: "ethanss@gmail.com",
      amountCents: 0,
      paymentMethod: "card",
      debugOutcome: StorePurchaseStatus.Succeeded,
    },
  });
  const { state, errorMessage, pay, restore, reset } = useGiftPurchase(
    CURRENT_FAN_ID,
    `gift-${conversation.id}`,
  );
  const selectedAmountCents = useWatch({ control, name: "amountCents" });

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

  const onSubmit = (values: GiftFormValues) => {
    void pay(values.amountCents, values.debugOutcome);
  };

  const handleRestore = async () => {
    const didRestore = await restore();
    if (didRestore) {
      onEntitlementChange();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/20 p-4">
        <View
          className={clsx("max-h-[90%] w-full overflow-hidden rounded-2xl bg-surface p-6", {
            "max-w-[720px]": isDesktop,
            "max-w-md": !isDesktop,
          })}
        >
          <GiftModalHeader conversation={conversation} onClose={onClose} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className={clsx({ "flex-row gap-8": isDesktop, "gap-6": !isDesktop })}>
              <View className="flex-1 gap-4">
                <Controller
                  control={control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <PaymentMethodSelector selectedMethod={field.value} onSelect={field.onChange} />
                  )}
                />
                <Controller
                  control={control}
                  name="amountCents"
                  render={({ field }) => (
                    <GiftAmountSelector
                      selectedAmountCents={field.value}
                      onSelect={field.onChange}
                      errorMessage={errors.amountCents?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="debugOutcome"
                  render={({ field }) => (
                    <DebugOutcomeSelector
                      selectedOutcome={field.value}
                      onSelect={field.onChange}
                      onRestore={() => void handleRestore()}
                    />
                  )}
                />
              </View>

              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <GiftPaymentDetailsForm
                    email={field.value}
                    onEmailChange={field.onChange}
                    emailError={errors.email?.message}
                    amountCents={selectedAmountCents}
                    state={state}
                    errorMessage={errorMessage}
                    onPay={() => void handleSubmit(onSubmit)()}
                  />
                )}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
