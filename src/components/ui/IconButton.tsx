import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { clsx } from "clsx";

import { Icon } from "@/components/ui/Icon";

const VARIANT_CLASSNAMES = {
  ghost: { bg: "bg-transparent", icon: "text-foreground-primary" },
  muted: { bg: "bg-surface-muted shadow-inset-primary", icon: "text-ring" },
  primary: {
    bg: "bg-primary border border-primary shadow-inset-xs",
    icon: "text-primary-foreground",
  },
  gift: { bg: "bg-surface-muted shadow-inset-primary", icon: "text-ring" },
};

interface IconButtonProps {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  accessibilityLabel: string;
  variant?: "ghost" | "muted" | "primary" | "gift";
  className?: string;
}

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  variant = "ghost",
  className,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      className={clsx(
        "h-9 w-9 items-center justify-center rounded-control",
        VARIANT_CLASSNAMES[variant].bg,
        className,
      )}
    >
      <Icon name={name} size={16} className={VARIANT_CLASSNAMES[variant].icon} />
    </Pressable>
  );
}
