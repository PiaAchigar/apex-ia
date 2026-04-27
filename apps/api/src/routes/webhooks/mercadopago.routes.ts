import { Hono } from "hono";
import { createHmac } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/drizzle.js";
import { organizations, subscriptions, paymentHistory } from "@apex-ia/database/schema/public";
import { logger } from "../../utils/logger.js";

export function createMercadoPagoWebhookRoutes() {
  const webhookRoutes = new Hono();

  webhookRoutes.post("/", async (c) => {
    const rawBody = await c.req.text();
    const signature = c.req.header("x-signature") ?? "";
    const requestId = c.req.header("x-request-id") ?? "";
    const mpWebhookSecret = process.env["MP_WEBHOOK_SECRET"];

    let notification: {
      type?: string;
      action?: string;
      status?: string;
      data?: { id: string | number };
    };
    try {
      const body = JSON.parse(rawBody);
      notification = body as {
        type?: string;
        action?: string;
        status?: string;
        data?: { id: string | number };
      };
    } catch (err) {
      logger.warn("Mercado Pago webhook: invalid JSON");
      return c.json({ status: "ok" }, 200);
    }

    // Verify signature if secret is configured
    if (mpWebhookSecret && signature) {
      const ts = extractTimestampFromSignature(signature);
      const v1 = extractV1FromSignature(signature);

      if (!ts || !v1) {
        logger.warn("Mercado Pago webhook: invalid signature format");
        return c.json({ status: "ok" }, 200);
      }

      const dataId = String(notification.data?.id ?? "");
      const message = `id:${dataId};request-id:${requestId};ts:${ts}`;
      const expectedHmac = createHmac("sha256", mpWebhookSecret)
        .update(message)
        .digest("hex");

      if (expectedHmac !== v1) {
        logger.warn("Mercado Pago webhook: invalid signature");
        return c.json({ status: "ok" }, 200);
      }
    }

    // Handle subscription_preapproval events
    if (notification.type === "subscription_preapproval") {
      return handlePreapprovalEvent(notification);
    }

    // Only process payment notifications
    if (notification.type !== "payment") {
      return c.json({ status: "ok" }, 200);
    }

    if (!notification.action?.includes("payment.created")) {
      return c.json({ status: "ok" }, 200);
    }

    const paymentId = notification.data?.id;
    if (!paymentId) {
      return c.json({ status: "ok" }, 200);
    }

    // Fetch payment details from Mercado Pago API
    const mpAccessToken = process.env["MP_ACCESS_TOKEN"];
    if (!mpAccessToken) {
      logger.warn("MP_ACCESS_TOKEN not configured");
      return c.json({ status: "ok" }, 200);
    }

    try {
      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${mpAccessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!paymentResponse.ok) {
        logger.warn({ paymentId, status: paymentResponse.status }, "Failed to fetch payment from MP API");
        return c.json({ status: "ok" }, 200);
      }

      const payment = (await paymentResponse.json()) as {
        id: number;
        status: string;
        status_detail?: string;
        external_reference?: string;
        transaction_amount?: number;
        currency_id?: string;
        date_approved?: string;
        payer?: { id?: number; email?: string };
        metadata?: { plan?: "growth" | "business"; billingPeriod?: "monthly" | "annual" };
      };

      // Only process approved payments
      if (payment.status !== "approved") {
        logger.info({ paymentId, status: payment.status }, "Mercado Pago payment not approved");
        return c.json({ status: "ok" }, 200);
      }

      const externalReference = payment.external_reference;
      if (!externalReference) {
        logger.warn({ paymentId }, "Payment missing external_reference");
        return c.json({ status: "ok" }, 200);
      }

      // Determine plan from metadata or amount
      let plan: "growth" | "business" = "growth";
      if (payment.metadata?.plan) {
        plan = payment.metadata.plan;
      } else if (payment.transaction_amount) {
        // Default: < $100 → growth, >= $100 → business
        plan = payment.transaction_amount >= 10000 ? "business" : "growth";
      }

      const paidAt = payment.date_approved ? new Date(payment.date_approved) : new Date();
      const amount = Math.round((payment.transaction_amount || 0) * 100);
      const currency = payment.currency_id || "USD";
      const billingPeriod = payment.metadata?.billingPeriod || "monthly";
      const periodEnd = new Date(
        paidAt.getTime() +
          (billingPeriod === "annual" ? 365 : 30) * 24 * 60 * 60 * 1000
      );

      // Update within transaction
      await db.transaction(async (tx) => {
        // Update organization plan and paid_at
        await tx
          .update(organizations)
          .set({
            paidAt,
            plan,
          })
          .where(eq(organizations.id, externalReference));

        // Upsert subscription
        const existingSubscription = await tx
          .select({ id: subscriptions.id })
          .from(subscriptions)
          .where(eq(subscriptions.organizationId, externalReference))
          .limit(1);

        if (existingSubscription.length > 0) {
          await tx
            .update(subscriptions)
            .set({
              status: "active",
              plan,
              billingPeriod,
              amount,
              currency,
              mpCustomerId: String(payment.payer?.id || ""),
              periodStart: paidAt,
              periodEnd,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, existingSubscription[0].id));
        } else {
          await tx.insert(subscriptions).values({
            organizationId: externalReference,
            status: "active",
            plan,
            billingPeriod,
            amount,
            currency,
            mpCustomerId: String(payment.payer?.id || ""),
            periodStart: paidAt,
            periodEnd,
          });
        }

        // Insert payment history
        await tx.insert(paymentHistory).values({
          organizationId: externalReference,
          amount,
          currency,
          status: "paid",
          providerPaymentId: String(payment.id),
          description: `Mercado Pago payment - plan ${plan}`,
          paidAt,
        });
      });

      logger.info(
        { paymentId, organizationId: externalReference, plan },
        "Mercado Pago payment processed successfully"
      );
    } catch (err) {
      logger.error({ err, paymentId }, "Error processing Mercado Pago webhook");
    }

    return c.json({ status: "ok" }, 200);
  });

  return webhookRoutes;
}

async function handlePreapprovalEvent(notification: {
  status?: string;
  data?: { id: string | number };
}) {
  const preapprovalId = notification.data?.id;
  if (!preapprovalId || notification.status !== "authorized") {
    return { status: "ok" };
  }

  // Fetch preapproval details from MP API
  const mpAccessToken = process.env["MP_ACCESS_TOKEN"];
  if (!mpAccessToken) {
    logger.warn("MP_ACCESS_TOKEN not configured");
    return { status: "ok" };
  }

  try {
    const response = await fetch(
      `https://api.mercadopago.com/preapproval/${preapprovalId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
        },
      }
    );

    if (!response.ok) {
      logger.warn({ preapprovalId }, "Failed to fetch preapproval from MP API");
      return { status: "ok" };
    }

    const preapproval = (await response.json()) as {
      id: string;
      status: string;
      external_reference?: string;
      metadata?: { plan?: "growth" | "business"; billingPeriod?: "monthly" | "annual" };
    };

    if (preapproval.status !== "authorized" || !preapproval.external_reference) {
      return { status: "ok" };
    }

    const organizationId = preapproval.external_reference;
    const plan = preapproval.metadata?.plan || "growth";
    const billingPeriod = preapproval.metadata?.billingPeriod || "monthly";

    // Update subscription status
    await db
      .update(subscriptions)
      .set({
        status: "active",
        plan,
        billingPeriod,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.organizationId, organizationId));

    // Update organization plan
    await db
      .update(organizations)
      .set({ plan, paidAt: new Date() })
      .where(eq(organizations.id, organizationId));

    logger.info(
      { preapprovalId, organizationId, plan },
      "Mercado Pago preapproval authorized"
    );
  } catch (err) {
    logger.error({ err, preapprovalId }, "Error processing preapproval event");
  }

  return { status: "ok" };
}

function extractTimestampFromSignature(signature: string): string | null {
  const match = signature.match(/ts=(\d+)/);
  return match ? match[1] : null;
}

function extractV1FromSignature(signature: string): string | null {
  const match = signature.match(/v1=([a-f0-9]+)/);
  return match ? match[1] : null;
}
