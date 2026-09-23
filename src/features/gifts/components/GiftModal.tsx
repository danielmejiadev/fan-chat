import { useEffect } from "react";
import { Modal, ScrollView, View } from "react-native";
import { clsx } from "clsx";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";

import { IconButton } from "@/components/ui/IconButton";
import type { Conversation } from "@/features/chat/constants/mockConversations";
import { CURRENT_FAN_ID } from "@/features/chat/constants/mockConversations";
import { formatUsdFromCents } from "@/features/gifts/constants/giftAmounts";
import { GiftAmountSelector } from "@/features/gifts/components/GiftAmountSelector";
import { GiftModalHeader } from "@/features/gifts/components/GiftModalHeader";
import { GiftPaymentDetailsForm } from "@/features/gifts/components/GiftPaymentDetailsForm";
import { PaymentMethodSelector } from "@/features/gifts/components/PaymentMethodSelector";
import { useGiftPurchase } from "@/features/gifts/hooks/useGiftPurchase";
import { giftFormSchema, type GiftFormValues } from "@/features/gifts/utils/giftFormSchema";
import { useIsDesktopLayout } from "@/hooks/useIsDesktopLayout";

interface GiftModalProps {
  conversation: Conversation;
  visible: boolean;
  onClose: () => void;
  onGiftSent: (text: string) => void;
}

export function GiftModal({ conversation, visible, onClose, onGiftSent }: GiftModalProps) {
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
    },
  });
  const { state, errorMessage, pay, reset } = useGiftPurchase(
    CURRENT_FAN_ID,
    `gift-${conversation.id}`,
  );
  const selectedAmountCents = useWatch({ control, name: "amountCents" });

  // Fires once this gift's own purchase resolves as succeeded — each gift is
  // its own independent, consumable transaction, not an unlock of any
  // persistent access.
  useEffect(() => {
    if (state === "confirmed") {
      onGiftSent(`You sent a ${formatUsdFromCents(selectedAmountCents)} gift!`);
      reset();
      onClose();
    }
  }, [state, selectedAmountCents, onGiftSent, reset, onClose]);

  const onSubmit = (values: GiftFormValues) => {
    void pay(values.amountCents);
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
          <IconButton
            name="close"
            onPress={onClose}
            accessibilityLabel="Close"
            className="absolute right-3 top-3 z-10"
          />

          <GiftModalHeader conversation={conversation} />

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
