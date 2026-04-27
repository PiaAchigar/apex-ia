"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { getSocketClient } from "@/lib/socket-client";

type Message = {
  id: string;
  conversationId: string;
  senderType: string;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  isRead: boolean;
  createdAt: string | null;
};

export function useConversationMessages(conversationId: string | null) {
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const query = useQuery<Message[]>({
    queryKey: ["conversation-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      return apiClient.get<Message[]>(`/conversations/${conversationId}/messages`);
    },
    enabled: !!conversationId,
    staleTime: 0,
  });

  useEffect(() => {
    if (!conversationId) return;

    const socket = getSocketClient();
    socket.emit("join_conversation", conversationId);

    const handleNewMessage = (message: Message) => {
      queryClient.setQueryData<Message[]>(
        ["conversation-messages", conversationId],
        (old) => [...(old ?? []), message]
      );

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    };

    socket.on("new_message", handleNewMessage);

    apiClient.patch(`/conversations/${conversationId}/read`, {}).catch(() => {});

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.emit("leave_conversation", conversationId);
    };
  }, [conversationId, queryClient]);

  return { ...query, bottomRef };
}
