import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { ConversationService } from "../services/ConversationService.js";
import { ChannelDispatcherService } from "../services/ChannelDispatcherService.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";
import { emitNewMessage } from "../socket/socketServer.js";
import { logger } from "../utils/logger.js";
import type { SocketIOInstance } from "../socket/socketServer.js";

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export function createConversationRoutes(io: SocketIOInstance) {
  const conversationRoutes = new Hono();

  conversationRoutes.use("*", authMiddleware);
  conversationRoutes.use("*", tenantMiddleware);

  conversationRoutes.get(
    "/:conversationId/messages",
    zValidator("query", paginationSchema),
    async (c) => {
      const { conversationId } = c.req.param();
      const pagination = c.req.valid("query");
      const tenantDb = c.get("tenantDb");

      const conversationService = new ConversationService(tenantDb);
      const messages = await conversationService.getMessagesForConversation(
        conversationId,
        pagination
      );

      return c.json({ success: true, data: messages });
    }
  );

  conversationRoutes.post(
    "/:conversationId/messages",
    zValidator("json", z.object({ content: z.string().min(1).max(4096) })),
    async (c) => {
      const { conversationId } = c.req.param();
      const { content } = c.req.valid("json");
      const auth = c.get("auth");
      const tenantDb = c.get("tenantDb");
      const orgSlug = c.get("orgSlug");

      const conversationService = new ConversationService(tenantDb);
      const result = await conversationService.sendOutgoingMessageToChannel(
        conversationId,
        content,
        auth.userId
      );

      const { message, channel, contactId } = result;

      // Dispatch message to external channel API
      try {
        const dispatcher = new ChannelDispatcherService(tenantDb, io);
        await dispatcher.dispatch(channel, contactId, content);
      } catch (err) {
        logger.error(
          { err, conversationId, channel, contactId },
          "Failed to dispatch message to external channel"
        );
        // Don't block Socket.IO emit or response if dispatch fails
      }

      // Emit real-time update to connected clients
      emitNewMessage(io, conversationId, orgSlug, message);

      return c.json({ success: true, data: message }, 201);
    }
  );

  conversationRoutes.patch(
    "/:conversationId/read",
    async (c) => {
      const { conversationId } = c.req.param();
      const auth = c.get("auth");
      const tenantDb = c.get("tenantDb");

      const conversationService = new ConversationService(tenantDb);
      await conversationService.markMessagesAsRead(conversationId, auth.userId);

      return c.json({ success: true, data: { conversationId } });
    }
  );

  conversationRoutes.get("/:conversationId", async (c) => {
    const { conversationId } = c.req.param();
    const tenantDb = c.get("tenantDb");

    const conversationService = new ConversationService(tenantDb);
    const conversation = await conversationService.getConversationWithContact(conversationId);

    if (!conversation) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Conversación no encontrada" } },
        404
      );
    }

    return c.json({ success: true, data: conversation });
  });

  return conversationRoutes;
}
