"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface ApiKeyPublic {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface GenerateApiKeyResponse {
  key: string;
  record: ApiKeyPublic;
}

const QUERY_KEY = ["api-keys"];

export function useApiKeys() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const data = await apiClient.get<ApiKeyPublic[]>("/settings/api-keys");
      return data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const generateMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiClient.post<GenerateApiKeyResponse>(
        "/settings/api-keys",
        { name }
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await apiClient.delete(`/settings/api-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    keys: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    generate: generateMutation.mutateAsync,
    revoke: revokeMutation.mutateAsync,
  };
}
