import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { EmailService } from "../../services/channels/EmailService.js";
import { databaseProvider } from "../../db/database-provider.js";
import { ChannelLookupService } from "../../services/ChannelLookupService.js";
import type { SocketIOInstance } from "../../socket/socketServer.js";

const incomingEmailSchema = z.object({
  from: z.string().email(),
  to: z.string().email(),
  subject: z.string(),
  html: z.string().optional(),
  text: z.string().optional(),
});

export function createEmailWebhookRoutes(
  _channelLookup: ChannelLookupService,
  _io: SocketIOInstance
) {
  const routes = new Hono();

  // POST /webhooks/email
  routes.post(
    "/",
    zValidator("json", incomingEmailSchema),
    async (c) => {
      try {
        const rawEmail = c.req.valid("json");

        // TODO: Resolve organizationId from 'to' email address
        // For now, we'll skip this and log a warning
        logger.warn("Email webhook received but organizationId resolution not yet implemented");

        // Example implementation (requires mapping email addresses to organizationIds):
        // const organizationId = await channelLookup.resolveOrganizationIdFromEmail(rawEmail.to);
        // if (!organizationId) {
        //   return c.json({ success: false, error: "Organization not found" }, 404);
        // }

        // const tenantDb = await databaseProvider.getClientDrizzle(organizationId);
        // const service = new EmailService(tenantDb);
        // const result = await service.handleIncomingEmail(rawEmail);

        // return c.json({ success: !!result, data: result }, result ? 200 : 400);

        return c.json({ success: true, message: "Email received" }, 200);
      } catch (error) {
        logger.error({ error }, "Error handling email webhook");
        return c.json(
          { success: false, error: "Internal server error" },
          500
        );
      }
    }
  );

  return routes;
}
