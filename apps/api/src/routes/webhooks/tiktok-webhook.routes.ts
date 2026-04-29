import { Hono } from "hono";
import { TikTokService } from "../../services/channels/TikTokService.js";
import type { ChannelLookupService } from "../../services/ChannelLookupService.js";
import type { SocketIOInstance } from "../../socket/socketServer.js";
import { emitNewMessage } from "../../socket/socketServer.js";
import { logger } from "../../utils/logger.js";

export function createTikTokWebhookRoutes(
  channelLookup: ChannelLookupService,
  io: SocketIOInstance
) {
  const webhookRoutes = new Hono();

  webhookRoutes.get("/", async (c) => {
    const challenge = c.req.query("hub.challenge") ?? "";
    const verifyToken = c.req.query("hub.verify_token") ?? "";

    const expectedToken = process.env["TIKTOK_VERIFY_TOKEN"];
    if (verifyToken === expectedToken) {
      return c.text(challenge, 200);
    }

    return c.json({ error: "Forbidden" }, 403);
  });

  webhookRoutes.post("/", async (c) => {
    try {
      const body = await c.req.json();

      if (!body.data || !body.data.from_user_id) {
        logger.warn({ body }, "TikTok webhook missing required fields");
        return c.json({ status: "ok" }, 200);
      }

      const externalIdentifier = `tiktok_${body.data.from_user_id}`;
      const tenant = await channelLookup.findTenantByChannelIdentifier(
        "tiktok",
        externalIdentifier
      );

      if (!tenant) {
        logger.warn(
          { externalIdentifier },
          "No tenant found for TikTok channel"
        );
        return c.json({ status: "ok" }, 200);
      }

      const { inboxService } = await channelLookup.createServicesForTenant(
        tenant.organizationId
      );
      const tiktokService = new TikTokService(inboxService);

      const result = await tiktokService.handleIncomingTikTokWebhook(
        body.data
      );

      if (result) {
        emitNewMessage(
          io,
          result.conversationId,
          tenant.organizationSlug,
          result.message
        );
      }

      return c.json({ status: "ok" }, 200);
    } catch (error) {
      logger.error({ error }, "Error processing TikTok webhook");
      return c.json({ status: "ok" }, 200);
    }
  });

  return webhookRoutes;
}
