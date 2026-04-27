import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { billingService } from "../services/BillingService.js";
import { logger } from "../utils/logger.js";

const subscribeSchema = z.object({
  planId: z.enum(["growth", "business"]),
  billingPeriod: z.enum(["monthly", "annual"]),
});

type SubscribeInput = z.infer<typeof subscribeSchema>;

export function createBillingRoutes() {
  const router = new Hono();

  router.use("*", authMiddleware);

  // GET /billing/status
  router.get("/status", async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;

    try {
      const status = await billingService.getBillingStatus(organizationId);
      return c.json({ success: true, data: status });
    } catch (error) {
      logger.error({ error, organizationId }, "Error fetching billing status");
      return c.json(
        { success: false, error: { code: "BILLING_ERROR", message: "Error fetching billing status" } },
        500
      );
    }
  });

  // POST /billing/subscribe
  router.post("/subscribe", zValidator("json", subscribeSchema), async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const body = c.req.valid("json") as SubscribeInput;

    // Get slug from request context or from DB lookup
    const slug = (c.req.query("slug") as string) || organizationId.substring(0, 8);

    try {
      const { checkoutUrl } = await billingService.createPreapprovalSubscription(
        organizationId,
        body.planId,
        body.billingPeriod,
        slug
      );

      return c.json({ success: true, data: { checkoutUrl } });
    } catch (error) {
      logger.error({ error, organizationId, planId: body.planId }, "Error creating subscription");
      return c.json(
        {
          success: false,
          error: { code: "SUBSCRIPTION_ERROR", message: "Error creating subscription" },
        },
        500
      );
    }
  });

  // DELETE /billing/subscription
  router.delete("/subscription", async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;

    try {
      await billingService.cancelSubscription(organizationId);
      return c.json({ success: true, data: { message: "Subscription cancelled" } });
    } catch (error) {
      logger.error({ error, organizationId }, "Error cancelling subscription");
      return c.json(
        {
          success: false,
          error: { code: "CANCEL_ERROR", message: "Error cancelling subscription" },
        },
        500
      );
    }
  });

  return router;
}
