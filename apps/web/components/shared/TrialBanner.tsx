"use client";

import Link from "next/link";
import { useBillingStatus } from "../../hooks/useBillingStatus";
import { AlertCircle, Clock } from "lucide-react";

interface TrialBannerProps {
  slug: string;
}

export function TrialBanner({ slug }: TrialBannerProps) {
  const { data, isLoading } = useBillingStatus();

  if (isLoading || !data) return null;

  const { plan, trialStatus } = data;

  // Only show banner for starter plan (trial or free)
  if (plan !== "starter") return null;

  if (trialStatus.isActive) {
    return (
      <div className="flex items-center gap-3 bg-blue-50 border-l-4 border-blue-500 px-4 py-3 text-sm">
        <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-blue-900">
            Tu prueba gratuita vence en{" "}
            <strong>{trialStatus.daysLeft} {trialStatus.daysLeft === 1 ? "día" : "días"}</strong>.
          </p>
        </div>
        <Link
          href={`/${slug}/settings/billing`}
          className="ml-auto whitespace-nowrap text-blue-600 hover:text-blue-700 font-medium underline"
        >
          Elegir plan →
        </Link>
      </div>
    );
  }

  if (trialStatus.isExpired) {
    return (
      <div className="flex items-center gap-3 bg-amber-50 border-l-4 border-amber-500 px-4 py-3 text-sm">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-amber-900">
            Tu prueba gratuita ha vencido. Estás usando el plan <strong>Starter gratuito</strong>.
          </p>
        </div>
        <Link
          href={`/${slug}/settings/billing`}
          className="ml-auto whitespace-nowrap text-amber-600 hover:text-amber-700 font-medium underline"
        >
          Upgradear →
        </Link>
      </div>
    );
  }

  return null;
}
