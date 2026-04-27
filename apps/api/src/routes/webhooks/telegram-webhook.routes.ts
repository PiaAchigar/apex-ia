import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { TelegramService } from "../../services/channels/TelegramService.js";
import type { ChannelLookupService } from "../../services/ChannelLookupService.js";
import { channelCredentials } from "@apex-ia/database/schema/tenant";
import { emitNewMessage } from "../../socket/socketServer.js";
import type { SocketIOInstance } from "../../socket/socketServer.js";
import { logger } from "../../utils/logger.js";
import { decryptCredentials } from "../../utils/encryption.js";

export function createTelegramWebhookRoutes(
  channelLookup: ChannelLookupService,
  io: SocketIOInstance
) {
  const webhookRoutes = new Hono();

  webhookRoutes.post("/", async (c) => {
    const secretToken = c.req.header("x-telegram-bot-api-secret-token");
    const expectedToken = process.env["TELEGRAM_WEBHOOK_SECRET"];

    if (expectedToken && secretToken !== expectedToken) {
      logger.warn("Telegram webhook: invalid secret token");
      return c.json({ error: "Forbidden" }, 403);
    }

    const body = await c.req.json();
    const botTokenHash = c.req.header("x-apex-bot-id") ?? "default";

    const tenant = await channelLookup.findTenantByChannelIdentifier("telegram", botTokenHash);
    if (!tenant) {
      logger.warn({ botTokenHash }, "No tenant for Telegram bot");
      return c.json({ status: "ok" }, 200);
    }

    const { inboxService, tenantDb } = await channelLookup.createServicesForTenant(
      tenant.organizationId
    );
    const telegramService = new TelegramService(inboxService);

    // Query botToken from channel_credentials
    const credRows = await tenantDb
      .select()
      .from(channelCredentials)
      .where(eq(channelCredentials.channelType, "telegram"))
      .limit(1);

    if (credRows[0]) {
      try {
        const decrypted = decryptCredentials(credRows[0].encryptedCredentials);
        const credentials = JSON.parse(decrypted) as { botToken?: string };
        if (credentials.botToken) {
          await telegramService.initializeTelegramBot(credentials.botToken);
        }
      } catch (err) {
        logger.warn({ err }, "Failed to decrypt or parse Telegram credentials");
      }
    } else {
      logger.warn("No active Telegram credentials found in database");
    }

    const result = await telegramService.handleIncomingTelegramUpdate(body);

    // Emit Socket.IO message if result exists
    if (result) {
      emitNewMessage(io, result.conversationId, tenant.organizationSlug, result.message);
    }

    return c.json({ status: "ok" }, 200);
  });

  return webhookRoutes;
}
