import { Hono } from "hono";
import { TelegramService } from "../../services/channels/TelegramService.js";
import type { ChannelLookupService } from "../../services/ChannelLookupService.js";
import type { SocketIOInstance } from "../../socket/socketServer.js";
import { logger } from "../../utils/logger.js";

export function createTelegramWebhookRoutes(
  channelLookup: ChannelLookupService,
  _io: SocketIOInstance
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

    const { inboxService } = await channelLookup.createServicesForTenant(tenant.organizationId);
    const telegramService = new TelegramService(inboxService);

    const botToken = process.env["TELEGRAM_BOT_TOKEN"];
    if (botToken) await telegramService.initializeTelegramBot(botToken);

    await telegramService.handleIncomingTelegramUpdate(body);

    return c.json({ status: "ok" }, 200);
  });

  return webhookRoutes;
}
