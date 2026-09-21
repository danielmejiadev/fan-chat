import { View } from "react-native";
import { clsx } from "clsx";

import { Text } from "@/components/Text";
import { getInitials } from "@/features/chat/utils/getInitials";

interface AvatarProps {
  name: string;
  size: number;
  tint: string;
  showStatus?: boolean;
  isOnline?: boolean;
}

export function Avatar({ name, size, tint, showStatus, isOnline }: AvatarProps) {
  const statusSize = Math.max(10, Math.round(size * 0.32));

  return (
    <View style={{ width: size, height: size }}>
      <View
        className="items-center justify-center overflow-hidden rounded-full"
        style={{ width: size, height: size, backgroundColor: tint }}
      >
        <Text
          className="font-sans-medium text-foreground-primary"
          style={{ fontSize: size * 0.32 }}
        >
          {getInitials(name)}
        </Text>
      </View>
      {showStatus && (
        <View
          className={clsx("absolute rounded-full border border-surface", {
            "bg-online": isOnline,
            "bg-offline": !isOnline,
          })}
          style={{
            width: statusSize,
            height: statusSize,
            right: 0,
            bottom: 0,
          }}
        />
      )}
    </View>
  );
}
