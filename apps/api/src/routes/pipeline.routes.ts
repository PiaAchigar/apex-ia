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

const renamePipelineSchema = z.object({
  name: z.string().min(1).max(100),
});

const addStageSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().max(7).optional(),
});

const updateStageSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().max(7).optional(),
  order: z.number().int().min(0).optional(),
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

  // PIPELINE MANAGEMENT ROUTES
  routes.patch(
    "/:pipelineId",
    zValidator("json", renamePipelineSchema),
    async (c) => {
      const { pipelineId } = c.req.param();
      const { name } = c.req.valid("json");
      const tenantDb = c.get("tenantDb");

      const pipelineService = new PipelineService(tenantDb);

      try {
        const pipeline = await pipelineService.renamePipeline(pipelineId, name);
        return c.json({ success: true, data: pipeline });
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

  routes.delete("/:pipelineId", async (c) => {
    const { pipelineId } = c.req.param();
    const tenantDb = c.get("tenantDb");

    const pipelineService = new PipelineService(tenantDb);

    try {
      await pipelineService.deletePipeline(pipelineId);
      return c.json({ success: true, data: { pipelineId } });
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
  });

  // PIPELINE STAGES MANAGEMENT ROUTES
  routes.post(
    "/:pipelineId/stages",
    zValidator("json", addStageSchema),
    async (c) => {
      const { pipelineId } = c.req.param();
      const { name, color } = c.req.valid("json");
      const tenantDb = c.get("tenantDb");

      const pipelineService = new PipelineService(tenantDb);

      try {
        const stage = await pipelineService.addStage(pipelineId, name, color);
        return c.json({ success: true, data: stage }, 201);
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

  routes.patch(
    "/:pipelineId/stages/:stageId",
    zValidator("json", updateStageSchema),
    async (c) => {
      const { stageId } = c.req.param();
      const rawInput = c.req.valid("json");
      const tenantDb = c.get("tenantDb");

      const pipelineService = new PipelineService(tenantDb);

      try {
        const stage = await pipelineService.updateStage(stageId, {
          name: rawInput.name,
          color: rawInput.color,
          order: rawInput.order,
        });
        return c.json({ success: true, data: stage });
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

  routes.delete("/:pipelineId/stages/:stageId", async (c) => {
    const { stageId } = c.req.param();
    const targetStageId = c.req.query("targetStageId");
    const tenantDb = c.get("tenantDb");

    const pipelineService = new PipelineService(tenantDb);

    try {
      await pipelineService.deleteStage(
        stageId,
        targetStageId ? targetStageId : undefined
      );
      return c.json({ success: true, data: { stageId } });
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
      if (err instanceof Error && err.message === "TARGET_STAGE_NOT_FOUND") {
        return c.json(
          {
            success: false,
            error: { code: "TARGET_STAGE_NOT_FOUND", message: "Stage destino no encontrado" },
          },
          404
        );
      }
      throw err;
    }
  });

  return routes;
}
