"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { getSocketClient } from "@/lib/socket-client";
import { useInboxStore } from "@/stores/inboxStore";
import type { InboxFiltersType } from "@apex-ia/types";

type Conversation = {
  id: string;
  contactId: string;
  channel: string;
  status: string;
  assignedAgentId: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string | null;
};

export function useInboxConversations(filters: InboxFiltersType) {
  const { setConversations, addOrUpdateConversation } = useInboxStore();

  const queryKey = ["inbox-conversations", filters];

  const query = useQuery<Conversation[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        tab: filters.tab,
        page: String(filters.page ?? 1),
        limit: String(filters.limit ?? 30),
        ...(filters.channel ? { channel: filters.channel } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      });

      return apiClient.get<Conversation[]>(`/inbox/conversations?${params}`);
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.data) setConversations(query.data);
  }, [query.data, setConversations]);

  useEffect(() => {
    const orgSlug =
      typeof window !== "undefined"
        ? sessionStorage.getItem("apex_org_slug")
        : null;

    if (!orgSlug) return;

    const socket = getSocketClient();
    socket.emit("join_org", orgSlug);

    const handleNewMessage = (data: { conversationId: string; message: unknown }) => {
      query.refetch();
    };

    const handleConversationAssigned = (data: { conversationId: string; agentId: string }) => {
      query.refetch();
    };

    const handleConversationResolved = (data: { conversationId: string }) => {
      query.refetch();
    };

    socket.on("new_message", handleNewMessage);
    socket.on("conversation_assigned", handleConversationAssigned);
    socket.on("conversation_resolved", handleConversationResolved);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("conversation_assigned", handleConversationAssigned);
      socket.off("conversation_resolved", handleConversationResolved);
    };
  }, [query]);

  return query;
}
