const GIFT_MESSAGE_PATTERN = /sent a \$[\d.]+ gift/i;

export function isGiftMessage(text: string): boolean {
  return GIFT_MESSAGE_PATTERN.test(text);
}
