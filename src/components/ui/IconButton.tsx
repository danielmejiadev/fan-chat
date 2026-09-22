import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { clsx } from "clsx";

import { Icon } from "@/components/ui/Icon";

const DEFAULT_BG_CLASSNAME = {
  ghost: "bg-transparent",
  muted: "bg-surface-muted shadow-inset-primary",
  primary: "bg-primary border border-primary shadow-inset-xs",
  gift: "bg-surface-muted shadow-inset-primary",
};

const DEFAULT_ICON_CLASSNAME = {
  ghost: "text-foreground-primary",
  muted: "text-ring",
  primary: "text-[#FAFAFA]",
  gift: "text-ring",
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
      className={clsx(
        "h-9 w-9 items-center justify-center rounded-[10px]",
        DEFAULT_BG_CLASSNAME[variant],
        className,
      )}
    >
      <Icon name={name} size={16} className={DEFAULT_ICON_CLASSNAME[variant]} />
    </Pressable>
  );
}
