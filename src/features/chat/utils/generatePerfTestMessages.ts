import { createSeededRandom } from "@/features/chat/utils/seededRandom";
import type { ServerMessage } from "@/features/chat/types";

export const PERF_TEST_CONVERSATION_ID = "perf-test";
export const PERF_TEST_MESSAGE_COUNT = 50_000;
export const PERF_TEST_FAN_SENDER_ID = "perf-test-fan";
export const PERF_TEST_CREATOR_SENDER_ID = "perf-test-creator";

const PERF_TEST_SEED = 42;

// Mixed lengths on purpose — the list has to render short one-liners and
// multi-line bubbles side by side, same as a real thread.
const SAMPLE_SENTENCES = [
  "Hey!",
  "Sounds good.",
  "On my way.",
  "Thanks so much for this, really appreciate it.",
  "Just posted a new video, check it out when you get a chance!",
  "Can't wait to see the next drop, the last one was amazing.",
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut ultrices aliquam turpis in rhoncus.",
  "That's hilarious 😂",
  "Let me know what you think once you've had a chance to watch it.",
  "See you at the livestream tonight?",
  "Morbi risus nunc, cras nulla quam, iaculis ut nisl sed, commodo efficitur arcu.",
  "👍",
  "Working on something new, stay tuned.",
  "Appreciate the support, it means a lot.",
  "Haha yeah exactly",
];

/**
 * Deterministic: same seed and fixed reference timestamp on every call, so
 * the 50k-message dataset is identical across runs and devices — required
 * for the scroll+typing profiling script in Phase 5 to be comparable.
 */
export function generatePerfTestMessages(): ServerMessage[] {
  const random = createSeededRandom(PERF_TEST_SEED);
  const messages: ServerMessage[] = [];

  const referenceTimestamp = Date.UTC(2026, 0, 1);
  let timestamp = referenceTimestamp - PERF_TEST_MESSAGE_COUNT * 60_000;

  for (let index = 0; index < PERF_TEST_MESSAGE_COUNT; index += 1) {
    const isFromCreator = index % 2 === 0;
    const sentenceIndex = Math.floor(random() * SAMPLE_SENTENCES.length);

    messages.push({
      serverId: `perf_${index}`,
      clientId: null,
      conversationId: PERF_TEST_CONVERSATION_ID,
      senderId: isFromCreator ? PERF_TEST_CREATOR_SENDER_ID : PERF_TEST_FAN_SENDER_ID,
      text: SAMPLE_SENTENCES[sentenceIndex],
      createdAt: timestamp,
    });

    timestamp += 60_000 + Math.floor(random() * 5_000);
  }

  return messages;
}
