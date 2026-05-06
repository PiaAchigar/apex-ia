"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface SetupStatusResponse {
  isComplete: boolean;
  paidAt: string | null;
  plan: string;
}

export function useSetupStatus() {
  const query = useQuery({
    queryKey: ["setup-status"],
    queryFn: () => apiClient.get<SetupStatusResponse>("/setup/status"),
    staleTime: 0,
    retry: 1,
  });

  return {
    isComplete: query.data?.isComplete ?? false,
    plan: query.data?.plan ?? "",
    isLoading: query.isLoading || query.isError,
  };
}
