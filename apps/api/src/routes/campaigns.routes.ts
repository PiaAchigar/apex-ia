import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { CampaignService } from "../services/CampaignService.js";
import { getCampaignQueue } from "../queues/campaignQueue.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";

const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  channel: z.string().min(1),
  messageContent: z.string().min(1),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  channel: z.string().min(1).optional(),
  messageContent: z.string().min(1).optional(),
});

const scheduleCampaignSchema = z.object({
  scheduledAt: z.coerce.date(),
});

export function createCampaignsRoutes() {
  const routes = new Hono();

  routes.use("*", authMiddleware);
  routes.use("*", tenantMiddleware);

  routes.get("/", async (c) => {
    const tenantDb = c.get("tenantDb");
    const service = new CampaignService(tenantDb);
    const list = await service.getCampaigns();
    return c.json({ success: true, data: list });
  });

  routes.post("/", zValidator("json", createCampaignSchema), async (c) => {
    const tenantDb = c.get("tenantDb");
    const input = c.req.valid("json");
    const service = new CampaignService(tenantDb);
    const created = await service.createCampaign(input);
    return c.json({ success: true, data: created }, 201);
  });

  routes.get("/:campaignId", async (c) => {
    const { campaignId } = c.req.param();
    const tenantDb = c.get("tenantDb");
    const service = new CampaignService(tenantDb);
    try {
      const campaign = await service.getCampaignById(campaignId);
      return c.json({ success: true, data: campaign });
    } catch (err) {
      if (err instanceof Error && err.message === "CAMPAIGN_NOT_FOUND") {
        return c.json(
          { success: false, error: { code: "CAMPAIGN_NOT_FOUND", message: "Campaña no encontrada" } },
          404
        );
      }
      throw err;
    }
  });

  routes.patch("/:campaignId", zValidator("json", updateCampaignSchema), async (c) => {
    const { campaignId } = c.req.param();
    const tenantDb = c.get("tenantDb");
    const input = c.req.valid("json");
    const service = new CampaignService(tenantDb);
    try {
      const updated = await service.updateCampaign(campaignId, input);
      return c.json({ success: true, data: updated });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "CAMPAIGN_NOT_FOUND") {
          return c.json(
            { success: false, error: { code: "CAMPAIGN_NOT_FOUND", message: "Campaña no encontrada" } },
            404
          );
        }
        if (err.message === "CAMPAIGN_NOT_EDITABLE") {
          return c.json(
            { success: false, error: { code: "CAMPAIGN_NOT_EDITABLE", message: "Solo se pueden editar campañas en borrador" } },
            409
          );
        }
      }
      throw err;
    }
  });

  routes.post(
    "/:campaignId/schedule",
    zValidator("json", scheduleCampaignSchema),
    async (c) => {
      const { campaignId } = c.req.param();
      const auth = c.get("auth");
      const tenantDb = c.get("tenantDb");
      const { scheduledAt } = c.req.valid("json");
      const queue = getCampaignQueue();
      const service = new CampaignService(tenantDb, queue);
      try {
        const updated = await service.scheduleCampaign(
          campaignId,
          auth.organizationId,
          scheduledAt
        );
        return c.json({ success: true, data: updated });
      } catch (err) {
        if (err instanceof Error) {
          if (err.message === "CAMPAIGN_NOT_FOUND") {
            return c.json(
              { success: false, error: { code: "CAMPAIGN_NOT_FOUND", message: "Campaña no encontrada" } },
              404
            );
          }
          if (err.message === "CAMPAIGN_NOT_SCHEDULABLE") {
            return c.json(
              { success: false, error: { code: "CAMPAIGN_NOT_SCHEDULABLE", message: "Solo se pueden programar campañas en borrador" } },
              409
            );
          }
        }
        throw err;
      }
    }
  );

  routes.post("/:campaignId/pause", async (c) => {
    const { campaignId } = c.req.param();
    const tenantDb = c.get("tenantDb");
    const service = new CampaignService(tenantDb);
    try {
      const updated = await service.pauseCampaign(campaignId);
      return c.json({ success: true, data: updated });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "CAMPAIGN_NOT_FOUND") {
          return c.json(
            { success: false, error: { code: "CAMPAIGN_NOT_FOUND", message: "Campaña no encontrada" } },
            404
          );
        }
        if (err.message === "CAMPAIGN_NOT_RUNNING") {
          return c.json(
            { success: false, error: { code: "CAMPAIGN_NOT_RUNNING", message: "La campaña no está en ejecución" } },
            409
          );
        }
      }
      throw err;
    }
  });

  routes.post("/:campaignId/resume", async (c) => {
    const { campaignId } = c.req.param();
    const tenantDb = c.get("tenantDb");
    const service = new CampaignService(tenantDb);
    try {
      const updated = await service.resumeCampaign(campaignId);
      return c.json({ success: true, data: updated });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "CAMPAIGN_NOT_FOUND") {
          return c.json(
            { success: false, error: { code: "CAMPAIGN_NOT_FOUND", message: "Campaña no encontrada" } },
            404
          );
        }
        if (err.message === "CAMPAIGN_NOT_PAUSED") {
          return c.json(
            { success: false, error: { code: "CAMPAIGN_NOT_PAUSED", message: "La campaña no está pausada" } },
            409
          );
        }
      }
      throw err;
    }
  });

  routes.post("/:campaignId/cancel", async (c) => {
    const { campaignId } = c.req.param();
    const tenantDb = c.get("tenantDb");
    const service = new CampaignService(tenantDb);
    try {
      const updated = await service.cancelCampaign(campaignId);
      return c.json({ success: true, data: updated });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "CAMPAIGN_NOT_FOUND") {
          return c.json(
            { success: false, error: { code: "CAMPAIGN_NOT_FOUND", message: "Campaña no encontrada" } },
            404
          );
        }
        if (err.message === "CAMPAIGN_NOT_CANCELLABLE") {
          return c.json(
            { success: false, error: { code: "CAMPAIGN_NOT_CANCELLABLE", message: "La campaña no se puede cancelar en su estado actual" } },
            409
          );
        }
      }
      throw err;
    }
  });

  routes.get("/:campaignId/metrics", async (c) => {
    const { campaignId } = c.req.param();
    const tenantDb = c.get("tenantDb");
    const service = new CampaignService(tenantDb);
    try {
      const metrics = await service.getCampaignMetrics(campaignId);
      return c.json({ success: true, data: metrics });
    } catch (err) {
      if (err instanceof Error && err.message === "CAMPAIGN_NOT_FOUND") {
        return c.json(
          { success: false, error: { code: "CAMPAIGN_NOT_FOUND", message: "Campaña no encontrada" } },
          404
        );
      }
      throw err;
    }
  });

  return routes;
}
