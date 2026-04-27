import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createPipelineRoutes } from "../../src/routes/pipeline.routes.js";

const mockPipelineMethods = {
  createPipeline: vi.fn(),
  updatePipelineStages: vi.fn(),
  createDeal: vi.fn(),
  updateDeal: vi.fn(),
  deleteDeal: vi.fn(),
  moveDealToStage: vi.fn(),
  getDealsGroupedByStage: vi.fn(),
};

vi.mock("../../src/services/PipelineService.js", () => ({
  PipelineService: vi.fn().mockImplementation(() => mockPipelineMethods),
}));

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: vi.fn(
    async (
      c: { set: (k: string, v: unknown) => void },
      next: () => Promise<void>
    ) => {
      c.set("auth", {
        userId: "user-test",
        organizationId: "org-1",
        organizationSlug: "test-org",
      });
      await next();
    }
  ),
}));

vi.mock("../../src/middleware/tenantMiddleware.js", () => ({
  tenantMiddleware: vi.fn(
    async (
      c: { set: (k: string, v: unknown) => void },
      next: () => Promise<void>
    ) => {
      c.set("tenantDb", {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([]),
        }),
      });
      c.set("orgSlug", "test-org");
      c.set("tenantSchema", "company_test_org");
      await next();
    }
  ),
}));

vi.mock("@apex-ia/database/schema/tenant", () => ({
  pipelines: {},
  pipelineStages: {},
  deals: {},
}));

function buildApp() {
  const app = new Hono();
  app.route("/pipeline", createPipelineRoutes());
  return app;
}

describe("POST /pipeline", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 201 al crear una pipeline", async () => {
    mockPipelineMethods.createPipeline.mockResolvedValueOnce({
      id: "pipeline-1",
      name: "Ventas",
      isDefault: false,
      createdAt: new Date().toISOString(),
    });

    const res = await app.request("/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ventas" }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("pipeline-1");
  });

  it("debería retornar 400 si el nombre está vacío", async () => {
    const res = await app.request("/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /pipeline/:id/board", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con stages agrupados", async () => {
    mockPipelineMethods.getDealsGroupedByStage.mockResolvedValueOnce({
      stages: [
        {
          id: "stage-1",
          pipelineId: "pipeline-1",
          name: "Nuevo",
          order: 0,
          color: null,
          deals: [
            {
              id: "deal-1",
              title: "Deal A",
              pipelineId: "pipeline-1",
              stageId: "stage-1",
            },
          ],
        },
        {
          id: "stage-2",
          pipelineId: "pipeline-1",
          name: "Propuesta",
          order: 1,
          color: "#10B981",
          deals: [],
        },
      ],
    });

    const res = await app.request("/pipeline/pipeline-1/board");

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { stages: unknown[] };
    };
    expect(body.success).toBe(true);
    expect(body.data.stages).toHaveLength(2);
  });
});

describe("POST /pipeline/deals", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 201 al crear un deal", async () => {
    mockPipelineMethods.createDeal.mockResolvedValueOnce({
      id: "deal-1",
      title: "Proyecto Beta",
      pipelineId: "pipeline-1",
      stageId: "stage-1",
      contactId: null,
      amount: "10000.00",
      probability: 40,
      closedDate: null,
      assignedAgentId: null,
      createdAt: new Date().toISOString(),
    });

    const res = await app.request("/pipeline/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Proyecto Beta",
        pipelineId: "7f3b6e1a-1234-5678-abcd-000000000001",
        stageId: "7f3b6e1a-1234-5678-abcd-000000000002",
        amount: "10000.00",
        probability: 40,
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("deal-1");
  });

  it("debería retornar 400 si faltan campos requeridos", async () => {
    const res = await app.request("/pipeline/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Sin pipelineId" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /pipeline/deals/:dealId", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 al actualizar un deal", async () => {
    mockPipelineMethods.updateDeal.mockResolvedValueOnce(undefined);

    const res = await app.request("/pipeline/deals/deal-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Actualizado", probability: 90 }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: { dealId: string } };
    expect(body.success).toBe(true);
    expect(body.data.dealId).toBe("deal-1");
  });

  it("debería retornar 404 si el deal no existe", async () => {
    mockPipelineMethods.updateDeal.mockRejectedValueOnce(
      new Error("DEAL_NOT_FOUND")
    );

    const res = await app.request("/pipeline/deals/deal-ghost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "No existe" }),
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.error.code).toBe("DEAL_NOT_FOUND");
  });
});

describe("DELETE /pipeline/deals/:dealId", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 al eliminar un deal", async () => {
    mockPipelineMethods.deleteDeal.mockResolvedValueOnce(undefined);

    const res = await app.request("/pipeline/deals/deal-1", {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: { dealId: string } };
    expect(body.success).toBe(true);
    expect(body.data.dealId).toBe("deal-1");
  });

  it("debería retornar 404 si el deal no existe", async () => {
    mockPipelineMethods.deleteDeal.mockRejectedValueOnce(
      new Error("DEAL_NOT_FOUND")
    );

    const res = await app.request("/pipeline/deals/deal-ghost", {
      method: "DELETE",
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.error.code).toBe("DEAL_NOT_FOUND");
  });
});

describe("PATCH /pipeline/deals/:dealId/move", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 al mover un deal a otro stage", async () => {
    mockPipelineMethods.moveDealToStage.mockResolvedValueOnce(undefined);

    const res = await app.request("/pipeline/deals/deal-1/move", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetStageId: "7f3b6e1a-1234-5678-abcd-000000000003",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { dealId: string; targetStageId: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.dealId).toBe("deal-1");
  });

  it("debería retornar 404 si el stage no existe", async () => {
    mockPipelineMethods.moveDealToStage.mockRejectedValueOnce(
      new Error("STAGE_NOT_FOUND")
    );

    const res = await app.request("/pipeline/deals/deal-1/move", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetStageId: "7f3b6e1a-1234-5678-abcd-000000000099",
      }),
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.error.code).toBe("STAGE_NOT_FOUND");
  });

  it("debería retornar 400 si targetStageId no es uuid válido", async () => {
    const res = await app.request("/pipeline/deals/deal-1/move", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetStageId: "not-a-uuid" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("PUT /pipeline/:pipelineId/stages", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 al actualizar stages", async () => {
    mockPipelineMethods.updatePipelineStages.mockResolvedValueOnce([
      { id: "stage-1", pipelineId: "pipeline-1", name: "Nuevo", order: 0, color: null },
      { id: "stage-2", pipelineId: "pipeline-1", name: "Ganado", order: 1, color: "#10B981" },
    ]);

    const res = await app.request("/pipeline/pipeline-1/stages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stages: [
          { name: "Nuevo", order: 0 },
          { name: "Ganado", order: 1, color: "#10B981" },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it("debería retornar 404 si la pipeline no existe", async () => {
    mockPipelineMethods.updatePipelineStages.mockRejectedValueOnce(
      new Error("PIPELINE_NOT_FOUND")
    );

    const res = await app.request("/pipeline/pipeline-ghost/stages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages: [{ name: "Stage", order: 0 }] }),
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.error.code).toBe("PIPELINE_NOT_FOUND");
  });
});
