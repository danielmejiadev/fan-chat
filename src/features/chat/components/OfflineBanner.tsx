import { Text } from "react-native";

export function OfflineBanner() {
  return <Text className="text-error px-4 pb-2">Offline — messages will retry automatically</Text>;
}
