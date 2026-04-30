import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";
import { databaseProvider } from "../db/database-provider.js";
import { AnalyticsService } from "../services/AnalyticsService.js";
import { logger } from "../utils/logger.js";

// Query schema for date range filtering
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export function createAnalyticsRoutes() {
  const router = new Hono<{ Bindings: Record<string, unknown> }>();

  // Apply middleware to all routes
  router.use(authMiddleware);
  router.use(tenantMiddleware);

  /**
   * GET /analytics/conversations
   * Get conversation metrics: total, by status, by channel, avg messages
   */
  router.get(
    "/conversations",
    zValidator("query", dateRangeSchema),
    async (c) => {
      try {
        const organizationId = c.get("organizationId");
        if (!organizationId) {
          return c.json({ error: "UNAUTHORIZED" }, 401);
        }

        const query = c.req.valid("query");
        const dateRange = query.startDate && query.endDate
          ? {
              startDate: new Date(query.startDate),
              endDate: new Date(query.endDate),
            }
          : undefined;

        const tenantDb = await databaseProvider.getClientDrizzle(organizationId);
        const analyticsService = new AnalyticsService(tenantDb);

        const metrics = await analyticsService.getConversationMetrics(organizationId, dateRange);

        return c.json({ success: true, data: metrics }, 200);
      } catch (error) {
        logger.error({ error }, "Error fetching conversation metrics");
        return c.json(
          { success: false, error: { code: "METRICS_FETCH_FAILED", message: error instanceof Error ? error.message : "Failed to fetch metrics" } },
          500
        );
      }
    }
  );

  /**
   * GET /analytics/agents
   * Get agent performance report
   */
  router.get(
    "/agents",
    zValidator("query", dateRangeSchema),
    async (c) => {
      try {
        const organizationId = c.get("organizationId");
        if (!organizationId) {
          return c.json({ error: "UNAUTHORIZED" }, 401);
        }

        const query = c.req.valid("query");
        const dateRange = query.startDate && query.endDate
          ? {
              startDate: new Date(query.startDate),
              endDate: new Date(query.endDate),
            }
          : undefined;

        const tenantDb = await databaseProvider.getClientDrizzle(organizationId);
        const analyticsService = new AnalyticsService(tenantDb);

        const report = await analyticsService.getAgentPerformanceReport(organizationId, dateRange);

        return c.json({ success: true, data: report }, 200);
      } catch (error) {
        logger.error({ error }, "Error fetching agent performance report");
        return c.json(
          { success: false, error: { code: "AGENT_PERFORMANCE_FETCH_FAILED", message: error instanceof Error ? error.message : "Failed to fetch report" } },
          500
        );
      }
    }
  );

  /**
   * GET /analytics/channels-sla
   * Get channel SLA report
   */
  router.get(
    "/channels-sla",
    zValidator("query", dateRangeSchema),
    async (c) => {
      try {
        const organizationId = c.get("organizationId");
        if (!organizationId) {
          return c.json({ error: "UNAUTHORIZED" }, 401);
        }

        const query = c.req.valid("query");
        const dateRange = query.startDate && query.endDate
          ? {
              startDate: new Date(query.startDate),
              endDate: new Date(query.endDate),
            }
          : undefined;

        const tenantDb = await databaseProvider.getClientDrizzle(organizationId);
        const analyticsService = new AnalyticsService(tenantDb);

        const report = await analyticsService.getChannelSlaReport(organizationId, dateRange);

        return c.json({ success: true, data: report }, 200);
      } catch (error) {
        logger.error({ error }, "Error fetching channel SLA report");
        return c.json(
          { success: false, error: { code: "CHANNEL_SLA_FETCH_FAILED", message: error instanceof Error ? error.message : "Failed to fetch report" } },
          500
        );
      }
    }
  );

  /**
   * GET /analytics/volume-heatmap
   * Get volume heatmap: messages per hour, per channel
   */
  router.get(
    "/volume-heatmap",
    zValidator("query", dateRangeSchema),
    async (c) => {
      try {
        const organizationId = c.get("organizationId");
        if (!organizationId) {
          return c.json({ error: "UNAUTHORIZED" }, 401);
        }

        const query = c.req.valid("query");

        if (!query.startDate || !query.endDate) {
          return c.json(
            { error: "startDate and endDate are required for heatmap" },
            400
          );
        }

        const tenantDb = await databaseProvider.getClientDrizzle(organizationId);
        const analyticsService = new AnalyticsService(tenantDb);

        const heatmap = await analyticsService.getVolumeHeatmap(organizationId, {
          startDate: new Date(query.startDate),
          endDate: new Date(query.endDate),
        });

        return c.json({ success: true, data: heatmap }, 200);
      } catch (error) {
        logger.error({ error }, "Error fetching volume heatmap");
        return c.json(
          { success: false, error: { code: "VOLUME_HEATMAP_FETCH_FAILED", message: error instanceof Error ? error.message : "Failed to fetch heatmap" } },
          500
        );
      }
    }
  );

  /**
   * GET /analytics/csat
   * Get CSAT (Customer Satisfaction) report
   */
  router.get(
    "/csat",
    zValidator("query", dateRangeSchema),
    async (c) => {
      try {
        const organizationId = c.get("organizationId");
        if (!organizationId) {
          return c.json({ error: "UNAUTHORIZED" }, 401);
        }

        const query = c.req.valid("query");
        const dateRange = query.startDate && query.endDate
          ? {
              startDate: new Date(query.startDate),
              endDate: new Date(query.endDate),
            }
          : undefined;

        const tenantDb = await databaseProvider.getClientDrizzle(organizationId);
        const analyticsService = new AnalyticsService(tenantDb);

        const csatReport = await analyticsService.getCsatReport(organizationId, dateRange);

        return c.json({ success: true, data: csatReport }, 200);
      } catch (error) {
        logger.error({ error }, "Error fetching CSAT report");
        return c.json(
          { success: false, error: { code: "CSAT_REPORT_FETCH_FAILED", message: error instanceof Error ? error.message : "Failed to fetch report" } },
          500
        );
      }
    }
  );

  /**
   * GET /analytics/ai-usage
   * Get AI usage summary: tokens, cost, requests by provider and model
   */
  router.get(
    "/ai-usage",
    zValidator("query", dateRangeSchema),
    async (c) => {
      try {
        const organizationId = c.get("organizationId");
        if (!organizationId) {
          return c.json({ error: "UNAUTHORIZED" }, 401);
        }

        const query = c.req.valid("query");
        const dateRange = query.startDate && query.endDate
          ? {
              startDate: new Date(query.startDate),
              endDate: new Date(query.endDate),
            }
          : undefined;

        const tenantDb = await databaseProvider.getClientDrizzle(organizationId);
        const analyticsService = new AnalyticsService(tenantDb);

        const aiUsageSummary = await analyticsService.getAiUsageSummary(organizationId, dateRange);

        return c.json({ success: true, data: aiUsageSummary }, 200);
      } catch (error) {
        logger.error({ error }, "Error fetching AI usage summary");
        return c.json(
          { success: false, error: { code: "AI_USAGE_SUMMARY_FETCH_FAILED", message: error instanceof Error ? error.message : "Failed to fetch AI usage summary" } },
          500
        );
      }
    }
  );

  return router;
}
