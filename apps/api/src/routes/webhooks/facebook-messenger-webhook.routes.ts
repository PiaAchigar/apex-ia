import { Hono } from "hono";
import { FacebookMessengerService } from "../../services/channels/FacebookMessengerService.js";
import type { ChannelLookupService } from "../../services/ChannelLookupService.js";
import type { SocketIOInstance } from "../../socket/socketServer.js";
import { logger } from "../../utils/logger.js";

export function createFacebookMessengerWebhookRoutes(
  channelLookup: ChannelLookupService,
  _io: SocketIOInstance
) {
  const webhookRoutes = new Hono();

  webhookRoutes.get("/", async (c) => {
    const mode = c.req.query("hub.mode") ?? "";
    const token = c.req.query("hub.verify_token") ?? "";
    const challenge = c.req.query("hub.challenge") ?? "";

    if (mode === "subscribe" && token === process.env["FACEBOOK_VERIFY_TOKEN"]) {
      return c.text(challenge, 200);
    }
    return c.json({ error: "Forbidden" }, 403);
  });

  webhookRoutes.post("/", async (c) => {
    const rawBody = await c.req.text();
    const signature = c.req.header("x-hub-signature-256") ?? "";
    const appSecret = process.env["META_APP_SECRET"];

    if (appSecret) {
      const { createHmac } = await import("crypto");
      const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
      if (expected !== signature) {
        logger.warn("Messenger webhook: invalid signature");
        return c.json({ error: "Forbidden" }, 403);
      }
    }

    const body = JSON.parse(rawBody);
    if (body.object !== "page") return c.json({ status: "ok" });

    for (const entry of body.entry ?? []) {
      const pageId = entry.id as string | undefined;
      if (!pageId) continue;

      const tenant = await channelLookup.findTenantByChannelIdentifier("facebook", pageId);
      if (!tenant) { logger.warn({ pageId }, "No tenant for Messenger pageId"); continue; }

      const { inboxService } = await channelLookup.createServicesForTenant(tenant.organizationId);
      const fbService = new FacebookMessengerService(inboxService);

      try {
        await fbService.handleIncomingMessengerWebhook(body);
      } catch (err) {
        logger.error({ err, pageId }, "Error processing Messenger webhook");
      }
    }

    return c.json({ status: "ok" }, 200);
  });

  return webhookRoutes;
}
