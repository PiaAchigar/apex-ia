"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  roleId: string;
  roleName: string;
  roleDisplayName: string;
  joinedAt: string;
}

export interface TeamRole {
  id: string;
  name: string;
  displayName: string;
}

const QUERY_KEY = ["team"];

export function useTeam() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const data = await apiClient.get<TeamMember[]>("/settings/team");
      return data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const inviteMutation = useMutation({
    mutationFn: async (input: { email: string; roleId: string }) => {
      await apiClient.post("/settings/team/invite", input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (input: { userId: string; roleId: string }) => {
      await apiClient.patch(`/settings/team/${input.userId}/role`, {
        roleId: input.roleId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/settings/team/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  // Extract unique roles from members for the invite select
  const roles: TeamRole[] = Array.from(
    new Map(
      (query.data || []).map((m) => [
        m.roleId,
        { id: m.roleId, name: m.roleName, displayName: m.roleDisplayName },
      ])
    ).values()
  );

  return {
    members: query.data || [],
    roles,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    invite: inviteMutation.mutateAsync,
    updateRole: updateRoleMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
  };
}
