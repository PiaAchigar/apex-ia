"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface AuditLog {
  id: string;
  organizationId: string | null;
  userId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const QUERY_KEY = ["audit-logs"];
const PAGE_SIZE = 20;

export function useAuditLogs() {
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: [...QUERY_KEY, page],
    queryFn: async () => {
      const offset = page * PAGE_SIZE;
      const data = await apiClient.get<AuditLog[]>(
        `/settings/audit-logs?limit=${PAGE_SIZE}&offset=${offset}`
      );
      return data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const logs = query.data || [];
  const hasMore = logs.length === PAGE_SIZE;

  return {
    logs,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    page,
    setPage,
    hasMore,
  };
}
