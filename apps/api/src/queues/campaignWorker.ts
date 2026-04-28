import { Worker } from "bullmq";
import { eq, and } from "drizzle-orm";
import { campaigns, campaignRecipients, contacts } from "@apex-ia/database/schema/tenant";
import { databaseProvider } from "../db/database-provider.js";
import { ChannelDispatcherService } from "../services/ChannelDispatcherService.js";
import { logger } from "../utils/logger.js";
import type { CampaignJobData } from "./campaignQueue.js";

const BATCH_SIZE = 50;

export function startCampaignWorker(): Worker<CampaignJobData> {
  const redisUrl = process.env["REDIS_URL"] ?? "redis://localhost:6379";

  const worker = new Worker<CampaignJobData>("campaign-sends", processCampaignJob, {
    connection: { url: redisUrl },
    concurrency: 5,
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, campaignId: job.data.campaignId }, "Campaign job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, campaignId: job?.data.campaignId, error: err.message },
      "Campaign job failed"
    );
  });

  return worker;
}

async function processCampaignJob(job: { data: CampaignJobData }): Promise<void> {
  const { campaignId, organizationId } = job.data;

  try {
    logger.info({ campaignId, organizationId }, "Processing campaign batch");

    const tenantDb = await databaseProvider.getClientDrizzle(organizationId);

    if (!tenantDb) {
      throw new Error(`Failed to resolve tenant database for organization: ${organizationId}`);
    }

    // Fetch campaign
    const [campaign] = await tenantDb
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    if (!campaign) {
      logger.error({ campaignId }, "Campaign not found");
      throw new Error("CAMPAIGN_NOT_FOUND");
    }

    if (campaign.status !== "running" && campaign.status !== "scheduled") {
      logger.info({ campaignId, status: campaign.status }, "Campaign not in runnable state, skipping");
      return;
    }

    // Mark as running
    if (campaign.status === "scheduled") {
      await tenantDb.update(campaigns).set({ status: "running" }).where(eq(campaigns.id, campaignId));
    }

    // Fetch pending recipients in batches
    let offset = 0;
    let totalProcessed = 0;
    let successCount = 0;
    let failureCount = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const recipientBatch = await tenantDb
        .select({
          id: campaignRecipients.id,
          contactId: campaignRecipients.contactId,
          status: campaignRecipients.status,
        })
        .from(campaignRecipients)
        .where(
          and(
            eq(campaignRecipients.campaignId, campaignId),
            eq(campaignRecipients.status, "pending")
          )
        )
        .limit(BATCH_SIZE)
        .offset(offset);

      if (recipientBatch.length === 0) break;

      offset += BATCH_SIZE;

      for (const recipient of recipientBatch) {
        try {
          // Fetch contact to get channel info
          const [contact] = await tenantDb
            .select()
            .from(contacts)
            .where(eq(contacts.id, recipient.contactId))
            .limit(1);

          if (!contact) {
            logger.warn({ contactId: recipient.contactId }, "Contact not found for campaign recipient");
            await tenantDb
              .update(campaignRecipients)
              .set({ status: "failed", failedAt: new Date(), errorMessage: "Contact not found" })
              .where(eq(campaignRecipients.id, recipient.id));
            failureCount++;
            continue;
          }

          // Dispatch message via ChannelDispatcherService
          // Note: ChannelDispatcherService requires tenantDb and io
          // For background jobs, we create minimal instance
          const dispatcher = new ChannelDispatcherService(tenantDb, {} as never);

          await dispatcher.dispatch(campaign.channel as never, recipient.contactId, campaign.messageContent);

          // Mark as sent
          await tenantDb
            .update(campaignRecipients)
            .set({ status: "sent", sentAt: new Date() })
            .where(eq(campaignRecipients.id, recipient.id));

          successCount++;
        } catch (err) {
          logger.error(
            { recipientId: recipient.id, error: err instanceof Error ? err.message : "Unknown error" },
            "Failed to send campaign message"
          );

          await tenantDb
            .update(campaignRecipients)
            .set({
              status: "failed",
              failedAt: new Date(),
              errorMessage: err instanceof Error ? err.message : "Unknown error",
            })
            .where(eq(campaignRecipients.id, recipient.id));

          failureCount++;
        }
      }

      totalProcessed += recipientBatch.length;
    }

    // Update campaign counts and mark as completed
    await tenantDb
      .update(campaigns)
      .set({
        status: "completed",
        sentCount: successCount,
        failedCount: failureCount,
        completedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));

    logger.info(
      { campaignId, totalProcessed, successCount, failureCount },
      "Campaign batch processing completed"
    );
  } catch (err) {
    logger.error(
      { campaignId, error: err instanceof Error ? err.message : "Unknown error" },
      "Campaign job processing failed"
    );

    throw err;
  }
}
