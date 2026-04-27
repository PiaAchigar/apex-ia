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
import { createWebChatRoutes } from "./routes/webchat.routes.js";
import { createContactsRoutes } from "./routes/contacts.routes.js";
import { createPipelineRoutes } from "./routes/pipeline.routes.js";
import { createTasksRoutes } from "./routes/tasks.routes.js";
import { createFlowBuilderRoutes } from "./routes/flow-builder.routes.js";
import { createCampaignsRoutes } from "./routes/campaigns.routes.js";
import { createBillingRoutes } from "./routes/billing.routes.js";
import { createSocketServer } from "./socket/socketServer.js";
import { ChannelLookupService } from "./services/ChannelLookupService.js";
import { scheduleSetupReminderCron } from "./jobs/setup-reminder.job.js";
import { schedulePlanDowngradeCron } from "./jobs/plan-downgrade.job.js";
import { logger } from "./utils/logger.js";

const app = new Hono();

app.use(corsMiddleware);
app.use("*", securityHeadersMiddleware);
app.use("*", requestLoggerMiddleware);
app.use("*", publicRateLimitMiddleware);

app.onError(errorHandlerMiddleware);

app.get("/health", (c) =>
  c.json({
    status: "ok",
    checks: { database: "ok", redis: "ok" },
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  })
);

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

app.route("/inbox", createInboxRoutes(io));
app.route("/conversations", createConversationRoutes(io));
app.route("/webhooks/whatsapp", createWhatsAppCloudWebhookRoutes(channelLookup, io));
app.route("/webhooks/instagram", createInstagramWebhookRoutes(channelLookup, io));
app.route("/webhooks/facebook", createFacebookMessengerWebhookRoutes(channelLookup, io));
app.route("/webhooks/telegram", createTelegramWebhookRoutes(channelLookup, io));
app.route("/webhooks/mercadopago", createMercadoPagoWebhookRoutes());
app.route("/webchat", createWebChatRoutes(channelLookup, io));
app.route("/contacts", createContactsRoutes());
app.route("/pipeline", createPipelineRoutes());
app.route("/tasks", createTasksRoutes());
app.route("/flows", createFlowBuilderRoutes());
app.route("/campaigns", createCampaignsRoutes());
app.route("/billing", createBillingRoutes());

export { io };
export default app;
