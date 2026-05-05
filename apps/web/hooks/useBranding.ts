"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";

export interface BrandingConfig {
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  appName: string;
  customDomain: string | null;
  whitelabelEnabled: boolean;
}

export interface UpdateBrandingInput {
  logoUrl?: string | null;
  primaryColor?: string;
  accentColor?: string;
  appName?: string;
  whitelabelEnabled?: boolean;
}

const QUERY_KEY = ["branding"];

const DEFAULT_BRANDING: BrandingConfig = {
  logoUrl: null,
  primaryColor: "#10B981",
  accentColor: "#10B981",
  appName: "Apex IA",
  customDomain: null,
  whitelabelEnabled: false,
};

export function useBranding() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        const data = await apiClient.get<BrandingConfig>("/settings/branding");
        return data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          return DEFAULT_BRANDING;
        }
        throw error;
      }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const updateBrandingMutation = useMutation({
    mutationFn: async (input: UpdateBrandingInput) => {
      await apiClient.put("/settings/branding", input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const updateDomainMutation = useMutation({
    mutationFn: async (customDomain: string | null) => {
      await apiClient.put("/settings/branding/domain", { customDomain });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    branding: query.data || DEFAULT_BRANDING,
    isLoading: query.isLoading,
    isError: query.isError && query.error,
    error: query.error,
    updateBranding: updateBrandingMutation.mutateAsync,
    updateDomain: updateDomainMutation.mutateAsync,
    isUpdatingBranding: updateBrandingMutation.isPending,
    isUpdatingDomain: updateDomainMutation.isPending,
  };
}
