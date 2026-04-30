import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { FlowBuilderService } from "../services/FlowBuilderService.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";
import { scanNodesForDangerousCode } from "../validators/flow.validators.js";

const flowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.unknown()),
  position: z.object({ x: z.number(), y: z.number() }),
});

const flowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
});

const createFlowSchema = z.object({
  name: z.string().min(1).max(100),
  triggerType: z.string().optional(),
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
});

const updateFlowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  triggerType: z.string().optional(),
  nodes: z.array(flowNodeSchema).optional(),
  edges: z.array(flowEdgeSchema).optional(),
});

const executeFlowSchema = z.object({
  triggerData: z.record(z.unknown()).default({}),
});

export function createFlowBuilderRoutes() {
  const routes = new Hono();

  routes.use("*", authMiddleware);
  routes.use("*", tenantMiddleware);

  routes.get("/", async (c) => {
    const tenantDb = c.get("tenantDb");
    const organizationId = c.get("organizationId");
    const service = new FlowBuilderService(tenantDb, organizationId);
    const flowList = await service.getFlows();
    return c.json({ success: true, data: flowList });
  });

  routes.post("/", zValidator("json", createFlowSchema), async (c) => {
    const tenantDb = c.get("tenantDb");
    const organizationId = c.get("organizationId");
    const input = c.req.valid("json");

    const dangerousPattern = scanNodesForDangerousCode(input.nodes)
    if (dangerousPattern) {
      return c.json(
        { success: false, error: { code: "INVALID_INPUT", message: `Código no permitido en nodos: "${dangerousPattern}"` } },
        400
      )
    }

    const service = new FlowBuilderService(tenantDb, organizationId);
    const created = await service.createFlow(input);
    return c.json({ success: true, data: created }, 201);
  });

  routes.get("/:flowId", async (c) => {
    const { flowId } = c.req.param();
    const tenantDb = c.get("tenantDb");
    const organizationId = c.get("organizationId");
    const service = new FlowBuilderService(tenantDb, organizationId);
    try {
      const flow = await service.getFlowById(flowId);
      return c.json({ success: true, data: flow });
    } catch (err) {
      if (err instanceof Error && err.message === "FLOW_NOT_FOUND") {
        return c.json(
          { success: false, error: { code: "FLOW_NOT_FOUND", message: "Flow no encontrado" } },
          404
        );
      }
      throw err;
    }
  });

  routes.patch("/:flowId", zValidator("json", updateFlowSchema), async (c) => {
    const { flowId } = c.req.param();
    const tenantDb = c.get("tenantDb");
    const organizationId = c.get("organizationId");
    const input = c.req.valid("json");

    if (input.nodes) {
      const dangerousPattern = scanNodesForDangerousCode(input.nodes)
      if (dangerousPattern) {
        return c.json(
          { success: false, error: { code: "INVALID_INPUT", message: `Código no permitido en nodos: "${dangerousPattern}"` } },
          400
        )
      }
    }

    const service = new FlowBuilderService(tenantDb, organizationId);
    try {
      const updated = await service.updateFlow(flowId, input);
      return c.json({ success: true, data: updated });
    } catch (err) {
      if (err instanceof Error && err.message === "FLOW_NOT_FOUND") {
        return c.json(
          { success: false, error: { code: "FLOW_NOT_FOUND", message: "Flow no encontrado" } },
          404
        );
      }
      throw err;
    }
  });

  routes.delete("/:flowId", async (c) => {
    const { flowId } = c.req.param();
    const tenantDb = c.get("tenantDb");
    const organizationId = c.get("organizationId");
    const service = new FlowBuilderService(tenantDb, organizationId);
    try {
      await service.deleteFlow(flowId);
      return c.json({ success: true, data: { flowId } });
    } catch (err) {
      if (err instanceof Error && err.message === "FLOW_NOT_FOUND") {
        return c.json(
          { success: false, error: { code: "FLOW_NOT_FOUND", message: "Flow no encontrado" } },
          404
        );
      }
      throw err;
    }
  });

  routes.post("/:flowId/activate", async (c) => {
    const { flowId } = c.req.param();
    const tenantDb = c.get("tenantDb");
    const organizationId = c.get("organizationId");
    const service = new FlowBuilderService(tenantDb, organizationId);
    try {
      await service.activateFlow(flowId);
      return c.json({ success: true, data: { flowId, isActive: true } });
    } catch (err) {
      if (err instanceof Error && err.message === "FLOW_NOT_FOUND") {
        return c.json(
          { success: false, error: { code: "FLOW_NOT_FOUND", message: "Flow no encontrado" } },
          404
        );
      }
      throw err;
    }
  });

  routes.post("/:flowId/deactivate", async (c) => {
    const { flowId } = c.req.param();
    const tenantDb = c.get("tenantDb");
    const organizationId = c.get("organizationId");
    const service = new FlowBuilderService(tenantDb, organizationId);
    try {
      await service.deactivateFlow(flowId);
      return c.json({ success: true, data: { flowId, isActive: false } });
    } catch (err) {
      if (err instanceof Error && err.message === "FLOW_NOT_FOUND") {
        return c.json(
          { success: false, error: { code: "FLOW_NOT_FOUND", message: "Flow no encontrado" } },
          404
        );
      }
      throw err;
    }
  });

  routes.post(
    "/:flowId/execute",
    zValidator("json", executeFlowSchema),
    async (c) => {
      const { flowId } = c.req.param();
      const { triggerData } = c.req.valid("json");
      const tenantDb = c.get("tenantDb");
      const organizationId = c.get("organizationId");
      const service = new FlowBuilderService(tenantDb, organizationId);
      try {
        const flow = await service.getFlowById(flowId);
        const nodes = (flow.nodesJson as never[]) ?? [];
        const edges = (flow.edgesJson as never[]) ?? [];
        const result = await service.executeFlow(nodes, edges, triggerData);
        return c.json({ success: true, data: result });
      } catch (err) {
        if (err instanceof Error && err.message === "FLOW_NOT_FOUND") {
          return c.json(
            { success: false, error: { code: "FLOW_NOT_FOUND", message: "Flow no encontrado" } },
            404
          );
        }
        throw err;
      }
    }
  );

  return routes;
}
