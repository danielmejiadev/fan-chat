import { useState } from "react";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Text } from "@/components/ui/Text";
import { TextInput } from "@/components/ui/TextInput";
import { useIsDesktopLayout } from "@/hooks/useIsDesktopLayout";

const MESSAGE_CHARACTER_LIMIT = 400;
const QUICK_REACTIONS = ["🔥", "❤️", "😍", "😂", "😮", "😢", "🙏", "👏", "🎉", "💯"];

interface MessageInputProps {
  onSend: (text: string) => void;
  onOpenGift: () => void;
  onFocus?: () => void;
}

export function MessageInput({ onSend, onOpenGift, onFocus }: MessageInputProps) {
  const isDesktop = useIsDesktopLayout();
  const [draftText, setDraftText] = useState("");

  const handleSend = () => {
    if (draftText.trim().length === 0) {
      return;
    }
    onSend(draftText);
    setDraftText("");
  };

  return (
    <View className="gap-3 border-t border-border bg-surface/95 px-4 pb-6 pt-4">
      {isDesktop && (
        <View className="flex-row gap-1">
          {QUICK_REACTIONS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => setDraftText((currentDraft) => `${currentDraft}${emoji}`)}
              accessibilityRole="button"
              accessibilityLabel={`React with ${emoji}`}
              className="h-8 w-8 items-center justify-center rounded-full"
            >
              <Text>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View className="flex-row items-center gap-3">
        <View className="h-9 flex-1 flex-row items-center gap-2 rounded-lg border border-border-light bg-surface px-3 shadow-xs">
          <Icon name="add-circle" size={16} className="text-foreground-muted" />
          <TextInput
            value={draftText}
            onChangeText={setDraftText}
            placeholder="Type a message"
            placeholderTextColor="#737373"
            maxLength={MESSAGE_CHARACTER_LIMIT}
            className="flex-1 text-body text-foreground-primary"
            onSubmitEditing={handleSend}
            onFocus={onFocus}
          />
        </View>
        <IconButton
          name="gift-outline"
          accessibilityLabel="Gift the creator"
          variant="gift"
          onPress={onOpenGift}
        />
        <IconButton
          name="send-outline"
          accessibilityLabel="Send message"
          variant="primary"
          onPress={handleSend}
        />
      </View>
      <View className="flex-row items-center">
        <Text className="text-caption text-foreground-secondary">
          {draftText.length}/{MESSAGE_CHARACTER_LIMIT}
        </Text>
        <Text className="flex-1 text-right text-caption text-foreground-secondary">
          Available messages: Unlimited
        </Text>
      </View>
    </View>
  );
}
