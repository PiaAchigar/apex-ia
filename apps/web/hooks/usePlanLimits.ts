import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface ResourceLimit {
  allowed: boolean;
  limit: number;
  current: number;
}

export interface PlanLimitsData {
  flows: ResourceLimit;
  channels: ResourceLimit;
  conversations: ResourceLimit;
  team_members: ResourceLimit;
}

interface PlanLimitsResult {
  success: boolean;
  data: PlanLimitsData;
}

const QUERY_KEY = ["plan-limits"];

export function usePlanLimits(): UseQueryResult<PlanLimitsData, Error> {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<PlanLimitsResult>("/billing/plan-limits");
      return response.data;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
