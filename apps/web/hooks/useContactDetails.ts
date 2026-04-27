"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: string[];
  isArchived: boolean;
  createdAt: string | null;
  recentConversations: Array<{
    id: string;
    channel: string;
    status: string;
    lastMessageAt: string | null;
  }>;
};

export function useContactDetails(contactId: string | null) {
  const query = useQuery<Contact>({
    queryKey: ["contact", contactId],
    queryFn: () => apiClient.get<Contact>(`/contacts/${contactId}`),
    enabled: !!contactId,
    staleTime: 30_000,
  });

  return {
    contact: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
