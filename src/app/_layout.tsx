import "@/global.css";

import { initChatSchema } from "@/features/chat/storage/chatDatabase";
import { initPurchasesSchema } from "@/features/purchases/storage/purchasesDatabase";
import { Stack } from "expo-router";

initChatSchema();
initPurchasesSchema();

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
