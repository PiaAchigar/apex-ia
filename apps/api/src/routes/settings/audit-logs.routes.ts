import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { AuditTrailService } from "../../services/AuditTrailService.js";
import { logger } from "../../utils/logger.js";

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

type ListInput = z.infer<typeof listSchema>;

export function createAuditLogsRoutes() {
  const router = new Hono();
  const auditTrailService = new AuditTrailService();

  router.use("*", authMiddleware);

  // GET / — List audit logs
  router.get("/", zValidator("query", listSchema), async (c) => {
    const auth = c.get("auth");
    const { organizationId } = auth;
    const query = c.req.valid("query") as ListInput;

    try {
      const logs = await auditTrailService.listAuditLogs(organizationId, {
        limit: query.limit,
        offset: query.offset,
      });
      return c.json({ success: true, data: logs });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, organizationId }, "Error listing audit logs");
      return c.json(
        {
          success: false,
          error: { code: "AUDIT_LOG_LIST_FAILED", message: errorMessage },
        },
        500
      );
    }
  });

  return router;
}
