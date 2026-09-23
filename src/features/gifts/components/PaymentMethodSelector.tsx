import { View } from "react-native";
import type { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/Text";
import { PaymentMethodChip } from "@/features/gifts/components/PaymentMethodChip";
import type { PaymentMethod } from "@/features/purchases/types";

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "card", label: "Card", icon: "card-outline" },
  { value: "apple", label: "Apple Pay", icon: "logo-apple" },
  { value: "paypal", label: "PayPal", icon: "logo-paypal" },
  { value: "crypto", label: "Crypto", icon: "logo-bitcoin" },
];

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({ selectedMethod, onSelect }: PaymentMethodSelectorProps) {
  return (
    <View className="gap-4">
      <Text className="text-h5 font-sans-medium text-foreground-primary">Payment method</Text>
      <View className="flex-row flex-wrap gap-2">
        {PAYMENT_METHODS.map((method) => (
          <PaymentMethodChip
            key={method.value}
            label={method.label}
            icon={method.icon}
            isSelected={selectedMethod === method.value}
            onPress={() => onSelect(method.value)}
          />
        ))}
      </View>
    </View>
  );
}
