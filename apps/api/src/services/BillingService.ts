import { eq } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { organizations, subscriptions, paymentHistory } from "@apex-ia/database/schema/public";
import { PLAN_PRICES, MP_CURRENCY, TRIAL_DAYS } from "../constants/billing.constants.js";
import { logger } from "../utils/logger.js";
import type { PlanType } from "@apex-ia/types";

interface PreapprovalResponse {
  init_point: string;
  id: string;
}

interface BillingStatus {
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

export class BillingService {
  async createPreapprovalSubscription(
    organizationId: string,
    planId: "growth" | "business",
    billingPeriod: "monthly" | "annual",
    slug: string
  ): Promise<{ checkoutUrl: string; mpSubscriptionId: string }> {
    const mpToken = process.env["MP_ACCESS_TOKEN"];
    if (!mpToken) {
      throw new Error("MP_ACCESS_TOKEN not configured");
    }

    const amount = PLAN_PRICES[planId][billingPeriod];
    const frequencyType = billingPeriod === "annual" ? "years" : "months";

    const preapprovalData = {
      reason: `Apex IA — ${planId.charAt(0).toUpperCase() + planId.slice(1)} ${billingPeriod}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: frequencyType,
        transaction_amount: amount,
        currency_id: MP_CURRENCY,
      },
      back_url: `${process.env["NEXT_PUBLIC_APP_URL"]}/${slug}/settings/billing`,
      external_reference: organizationId,
      payer_email: "", // Will be set from user's email during checkout
      metadata: {
        plan: planId,
        billingPeriod,
      },
    };

    try {
      const response = await fetch("https://api.mercadopago.com/preapproval", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mpToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preapprovalData),
      });

      if (!response.ok) {
        const error = await response.json();
        logger.error({ error }, "Failed to create preapproval with MP");
        throw new Error(`MP API error: ${response.status}`);
      }

      const result = (await response.json()) as PreapprovalResponse;

      // Save mpSubscriptionId in subscriptions table
      await db
        .insert(subscriptions)
        .values({
          organizationId,
          plan: planId,
          status: "trialing",
          billingPeriod,
          amount,
          currency: MP_CURRENCY,
          mpSubscriptionId: result.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: subscriptions.organizationId,
          set: {
            mpSubscriptionId: result.id,
            status: "trialing",
            updatedAt: new Date(),
          },
        });

      return {
        checkoutUrl: result.init_point,
        mpSubscriptionId: result.id,
      };
    } catch (error) {
      logger.error({ error, organizationId, planId }, "Error creating preapproval subscription");
      throw error;
    }
  }

  async cancelSubscription(organizationId: string): Promise<void> {
    const mpToken = process.env["MP_ACCESS_TOKEN"];
    if (!mpToken) {
      throw new Error("MP_ACCESS_TOKEN not configured");
    }

    const [sub] = await db
      .select({ mpSubscriptionId: subscriptions.mpSubscriptionId })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .limit(1);

    if (!sub?.mpSubscriptionId) {
      throw new Error("No active subscription found");
    }

    try {
      const response = await fetch(
        `https://api.mercadopago.com/preapproval/${sub.mpSubscriptionId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${mpToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "cancelled" }),
        }
      );

      if (!response.ok) {
        logger.error(
          { status: response.status, mpSubscriptionId: sub.mpSubscriptionId },
          "Failed to cancel preapproval with MP"
        );
        throw new Error(`MP API error: ${response.status}`);
      }

      // Update subscription in DB
      await db
        .update(subscriptions)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(subscriptions.organizationId, organizationId));
    } catch (error) {
      logger.error({ error, organizationId }, "Error cancelling subscription");
      throw error;
    }
  }

  async getBillingStatus(organizationId: string): Promise<BillingStatus> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      throw new Error("Organization not found");
    }

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .limit(1);

    const payments = await db
      .select({
        id: paymentHistory.id,
        amount: paymentHistory.amount,
        status: paymentHistory.status,
        paidAt: paymentHistory.paidAt,
        providerPaymentId: paymentHistory.providerPaymentId,
      })
      .from(paymentHistory)
      .where(eq(paymentHistory.organizationId, organizationId))
      .orderBy(paymentHistory.createdAt)
      .limit(10);

    const now = new Date();
    const trialEndsAt = org.trialEndsAt;
    const daysLeft = trialEndsAt
      ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000)
      : 0;

    return {
      plan: org.plan as PlanType,
      trialStatus: {
        isActive: daysLeft > 0,
        daysLeft: Math.max(0, daysLeft),
        isExpired: !!trialEndsAt && now > trialEndsAt,
        endsAt: trialEndsAt,
      },
      subscription: sub
        ? {
            status: sub.status,
            billingPeriod: sub.billingPeriod,
            periodEnd: sub.periodEnd,
            mpSubscriptionId: sub.mpSubscriptionId,
          }
        : null,
      paymentHistory: payments,
    };
  }
}

export const billingService = new BillingService();
