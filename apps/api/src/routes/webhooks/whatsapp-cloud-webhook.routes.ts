import { Hono } from "hono";
import { WhatsAppCloudApiService } from "../../services/channels/WhatsAppCloudApiService.js";
import type { ChannelLookupService } from "../../services/ChannelLookupService.js";
import type { SocketIOInstance } from "../../socket/socketServer.js";
import { emitNewMessage } from "../../socket/socketServer.js";
import { logger } from "../../utils/logger.js";

export function createWhatsAppCloudWebhookRoutes(
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
        logger.warn("WhatsApp webhook: invalid signature");
        return c.json({ error: "Forbidden" }, 403);
      }
    }

    const body = JSON.parse(rawBody);
    if (body.object !== "whatsapp_business_account") return c.json({ status: "ok" });

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;
        const phoneNumberId = change.value?.metadata?.phone_number_id as string | undefined;
        if (!phoneNumberId) continue;

        const tenant = await channelLookup.findTenantByChannelIdentifier("whatsapp", phoneNumberId);
        if (!tenant) {
          logger.warn({ phoneNumberId }, "No tenant found for WhatsApp phoneNumberId");
          continue;
        }

        const { inboxService, conversationService } = await channelLookup.createServicesForTenant(tenant.organizationId);
        const waService = new WhatsAppCloudApiService(inboxService, conversationService);

        try {
          const result = await waService.handleIncomingWhatsAppWebhook(body);
          if (result) {
            emitNewMessage(io, result.conversationId, tenant.organizationSlug, result.message);
          }
        } catch (err) {
          logger.error({ err, phoneNumberId }, "Error processing WhatsApp webhook");
        }
      }
    }

    return c.json({ status: "ok" }, 200);
  });

  return webhookRoutes;
}
