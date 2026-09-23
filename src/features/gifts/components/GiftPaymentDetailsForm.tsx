import { View } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Text } from "@/components/ui/Text";
import { TextInput } from "@/components/ui/TextInput";
import { GiftPurchaseState } from "@/features/gifts/hooks/useGiftPurchase";
import { getPayButtonLabel } from "@/features/gifts/utils/payButtonLabel";

interface GiftPaymentDetailsFormProps {
  email: string;
  onEmailChange: (email: string) => void;
  emailError?: string;
  amountCents: number;
  state: GiftPurchaseState;
  errorMessage: string | null;
  onPay: () => void;
}

export function GiftPaymentDetailsForm({
  email,
  onEmailChange,
  emailError,
  amountCents,
  state,
  errorMessage,
  onPay,
}: GiftPaymentDetailsFormProps) {
  const isProcessing = state === GiftPurchaseState.Pending;

  return (
    <View className="flex-1 gap-4">
      <Text className="text-h5 font-sans-medium text-foreground-primary">Payment details</Text>
      <TextInput
        value={email}
        onChangeText={onEmailChange}
        placeholder="Email address"
        // RN's placeholderTextColor can't read a className; keep in sync with --color-foreground-muted in colors.css.
        placeholderTextColor="#737373"
        className="h-10 rounded-lg border border-border-light px-3 text-body text-foreground-primary"
      />
      {emailError && <Text className="text-caption text-error">{emailError}</Text>}
      <View className="h-10 flex-row items-center rounded-lg border border-border-light px-3">
        <Icon name="card-outline" size={16} className="text-foreground-muted" />
        <Text className="ml-2 flex-1 text-body text-foreground-secondary">•••• •••• •••• 4242</Text>
      </View>
      <PrimaryButton
        label={getPayButtonLabel(state, amountCents)}
        onPress={onPay}
        disabled={isProcessing}
      />
      {errorMessage && <Text className="text-caption text-error">{errorMessage}</Text>}
      {state === GiftPurchaseState.Canceled && (
        <Text className="text-caption text-foreground-secondary">Purchase canceled.</Text>
      )}
      <Text className="text-caption text-foreground-secondary">
        By clicking Pay, you agree to a mock FanSuite gift checkout.
      </Text>
    </View>
  );
}
