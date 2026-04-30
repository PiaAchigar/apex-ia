"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface ConversationMetrics {
  totalConversations: number;
  openConversations: number;
  closedConversations: number;
  byChannel: Record<string, number>;
  avgMessagesPerConversation: number;
}

export interface AgentPerformance {
  agentId: string;
  assignedConversations: number;
  messagesHandled: number;
  avgResponseTimeMinutes: number;
}

export interface ChannelSLA {
  channel: string;
  totalConversations: number;
  avgResponseTimeMinutes: number;
  avgResolutionTimeHours: number;
  slaCompliancePercentage: number;
}

export interface VolumeHeatmapData {
  date: string;
  hour: number;
  channel: string;
  messageCount: number;
}

export interface CsatReport {
  averageCsat: number;
  totalRatings: number;
  byRating: Record<number, number>;
  byChannel: Record<string, number>;
}

export function useConversationMetrics(dateRange?: { startDate: Date; endDate: Date }) {
  const queryKey = ["analytics-conversations", dateRange];

  return useQuery<ConversationMetrics>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append("startDate", dateRange.startDate.toISOString());
        params.append("endDate", dateRange.endDate.toISOString());
      }
      return apiClient.get<ConversationMetrics>(`/analytics/conversations?${params}`);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useAgentPerformance(dateRange?: { startDate: Date; endDate: Date }) {
  const queryKey = ["analytics-agents", dateRange];

  return useQuery<AgentPerformance[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append("startDate", dateRange.startDate.toISOString());
        params.append("endDate", dateRange.endDate.toISOString());
      }
      return apiClient.get<AgentPerformance[]>(`/analytics/agents?${params}`);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useChannelSla(dateRange?: { startDate: Date; endDate: Date }) {
  const queryKey = ["analytics-sla", dateRange];

  return useQuery<ChannelSLA[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append("startDate", dateRange.startDate.toISOString());
        params.append("endDate", dateRange.endDate.toISOString());
      }
      return apiClient.get<ChannelSLA[]>(`/analytics/channels-sla?${params}`);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useVolumeHeatmap(startDate: Date, endDate: Date) {
  const queryKey = ["analytics-heatmap", startDate, endDate];

  return useQuery<VolumeHeatmapData[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      return apiClient.get<VolumeHeatmapData[]>(`/analytics/volume-heatmap?${params}`);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCsatReport(dateRange?: { startDate: Date; endDate: Date }) {
  const queryKey = ["analytics-csat", dateRange];

  return useQuery<CsatReport>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append("startDate", dateRange.startDate.toISOString());
        params.append("endDate", dateRange.endDate.toISOString());
      }
      return apiClient.get<CsatReport>(`/analytics/csat?${params}`);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
