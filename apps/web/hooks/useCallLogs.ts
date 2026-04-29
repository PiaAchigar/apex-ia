"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface CallLog {
  id: string;
  contactId: string;
  duration: number;
  transcript?: string;
  isSuccess: boolean;
  aiModel?: string;
  tokensUsed?: number;
  createdAt: string;
}

export interface CallLogsResponse {
  data: CallLog[];
  total: number;
  page: number;
  limit: number;
}

export function useCallLogs(page: number = 1, limit: number = 30) {
  const queryKey = ["call-logs", { page, limit }];

  return useQuery<CallLogsResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      return apiClient.get<CallLogsResponse>(
        `/call-logs?${params}`
      );
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
