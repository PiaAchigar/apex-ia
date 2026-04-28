import { eq } from "drizzle-orm";
import { campaigns } from "@apex-ia/database/schema/tenant";
import type { DrizzleDb } from "../db/drizzle.js";
import type { CampaignQueue } from "../queues/campaignQueue.js";
import { logger } from "../utils/logger.js";

type CreateCampaignInput = {
  name: string;
  channel: string;
  messageContent: string;
};

type UpdateCampaignInput = Partial<{
  name: string;
  channel: string;
  messageContent: string;
}>;

type CampaignStatus = "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled";

export class CampaignService {
  constructor(
    private readonly tenantDb: DrizzleDb,
    private readonly campaignQueue?: CampaignQueue
  ) {}

  async createCampaign(input: CreateCampaignInput) {
    const [created] = await this.tenantDb
      .insert(campaigns)
      .values({
        name: input.name,
        channel: input.channel,
        messageContent: input.messageContent,
        status: "draft",
      })
      .returning();

    if (!created) throw new Error("Failed to create campaign");

    logger.info({ campaignId: created.id }, "Campaign created");
    return created;
  }

  async updateCampaign(id: string, input: UpdateCampaignInput) {
    const existing = await this.tenantDb
      .select({ id: campaigns.id, status: campaigns.status })
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!existing[0]) throw new Error("CAMPAIGN_NOT_FOUND");

    if (existing[0].status !== "draft") {
      throw new Error("CAMPAIGN_NOT_EDITABLE");
    }

    const [updated] = await this.tenantDb
      .update(campaigns)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.channel !== undefined && { channel: input.channel }),
        ...(input.messageContent !== undefined && { messageContent: input.messageContent }),
      })
      .where(eq(campaigns.id, id))
      .returning();

    if (!updated) throw new Error("Failed to update campaign");

    logger.info({ campaignId: id }, "Campaign updated");
    return updated;
  }

  async getCampaigns() {
    return this.tenantDb.select().from(campaigns).orderBy(campaigns.createdAt);
  }

  async getCampaignById(id: string) {
    const [campaign] = await this.tenantDb
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
    return campaign;
  }

  async scheduleCampaign(id: string, organizationId: string, scheduledAt: Date) {
    const existing = await this.tenantDb
      .select({ id: campaigns.id, status: campaigns.status })
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!existing[0]) throw new Error("CAMPAIGN_NOT_FOUND");

    if (existing[0].status !== "draft") {
      throw new Error("CAMPAIGN_NOT_SCHEDULABLE");
    }

    const [updated] = await this.tenantDb
      .update(campaigns)
      .set({ status: "scheduled", scheduledAt })
      .where(eq(campaigns.id, id))
      .returning();

    if (!updated) throw new Error("Failed to schedule campaign");

    if (this.campaignQueue) {
      const delayMs = scheduledAt.getTime() - Date.now();
      await this.campaignQueue.add(
        "process-campaign",
        { campaignId: id, organizationId },
        { delay: delayMs > 0 ? delayMs : 0 }
      );
    }

    logger.info({ campaignId: id, scheduledAt }, "Campaign scheduled");
    return updated;
  }

  async pauseCampaign(id: string) {
    return this.transitionStatus(id, "running", "paused", "CAMPAIGN_NOT_RUNNING");
  }

  async resumeCampaign(id: string) {
    return this.transitionStatus(id, "paused", "running", "CAMPAIGN_NOT_PAUSED");
  }

  async cancelCampaign(id: string) {
    const existing = await this.tenantDb
      .select({ id: campaigns.id, status: campaigns.status })
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!existing[0]) throw new Error("CAMPAIGN_NOT_FOUND");

    const cancellable: CampaignStatus[] = ["draft", "scheduled", "running", "paused"];
    if (!cancellable.includes(existing[0].status as CampaignStatus)) {
      throw new Error("CAMPAIGN_NOT_CANCELLABLE");
    }

    const [updated] = await this.tenantDb
      .update(campaigns)
      .set({ status: "cancelled" })
      .where(eq(campaigns.id, id))
      .returning();

    if (!updated) throw new Error("Failed to cancel campaign");

    logger.info({ campaignId: id }, "Campaign cancelled");
    return updated;
  }

  async getCampaignMetrics(id: string) {
    const campaign = await this.getCampaignById(id);
    const total = campaign.targetCount ?? 0;
    const sent = campaign.sentCount ?? 0;
    const failed = campaign.failedCount ?? 0;
    const pending = total - sent - failed;

    return {
      campaignId: id,
      status: campaign.status,
      targetCount: total,
      sentCount: sent,
      failedCount: failed,
      pendingCount: pending > 0 ? pending : 0,
      deliveryRate: total > 0 ? Math.round((sent / total) * 100) : 0,
    };
  }

  private async transitionStatus(
    id: string,
    from: CampaignStatus,
    to: CampaignStatus,
    errorCode: string
  ) {
    const existing = await this.tenantDb
      .select({ id: campaigns.id, status: campaigns.status })
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!existing[0]) throw new Error("CAMPAIGN_NOT_FOUND");

    if (existing[0].status !== from) {
      throw new Error(errorCode);
    }

    const [updated] = await this.tenantDb
      .update(campaigns)
      .set({ status: to })
      .where(eq(campaigns.id, id))
      .returning();

    if (!updated) throw new Error("Failed to update campaign status");

    logger.info({ campaignId: id, from, to }, "Campaign status transitioned");
    return updated;
  }
}
