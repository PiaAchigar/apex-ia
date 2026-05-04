"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSetupStatus } from "@/hooks/useSetupStatus";
import { SetupRequiredModal } from "./SetupRequiredModal";

export function SetupGuard() {
  const { isComplete, isLoading } = useSetupStatus();
  const queryClient = useQueryClient();

  if (isLoading || isComplete) {
    return null;
  }

  return (
    <SetupRequiredModal
      onSetupComplete={() => {
        queryClient.invalidateQueries({ queryKey: ["setup-status"] });
      }}
    />
  );
}
