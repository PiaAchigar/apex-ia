import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { InboxService } from "../services/InboxService.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";
import {
  emitConversationAssigned,
  emitConversationResolved,
} from "../socket/socketServer.js";
import type { SocketIOInstance } from "../socket/socketServer.js";

const filtersSchema = z.object({
  tab: z.enum(["all", "unassigned", "mine", "assigned"]).default("all"),
  channel: z.string().optional(),
  status: z.enum(["open", "resolved", "pending"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(30),
});

export function createInboxRoutes(io: SocketIOInstance) {
  const inboxRoutes = new Hono();

  inboxRoutes.use("*", authMiddleware);
  inboxRoutes.use("*", tenantMiddleware);

  inboxRoutes.get(
    "/conversations",
    zValidator("query", filtersSchema),
    async (c) => {
      const filters = c.req.valid("query");
      const auth = c.get("auth");
      const tenantDb = c.get("tenantDb");

      const inboxService = new InboxService(tenantDb);
      const conversations = await inboxService.getConversationsForAgent(
        auth.userId,
        filters
      );

      return c.json({ success: true, data: conversations });
    }
  );

  inboxRoutes.patch(
    "/conversations/:conversationId/assign",
    zValidator("json", z.object({ agentId: z.string().uuid() })),
    async (c) => {
      const { conversationId } = c.req.param();
      const { agentId } = c.req.valid("json");
      const tenantDb = c.get("tenantDb");
      const orgSlug = c.get("orgSlug");

      const inboxService = new InboxService(tenantDb);
      await inboxService.assignConversationToAgent(conversationId, agentId);

      emitConversationAssigned(io, conversationId, orgSlug, agentId);

      return c.json({ success: true, data: { conversationId, agentId } });
    }
  );

  inboxRoutes.patch(
    "/conversations/:conversationId/resolve",
    async (c) => {
      const { conversationId } = c.req.param();
      const tenantDb = c.get("tenantDb");
      const orgSlug = c.get("orgSlug");

      const inboxService = new InboxService(tenantDb);
      await inboxService.markConversationAsResolved(conversationId);

      emitConversationResolved(io, conversationId, orgSlug);

      return c.json({ success: true, data: { conversationId, status: "resolved" } });
    }
  );

  inboxRoutes.patch(
    "/conversations/:conversationId/pending",
    async (c) => {
      const { conversationId } = c.req.param();
      const tenantDb = c.get("tenantDb");

      const inboxService = new InboxService(tenantDb);
      await inboxService.markConversationAsPending(conversationId);

      return c.json({ success: true, data: { conversationId, status: "pending" } });
    }
  );

  return inboxRoutes;
}
