import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export function MessageInput({ onSend }: { onSend: (text: string) => void }) {
  const [draftText, setDraftText] = useState("");

  const handleSend = () => {
    if (draftText.trim().length === 0) {
      return;
    }
    onSend(draftText);
    setDraftText("");
  };

  return (
    <View className="flex-row p-4 gap-2">
      <TextInput
        value={draftText}
        onChangeText={setDraftText}
        placeholder="Message..."
        className="flex-1 border border-border-light rounded-lg p-2"
      />
      <Pressable onPress={handleSend}>
        <Text className="text-accent font-semibold">Send</Text>
      </Pressable>
    </View>
  );
}
