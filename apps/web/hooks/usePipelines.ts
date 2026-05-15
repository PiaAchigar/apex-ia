"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export function usePipelines() {
  return useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const response = await apiClient.get<Pipeline[]>("/pipeline");
      return response;
    },
    staleTime: 30_000,
  });
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const response = await apiClient.post<Pipeline>("/pipeline", { name });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
  });
}

export function useRenamePipeline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pipelineId,
      name,
    }: {
      pipelineId: string;
      name: string;
    }) => {
      const response = await apiClient.patch<Pipeline>(`/pipeline/${pipelineId}`, {
        name,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
  });
}

export function useDeletePipeline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pipelineId: string) => {
      await apiClient.delete(`/pipeline/${pipelineId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
  });
}
