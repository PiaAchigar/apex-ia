import { Queue } from "bullmq";

export type CampaignJobData = {
  campaignId: string;
  orgSlug: string;
};

export type CampaignQueue = Pick<Queue<CampaignJobData>, "add">;

let _campaignQueue: Queue<CampaignJobData> | null = null;

export function getCampaignQueue(): Queue<CampaignJobData> {
  if (!_campaignQueue) {
    const redisUrl = process.env["REDIS_URL"] ?? "redis://localhost:6379";
    _campaignQueue = new Queue<CampaignJobData>("campaign-sends", {
      connection: { url: redisUrl },
    });
  }
  return _campaignQueue;
}
