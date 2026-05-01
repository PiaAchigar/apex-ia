"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useBillingStatus } from "@/hooks/useBillingStatus";
import { usePlanLimits } from "@/hooks/usePlanLimits";

export function PlanLimitBanner() {
  const { data: billingStatus } = useBillingStatus();
  const { data: limits, isLoading: limitsLoading, isError: limitsError } = usePlanLimits();

  // Don't show if loading, error, or if plan is business (no limits)
  if (
    limitsLoading ||
    limitsError ||
    !limits ||
    !billingStatus ||
    billingStatus.plan === "business"
  ) {
    return null;
  }

  // Check if any resource is at 80% or more of its limit
  const resourcesNearLimit = Object.entries(limits).filter(([, resource]) => {
    if (resource.limit === -1) return false; // No limit (Infinity)
    return resource.current >= resource.limit * 0.8;
  });

  if (resourcesNearLimit.length === 0) {
    return null;
  }

  // Get the first resource that's near limit
  const [resourceName, resourceData] = resourcesNearLimit[0];
  const displayName = {
    flows: "flows",
    channels: "canales",
    conversations: "conversaciones",
    team_members: "miembros del equipo",
  }[resourceName as keyof typeof limits];

  const percentage = Math.round((resourceData.current / resourceData.limit) * 100);

  return (
    <div className="bg-amber-900/30 border border-amber-500/50 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-amber-900 font-medium">
            Estás usando el {percentage}% de tu límite de {displayName}
          </p>
          <p className="text-amber-800 text-sm mt-1">
            ({resourceData.current} de {resourceData.limit} disponibles)
          </p>
        </div>
        <Link
          href="./billing"
          className="ml-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-md whitespace-nowrap transition-colors"
        >
          Actualizar plan
        </Link>
      </div>
    </div>
  );
}
