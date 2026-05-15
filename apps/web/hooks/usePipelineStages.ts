"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
  color: string | null;
}

export function useAddStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pipelineId,
      name,
      color,
    }: {
      pipelineId: string;
      name: string;
      color?: string;
    }) => {
      const response = await apiClient.post<PipelineStage>(
        `/pipeline/${pipelineId}/stages`,
        { name, color }
      );
      return response;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pipeline-board", variables.pipelineId],
      });
    },
  });
}

export function useUpdateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pipelineId,
      stageId,
      name,
      color,
      order,
    }: {
      pipelineId: string;
      stageId: string;
      name?: string;
      color?: string;
      order?: number;
    }) => {
      const response = await apiClient.patch<PipelineStage>(
        `/pipeline/${pipelineId}/stages/${stageId}`,
        { name, color, order }
      );
      return response;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pipeline-board", variables.pipelineId],
      });
    },
  });
}

export function useDeleteStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pipelineId,
      stageId,
      targetStageId,
    }: {
      pipelineId: string;
      stageId: string;
      targetStageId?: string;
    }) => {
      const params = new URLSearchParams();
      if (targetStageId) {
        params.append("targetStageId", targetStageId);
      }
      await apiClient.delete(
        `/pipeline/${pipelineId}/stages/${stageId}?${params.toString()}`
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pipeline-board", variables.pipelineId],
      });
    },
  });
}
