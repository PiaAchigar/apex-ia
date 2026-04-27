import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import type { PlanType } from "@apex-ia/types";

export interface BillingStatus {
  plan: PlanType;
  trialStatus: {
    isActive: boolean;
    daysLeft: number;
    isExpired: boolean;
    endsAt: Date | null;
  };
  subscription: {
    status: string | null;
    billingPeriod: string | null;
    periodEnd: Date | null;
    mpSubscriptionId: string | null;
  } | null;
  paymentHistory: Array<{
    id: string;
    amount: number;
    status: string;
    paidAt: Date | null;
    providerPaymentId: string | null;
  }>;
}

interface UseBillingStatusResult {
  data: BillingStatus | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useBillingStatus(): UseBillingStatusResult {
  const { session } = useAuth();
  const [data, setData] = useState<BillingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBillingStatus = async () => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/status`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch billing status");
      }

      const result = (await response.json()) as { success: boolean; data: BillingStatus };
      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingStatus();
  }, [session?.access_token]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchBillingStatus,
  };
}
