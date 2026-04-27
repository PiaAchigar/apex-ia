import { Hono } from "hono";
import { InstagramService } from "../../services/channels/InstagramService.js";
import type { ChannelLookupService } from "../../services/ChannelLookupService.js";
import type { SocketIOInstance } from "../../socket/socketServer.js";
import { emitNewMessage } from "../../socket/socketServer.js";
import { logger } from "../../utils/logger.js";

export function createInstagramWebhookRoutes(
  channelLookup: ChannelLookupService,
  io: SocketIOInstance
) {
  const webhookRoutes = new Hono();

  webhookRoutes.get("/", async (c) => {
    const mode = c.req.query("hub.mode") ?? "";
    const token = c.req.query("hub.verify_token") ?? "";
    const challenge = c.req.query("hub.challenge") ?? "";

    if (mode === "subscribe" && token === process.env["WHATSAPP_VERIFY_TOKEN"]) {
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
        logger.warn("Instagram webhook: invalid signature");
        return c.json({ error: "Forbidden" }, 403);
      }
    }

    const body = JSON.parse(rawBody);
    if (body.object !== "instagram") return c.json({ status: "ok" });

    for (const entry of body.entry ?? []) {
      const pageId = entry.id as string | undefined;
      if (!pageId) continue;

      const tenant = await channelLookup.findTenantByChannelIdentifier("instagram", pageId);
      if (!tenant) { logger.warn({ pageId }, "No tenant for Instagram pageId"); continue; }

      const { inboxService } = await channelLookup.createServicesForTenant(tenant.organizationId);
      const igService = new InstagramService(inboxService);

      try {
        const result = await igService.handleIncomingInstagramWebhook(body);
        if (result) {
          emitNewMessage(io, result.conversationId, tenant.organizationSlug, result.message);
        }
      } catch (err) {
        logger.error({ err, pageId }, "Error processing Instagram webhook");
      }
    }

    return c.json({ status: "ok" }, 200);
  });

  return webhookRoutes;
}
