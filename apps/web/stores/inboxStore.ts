import { create } from "zustand";
import type { InboxFiltersType } from "@apex-ia/types";

type ConversationPreview = {
  id: string;
  contactId: string;
  channel: string;
  status: string;
  assignedAgentId: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string | null;
};

type InboxState = {
  conversations: ConversationPreview[];
  selectedConversationId: string | null;
  filters: InboxFiltersType;
  unreadCount: number;

  setConversations: (conversations: ConversationPreview[]) => void;
  addOrUpdateConversation: (conversation: ConversationPreview) => void;
  selectConversation: (id: string | null) => void;
  setFilters: (filters: Partial<InboxFiltersType>) => void;
  incrementUnreadCount: () => void;
  resetUnreadCount: () => void;
};

export const useInboxStore = create<InboxState>((set) => ({
  conversations: [],
  selectedConversationId: null,
  filters: { tab: "all", page: 1, limit: 30 },
  unreadCount: 0,

  setConversations: (conversations) => set({ conversations }),

  addOrUpdateConversation: (conversation) =>
    set((state) => {
      const existing = state.conversations.findIndex((c) => c.id === conversation.id);
      if (existing >= 0) {
        const updated = [...state.conversations];
        updated[existing] = conversation;
        return { conversations: updated };
      }
      return { conversations: [conversation, ...state.conversations] };
    }),

  selectConversation: (id) => set({ selectedConversationId: id }),

  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters, page: 1 } })),

  incrementUnreadCount: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),

  resetUnreadCount: () => set({ unreadCount: 0 }),
}));
