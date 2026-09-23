import { View } from "react-native";

import { Text } from "@/components/ui/Text";
import { PaymentMethodChip } from "@/features/gifts/components/PaymentMethodChip";
import type { PaymentMethod } from "@/features/purchases/types";

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({ selectedMethod, onSelect }: PaymentMethodSelectorProps) {
  return (
    <View className="gap-4">
      <Text className="text-h5 font-sans-medium text-foreground-primary">Payment method</Text>
      <View className="flex-row flex-wrap gap-2">
        <PaymentMethodChip
          label="Card"
          icon="card-outline"
          isSelected={selectedMethod === "card"}
          onPress={() => onSelect("card")}
        />
        <PaymentMethodChip
          label="Apple Pay"
          icon="logo-apple"
          isSelected={selectedMethod === "apple"}
          onPress={() => onSelect("apple")}
        />
        <PaymentMethodChip
          label="PayPal"
          icon="logo-paypal"
          isSelected={selectedMethod === "paypal"}
          onPress={() => onSelect("paypal")}
        />
        <PaymentMethodChip
          label="Crypto"
          icon="logo-bitcoin"
          isSelected={selectedMethod === "crypto"}
          onPress={() => onSelect("crypto")}
        />
      </View>
    </View>
  );
}
