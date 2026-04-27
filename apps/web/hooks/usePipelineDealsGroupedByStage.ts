"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

type Deal = {
  id: string;
  title: string;
  amount: string | null;
  probability: number | null;
  assignedAgentId: string | null;
  contactId: string | null;
  stageId: string;
  createdAt: string | null;
};

type Stage = {
  id: string;
  name: string;
  color: string | null;
  order: number;
  deals: Deal[];
};

type PipelineBoard = {
  pipelineId: string;
  stages: Stage[];
};

export function usePipelineDealsGroupedByStage(pipelineId: string | null) {
  const query = useQuery<PipelineBoard>({
    queryKey: ["pipeline-board", pipelineId],
    queryFn: () => apiClient.get<PipelineBoard>(`/pipeline/${pipelineId}/board`),
    enabled: !!pipelineId,
    staleTime: 30_000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
