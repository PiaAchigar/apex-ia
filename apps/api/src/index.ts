import "dotenv/config";
import { initSentry } from "./utils/sentry.js";
initSentry();
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { requestLoggerMiddleware } from "./middleware/requestLoggerMiddleware.js";
import { errorHandlerMiddleware } from "./middleware/errorHandlerMiddleware.js";
import { corsMiddleware } from "./middleware/corsMiddleware.js";
import { securityHeadersMiddleware } from "./middleware/securityHeadersMiddleware.js";
import { publicRateLimitMiddleware } from "./middleware/rateLimitMiddleware.js";
import { checkSetupStatusMiddleware } from "./middleware/checkSetupStatusMiddleware.js";
import { authRoutes } from "./routes/auth.routes.js";
import { createSetupRoutes } from "./routes/setup.routes.js";
import { createInboxRoutes } from "./routes/inbox.routes.js";
import { createConversationRoutes } from "./routes/conversations.routes.js";
import { createWhatsAppCloudWebhookRoutes } from "./routes/webhooks/whatsapp-cloud-webhook.routes.js";
import { createInstagramWebhookRoutes } from "./routes/webhooks/instagram-webhook.routes.js";
import { createFacebookMessengerWebhookRoutes } from "./routes/webhooks/facebook-messenger-webhook.routes.js";
import { createTelegramWebhookRoutes } from "./routes/webhooks/telegram-webhook.routes.js";
import { createMercadoPagoWebhookRoutes } from "./routes/webhooks/mercadopago.routes.js";
import { createEmailWebhookRoutes } from "./routes/webhooks/email-webhook.routes.js";
import { createTikTokWebhookRoutes } from "./routes/webhooks/tiktok-webhook.routes.js";
import { createWebChatRoutes } from "./routes/webchat.routes.js";
import { createContactsRoutes } from "./routes/contacts.routes.js";
import { createPipelineRoutes } from "./routes/pipeline.routes.js";
import { createTasksRoutes } from "./routes/tasks.routes.js";
import { createFlowBuilderRoutes } from "./routes/flow-builder.routes.js";
import { createCampaignsRoutes } from "./routes/campaigns.routes.js";
import { createBillingRoutes } from "./routes/billing.routes.js";
import { createChannelsRoutes } from "./routes/channels.routes.js";
import { createCustomFieldsRoutes } from "./routes/custom-fields.routes.js";
import { createAutomationsRoutes } from "./routes/automations.routes.js";
import { createCalendarRoutes } from "./routes/calendar.routes.js";
import { createCallLogsRoutes } from "./routes/call-logs.routes.js";
import { createAnalyticsRoutes } from "./routes/analytics.routes.js";
import { createAiCredentialsRoutes } from "./routes/ai-credentials.routes.js";
import { createTeamRoutes } from "./routes/settings/team.routes.js";
import { createApiKeyRoutes } from "./routes/settings/api-keys.routes.js";
import { createPagesRoutes, createPublicPagesRoutes } from "./routes/settings/pages.routes.js";
import { createCustomCodeRoutes } from "./routes/settings/custom-code.routes.js";
import { createAuditLogsRoutes } from "./routes/settings/audit-logs.routes.js";
import { createBackupRoutes } from "./routes/settings/backup.routes.js";
import { createSocketServer } from "./socket/socketServer.js";
import { ChannelLookupService } from "./services/ChannelLookupService.js";
import { scheduleSetupReminderCron } from "./jobs/setup-reminder.job.js";
import { schedulePlanDowngradeCron } from "./jobs/plan-downgrade.job.js";
import { startCampaignWorker } from "./queues/campaignWorker.js";
import { logger } from "./utils/logger.js";
import { db } from "./db/drizzle.js";
import { Redis } from "@upstash/redis";

const app = new Hono();

app.use(corsMiddleware);
app.use("*", securityHeadersMiddleware);
app.use("*", requestLoggerMiddleware);
app.use("*", publicRateLimitMiddleware);

app.onError(errorHandlerMiddleware);

app.get("/health", async (c) => {
  const checks: Record<string, string> = {};
  let isHealthy = true;

  // Check database
  try {
    await db.execute("SELECT 1");
    checks.database = "ok";
  } catch (error) {
    checks.database = "error";
    isHealthy = false;
    logger.error({ error }, "Database health check failed");
  }

  // Check Redis
  try {
    const redis = new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN,
    });
    await redis.ping();
    checks.redis = "ok";
  } catch (error) {
    checks.redis = "error";
    isHealthy = false;
    logger.warn({ error }, "Redis health check failed");
  }

  const status = isHealthy ? "ok" : "degraded";

  return c.json(
    {
      status,
      checks,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    },
    isHealthy ? 200 : 503
  );
});

// Auth: no setup check needed
app.route("/auth", authRoutes);

// Setup: no setup check needed (this IS the setup flow)
app.route("/setup", createSetupRoutes());

// All protected routes run checkSetupStatusMiddleware
// (individual routes also apply authMiddleware + tenantMiddleware internally)
app.use("/inbox/*", checkSetupStatusMiddleware);
app.use("/conversations/*", checkSetupStatusMiddleware);
app.use("/contacts/*", checkSetupStatusMiddleware);
app.use("/pipeline/*", checkSetupStatusMiddleware);
app.use("/tasks/*", checkSetupStatusMiddleware);
app.use("/flows/*", checkSetupStatusMiddleware);
app.use("/campaigns/*", checkSetupStatusMiddleware);
app.use("/calendar/*", checkSetupStatusMiddleware);
app.use("/call-logs/*", checkSetupStatusMiddleware);
app.use("/analytics/*", checkSetupStatusMiddleware);
app.use("/settings/*", checkSetupStatusMiddleware);
app.use("/billing/*", checkSetupStatusMiddleware);

const port = parseInt(process.env["PORT"] ?? "3001");

const server = serve({ fetch: app.fetch, port }, () => {
  logger.info({ port }, `Apex IA API running on port ${port}`);
});

const io = createSocketServer(server as never);
const channelLookup = new ChannelLookupService();

scheduleSetupReminderCron().catch((err) =>
  logger.error(err, "Failed to start setup reminder cron")
);

try {
  schedulePlanDowngradeCron();
  logger.info("Plan downgrade cron job scheduled");
} catch (err) {
  logger.error(err, "Failed to start plan downgrade cron");
}

if (process.env["REDIS_URL"]) {
  try {
    startCampaignWorker();
    logger.info("Campaign BullMQ worker started");
  } catch (err) {
    logger.error(err, "Failed to start campaign worker");
  }
}

app.route("/inbox", createInboxRoutes(io));
app.route("/conversations", createConversationRoutes(io));
app.route("/webhooks/whatsapp", createWhatsAppCloudWebhookRoutes(channelLookup, io));
app.route("/webhooks/instagram", createInstagramWebhookRoutes(channelLookup, io));
app.route("/webhooks/facebook", createFacebookMessengerWebhookRoutes(channelLookup, io));
app.route("/webhooks/telegram", createTelegramWebhookRoutes(channelLookup, io));
app.route("/webhooks/mercadopago", createMercadoPagoWebhookRoutes());
app.route("/webhooks/email", createEmailWebhookRoutes(channelLookup, io));
app.route("/webhooks/tiktok", createTikTokWebhookRoutes(channelLookup, io));
app.route("/webchat", createWebChatRoutes(channelLookup, io));
app.route("/contacts", createContactsRoutes());
app.route("/pipeline", createPipelineRoutes());
app.route("/tasks", createTasksRoutes());
app.route("/flows", createFlowBuilderRoutes());
app.route("/campaigns", createCampaignsRoutes());
app.route("/calendar", createCalendarRoutes());
app.route("/call-logs", createCallLogsRoutes());
app.route("/analytics", createAnalyticsRoutes());
app.route("/settings/ai-credentials", createAiCredentialsRoutes());
app.route("/billing", createBillingRoutes());
app.route("/settings/channels", createChannelsRoutes(io));
app.route("/settings/custom-fields", createCustomFieldsRoutes());
app.route("/settings/automations", createAutomationsRoutes());
app.route("/settings/team", createTeamRoutes());
app.route("/settings/api-keys", createApiKeyRoutes());
app.route("/settings/pages", createPagesRoutes());
app.route("/settings/custom-code", createCustomCodeRoutes());
app.route("/settings/audit-logs", createAuditLogsRoutes());
app.route("/settings/backups", createBackupRoutes());
app.route("/pages/public", createPublicPagesRoutes());

export { io };
export default app;
