import { PERF_TEST_CONVERSATION_ID } from "@/features/chat/utils/generatePerfTestMessages";

export const CURRENT_FAN_ID = "fan-1";

export type Conversation = {
  id: string;
  participantId: string;
  participantName: string;
  participantHandle: string;
  lastMessagePreview: string;
  lastMessageAt: number;
  isOnline: boolean;
  avatarTint: string;
};

const THIRTY_SECONDS_AGO = Date.now() - 30_000;

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conversation-1",
    participantId: "creator-alex",
    participantName: "Alex Creates",
    participantHandle: "@alexcreates",
    lastMessagePreview: "You: Lorem ipsum dolor sit amet dolor sit",
    lastMessageAt: THIRTY_SECONDS_AGO,
    isOnline: true,
    avatarTint: "#C4B5FD",
  },
  {
    id: "conversation-2",
    participantId: "creator-ethan",
    participantName: "Ethan Shoots",
    participantHandle: "@ethan_shoots",
    lastMessagePreview: "You: Lorem ipsum dolor sit amet dolor sit",
    lastMessageAt: THIRTY_SECONDS_AGO,
    isOnline: true,
    avatarTint: "#F9A8D4",
  },
  {
    id: "conversation-3",
    participantId: "creator-mia",
    participantName: "Mia Studios",
    participantHandle: "@miastudios",
    lastMessagePreview: "You: Lorem ipsum dolor sit amet dolor sit",
    lastMessageAt: THIRTY_SECONDS_AGO,
    isOnline: false,
    avatarTint: "#93C5FD",
  },
  {
    id: "conversation-4",
    participantId: "creator-noah",
    participantName: "Noah Frames",
    participantHandle: "@noahframes",
    lastMessagePreview: "You: Lorem ipsum dolor sit amet dolor sit",
    lastMessageAt: THIRTY_SECONDS_AGO,
    isOnline: true,
    avatarTint: "#FDBA74",
  },
  {
    id: "conversation-5",
    participantId: "creator-luna",
    participantName: "Luna Lights",
    participantHandle: "@lunalights",
    lastMessagePreview: "You: Lorem ipsum dolor sit amet dolor sit",
    lastMessageAt: THIRTY_SECONDS_AGO,
    isOnline: false,
    avatarTint: "#86EFAC",
  },
  {
    id: "conversation-6",
    participantId: "creator-kai",
    participantName: "Kai Motion",
    participantHandle: "@kaimotion",
    lastMessagePreview: "You: Lorem ipsum dolor sit amet dolor sit",
    lastMessageAt: THIRTY_SECONDS_AGO,
    isOnline: true,
    avatarTint: "#FCA5A5",
  },
  {
    id: "conversation-7",
    participantId: "creator-aria",
    participantName: "Aria Voice",
    participantHandle: "@ariavoice",
    lastMessagePreview: "You: Lorem ipsum dolor sit amet dolor sit",
    lastMessageAt: THIRTY_SECONDS_AGO,
    isOnline: true,
    avatarTint: "#FDE68A",
  },
  {
    id: "conversation-8",
    participantId: "creator-leo",
    participantName: "Leo Cuts",
    participantHandle: "@leocuts",
    lastMessagePreview: "You: Lorem ipsum dolor sit amet dolor sit",
    lastMessageAt: THIRTY_SECONDS_AGO,
    isOnline: false,
    avatarTint: "#A5B4FC",
  },
  {
    id: PERF_TEST_CONVERSATION_ID,
    participantId: "perf-test-creator",
    participantName: "Perf Test (50k messages)",
    participantHandle: "@perftest",
    lastMessagePreview: "50,000-message history for scroll/pagination profiling",
    lastMessageAt: THIRTY_SECONDS_AGO,
    isOnline: false,
    avatarTint: "#D4D4D8",
  },
];

export function getConversationById(conversationId: string): Conversation | undefined {
  return MOCK_CONVERSATIONS.find((conversation) => conversation.id === conversationId);
}
