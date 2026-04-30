"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type AiUsageSummary = {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  errorRate: number;
};

export type AiUsageByProvider = {
  provider: string;
  requests: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export type AiUsageByModel = {
  model: string;
  provider: string;
  requests: number;
  totalTokens: number;
};

export type AiUsageDailyEntry = {
  date: string;
  requests: number;
  totalTokens: number;
};

export type AiUsageSummaryResponse = {
  summary: AiUsageSummary;
  byProvider: AiUsageByProvider[];
  byModel: AiUsageByModel[];
  dailyTimeline: AiUsageDailyEntry[];
};

export function useAiUsageSummary(dateRange?: { startDate: Date; endDate: Date }) {
  return useQuery({
    queryKey: ["analytics-ai-usage", dateRange?.startDate?.toISOString(), dateRange?.endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append("startDate", dateRange.startDate.toISOString());
        params.append("endDate", dateRange.endDate.toISOString());
      }
      const response = await apiClient.get<{ success: boolean; data: AiUsageSummaryResponse }>(
        `/analytics/ai-usage?${params.toString()}`
      );
      return response.data;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
