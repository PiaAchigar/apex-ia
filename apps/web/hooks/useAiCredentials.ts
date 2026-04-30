"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface AiCredential {
  id: string;
  provider: "anthropic" | "openai" | "gemini" | "openrouter";
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCredentialInput {
  provider: "anthropic" | "openai" | "gemini" | "openrouter";
  apiKey: string;
  isPrimary?: boolean;
}

export interface UpdateCredentialInput {
  isPrimary?: boolean;
  isActive?: boolean;
}

export function useAiCredentials() {
  const queryKey = ["ai-credentials"];
  const queryClient = useQueryClient();

  const listQuery = useQuery<AiCredential[]>({
    queryKey,
    queryFn: async () => apiClient.get<AiCredential[]>("/settings/ai-credentials"),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateCredentialInput) =>
      apiClient.post<AiCredential>("/settings/ai-credentials", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (params: { id: string; input: UpdateCredentialInput }) =>
      apiClient.patch<AiCredential>(
        `/settings/ai-credentials/${params.id}`,
        params.input
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const setApiKeyMutation = useMutation({
    mutationFn: async (params: { id: string; apiKey: string }) =>
      apiClient.post<AiCredential>(
        `/settings/ai-credentials/${params.id}/key`,
        { apiKey: params.apiKey }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiClient.delete(`/settings/ai-credentials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    credentials: listQuery.data || [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    setApiKey: setApiKeyMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
  };
}
