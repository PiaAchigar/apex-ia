import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { CallLogsService } from "../services/CallLogsService.js";
import { logger } from "../utils/logger.js";

const createCallLogSchema = z.object({
  contactId: z.string().uuid().optional(),
  duration: z.number().int().optional(),
  transcript: z.string().optional(),
  isSuccess: z.boolean().optional(),
  aiModel: z.string().optional(),
  tokensUsed: z.number().int().optional(),
});

export function createCallLogsRoutes() {
  const routes = new Hono();

  // GET /call-logs?page=&limit=
  routes.get("/", async (c) => {
    try {
      const tenantDb = c.get("tenantDb");
      const page = parseInt(c.req.query("page") || "1");
      const limit = parseInt(c.req.query("limit") || "50");

      const service = new CallLogsService(tenantDb);
      const result = await service.listCallLogs(page, limit);

      return c.json({ success: true, data: result.data, total: result.total }, 200);
    } catch (error) {
      logger.error({ error }, "Error listing call logs");
      return c.json(
        { success: false, error: "Internal server error" },
        500
      );
    }
  });

  // GET /call-logs/:id
  routes.get("/:id", async (c) => {
    try {
      const tenantDb = c.get("tenantDb");
      const id = c.req.param("id");

      const service = new CallLogsService(tenantDb);
      const callLog = await service.getCallLogById(id);

      if (!callLog) {
        return c.json({ success: false, error: "Call log not found" }, 404);
      }

      return c.json({ success: true, data: callLog }, 200);
    } catch (error) {
      logger.error({ error }, "Error getting call log");
      return c.json(
        { success: false, error: "Internal server error" },
        500
      );
    }
  });

  // POST /call-logs
  routes.post(
    "/",
    zValidator("json", createCallLogSchema),
    async (c) => {
      try {
        const tenantDb = c.get("tenantDb");
        const input = c.req.valid("json");

        const service = new CallLogsService(tenantDb);
        const callLog = await service.createCallLog(input);

        return c.json({ success: true, data: callLog }, 201);
      } catch (error) {
        logger.error({ error }, "Error creating call log");
        return c.json(
          { success: false, error: "Internal server error" },
          500
        );
      }
    }
  );

  return routes;
}
