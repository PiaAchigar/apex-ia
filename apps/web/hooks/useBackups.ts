"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface BackupRecord {
  id: string;
  organizationId: string;
  fileName: string;
  storageBucket: string;
  storagePath: string;
  sizeBytes: number | null;
  status: string;
  createdAt: string;
}

const QUERY_KEY = ["backups"];

export function useBackups() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const data = await apiClient.get<BackupRecord[]>("/settings/backups");
      return data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post<BackupRecord>("/settings/backups", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (backupId: string) => {
      await apiClient.post(`/settings/backups/${backupId}/restore`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (backupId: string) => {
      await apiClient.delete(`/settings/backups/${backupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    backups: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    create: createMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
  };
}
