import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { organizations } from "@apex-ia/database/schema/public";
import { WebChatService } from "../services/channels/WebChatService.js";
import { db } from "../db/drizzle.js";
import type { ChannelLookupService } from "../services/ChannelLookupService.js";
import type { SocketIOInstance } from "../socket/socketServer.js";
import { emitNewMessage } from "../socket/socketServer.js";
import { logger } from "../utils/logger.js";

const incomingMessageSchema = z.object({
  sessionId: z.string().min(1).max(256),
  orgSlug: z.string().min(1).max(64),
  content: z.string().min(1).max(4096),
  mediaUrl: z.string().url().optional(),
});

export function createWebChatRoutes(
  channelLookup: ChannelLookupService,
  io: SocketIOInstance
) {
  const webchatRoutes = new Hono();

  webchatRoutes.post(
    "/messages",
    zValidator("json", incomingMessageSchema),
    async (c) => {
      const { sessionId, orgSlug, content, mediaUrl } = c.req.valid("json");

      const org = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, orgSlug))
        .limit(1);

      if (!org[0]) {
        logger.warn({ orgSlug }, "Organization not found");
        return c.json({ success: false, error: "Organization not found" }, 404);
      }

      const { inboxService } = await channelLookup.createServicesForTenant(org[0].id);
      const webchatService = new WebChatService(inboxService);

      try {
        await webchatService.handleIncomingWebChatMessage(sessionId, { content, mediaUrl });
        emitNewMessage(io, sessionId, orgSlug, { sessionId, content });
      } catch (err) {
        logger.error({ err, sessionId, orgSlug }, "Error handling WebChat message");
        return c.json({ success: false, error: "Failed to process message" }, 500);
      }

      return c.json({ success: true }, 200);
    }
  );

  webchatRoutes.get("/embed/:orgSlug", (c) => {
    const { orgSlug } = c.req.param();
    const apiUrl = process.env["API_URL"] ?? "http://localhost:3001";
    const webchatService = new WebChatService({} as never);
    const script = webchatService.getEmbedScript(orgSlug, apiUrl);
    return c.text(script, 200, { "Content-Type": "text/javascript" });
  });

  return webchatRoutes;
}
