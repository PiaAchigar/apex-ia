"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface BrandingConfig {
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  faviconUrl: string | null;
  appName?: string;
}

export interface UpdateBrandingInput {
  logoUrl?: string | null;
  primaryColor?: string;
  accentColor?: string;
  faviconUrl?: string | null;
  appName?: string;
}

const QUERY_KEY = ["branding"];

const DEFAULT_BRANDING: BrandingConfig = {
  logoUrl: null,
  primaryColor: "#10B981",
  accentColor: "#10B981",
  faviconUrl: null,
  appName: "Apex IA",
};

export function useBranding() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const data = await apiClient.get<BrandingConfig>("/settings/branding");
      return data;
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

  return {
    branding: query.data || DEFAULT_BRANDING,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateBranding: updateBrandingMutation.mutateAsync,
    isUpdatingBranding: updateBrandingMutation.isPending,
  };
}
