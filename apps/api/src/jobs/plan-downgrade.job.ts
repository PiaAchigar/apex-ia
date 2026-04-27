import { lt, eq, and } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { organizations, subscriptions } from "@apex-ia/database/schema/public";
import { logger } from "../utils/logger.js";
import { CronJob } from "cron";

export function schedulePlanDowngradeCron(): CronJob {
  const job = new CronJob(
    "5 0 * * *", // Every day at 00:05 UTC
    async () => {
      try {
        logger.info("Running plan downgrade cron job");

        const now = new Date();

        // Find subscriptions where periodEnd has passed and status is still active
        const expiredSubscriptions = await db
          .select({
            id: subscriptions.id,
            organizationId: subscriptions.organizationId,
          })
          .from(subscriptions)
          .where(
            and(
              lt(subscriptions.periodEnd, now),
              eq(subscriptions.status, "active")
            )
          );

        if (expiredSubscriptions.length === 0) {
          logger.info("No expired subscriptions found");
          return;
        }

        // Downgrade each organization to starter plan
        await db.transaction(async (tx) => {
          for (const sub of expiredSubscriptions) {
            // Update subscription status
            await tx
              .update(subscriptions)
              .set({
                status: "past_due",
                updatedAt: new Date(),
              })
              .where(eq(subscriptions.id, sub.id));

            // Downgrade organization plan
            await tx
              .update(organizations)
              .set({ plan: "starter" })
              .where(eq(organizations.id, sub.organizationId));

            logger.info(
              { organizationId: sub.organizationId },
              "Organization downgraded to starter due to subscription expiration"
            );
          }
        });

        logger.info(
          { count: expiredSubscriptions.length },
          "Plan downgrade cron job completed"
        );
      } catch (err) {
        logger.error({ err }, "Error in plan downgrade cron job");
      }
    },
    null,
    true // Start the job immediately
  );

  return job;
}
