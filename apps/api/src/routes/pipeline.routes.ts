import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { pipelines } from "@apex-ia/database/schema/tenant";
import { PipelineService } from "../services/PipelineService.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";

const createPipelineSchema = z.object({
  name: z.string().min(1).max(100),
});

const updateStagesSchema = z.object({
  stages: z.array(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(50),
      order: z.number().int().min(0),
      color: z.string().max(7).optional(),
    })
  ),
});

const createDealSchema = z.object({
  title: z.string().min(1).max(200),
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  amount: z.string().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  assignedAgentId: z.string().uuid().optional(),
});

const updateDealSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  stageId: z.string().uuid().optional(),
  amount: z.string().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  assignedAgentId: z.string().uuid().optional(),
  closedDate: z.coerce.date().optional(),
});

const moveDealSchema = z.object({
  targetStageId: z.string().uuid(),
});

export function createPipelineRoutes(): Hono {
  const routes = new Hono();

  routes.use("*", authMiddleware);
  routes.use("*", tenantMiddleware);

  routes.get("/", async (c) => {
    const tenantDb = c.get("tenantDb");
    const rows = await tenantDb.select().from(pipelines);
    return c.json({ success: true, data: rows });
  });

  routes.post("/", zValidator("json", createPipelineSchema), async (c) => {
    const { name } = c.req.valid("json");
    const tenantDb = c.get("tenantDb");

    const pipelineService = new PipelineService(tenantDb);
    const pipeline = await pipelineService.createPipeline(name);

    return c.json({ success: true, data: pipeline }, 201);
  });

  routes.put(
    "/:pipelineId/stages",
    zValidator("json", updateStagesSchema),
    async (c) => {
      const { pipelineId } = c.req.param();
      const { stages } = c.req.valid("json");
      const tenantDb = c.get("tenantDb");

      const pipelineService = new PipelineService(tenantDb);

      try {
        const updatedStages = await pipelineService.updatePipelineStages(
          pipelineId,
          stages
        );
        return c.json({ success: true, data: updatedStages });
      } catch (err) {
        if (err instanceof Error && err.message === "PIPELINE_NOT_FOUND") {
          return c.json(
            {
              success: false,
              error: { code: "PIPELINE_NOT_FOUND", message: "Pipeline no encontrado" },
            },
            404
          );
        }
        throw err;
      }
    }
  );

  routes.get("/:pipelineId/board", async (c) => {
    const { pipelineId } = c.req.param();
    const tenantDb = c.get("tenantDb");

    const pipelineService = new PipelineService(tenantDb);
    const board = await pipelineService.getDealsGroupedByStage(pipelineId);

    return c.json({ success: true, data: board });
  });

  routes.post("/deals", zValidator("json", createDealSchema), async (c) => {
    const input = c.req.valid("json");
    const tenantDb = c.get("tenantDb");

    const pipelineService = new PipelineService(tenantDb);
    const deal = await pipelineService.createDeal(input);

    return c.json({ success: true, data: deal }, 201);
  });

  routes.patch(
    "/deals/:dealId",
    zValidator("json", updateDealSchema),
    async (c) => {
      const { dealId } = c.req.param();
      const input = c.req.valid("json");
      const tenantDb = c.get("tenantDb");

      const pipelineService = new PipelineService(tenantDb);

      try {
        await pipelineService.updateDeal(dealId, input);
        return c.json({ success: true, data: { dealId } });
      } catch (err) {
        if (err instanceof Error && err.message === "DEAL_NOT_FOUND") {
          return c.json(
            {
              success: false,
              error: { code: "DEAL_NOT_FOUND", message: "Deal no encontrado" },
            },
            404
          );
        }
        throw err;
      }
    }
  );

  routes.delete("/deals/:dealId", async (c) => {
    const { dealId } = c.req.param();
    const tenantDb = c.get("tenantDb");

    const pipelineService = new PipelineService(tenantDb);

    try {
      await pipelineService.deleteDeal(dealId);
      return c.json({ success: true, data: { dealId } });
    } catch (err) {
      if (err instanceof Error && err.message === "DEAL_NOT_FOUND") {
        return c.json(
          {
            success: false,
            error: { code: "DEAL_NOT_FOUND", message: "Deal no encontrado" },
          },
          404
        );
      }
      throw err;
    }
  });

  routes.patch(
    "/deals/:dealId/move",
    zValidator("json", moveDealSchema),
    async (c) => {
      const { dealId } = c.req.param();
      const { targetStageId } = c.req.valid("json");
      const tenantDb = c.get("tenantDb");

      const pipelineService = new PipelineService(tenantDb);

      try {
        await pipelineService.moveDealToStage(dealId, targetStageId);
        return c.json({ success: true, data: { dealId, targetStageId } });
      } catch (err) {
        if (err instanceof Error && err.message === "STAGE_NOT_FOUND") {
          return c.json(
            {
              success: false,
              error: { code: "STAGE_NOT_FOUND", message: "Stage no encontrado" },
            },
            404
          );
        }
        throw err;
      }
    }
  );

  return routes;
}
