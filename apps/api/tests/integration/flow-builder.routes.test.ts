import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createFlowBuilderRoutes } from "../../src/routes/flow-builder.routes.js";

const mockFlowMethods = {
  createFlow: vi.fn(),
  updateFlow: vi.fn(),
  getFlows: vi.fn(),
  getFlowById: vi.fn(),
  deleteFlow: vi.fn(),
  activateFlow: vi.fn(),
  deactivateFlow: vi.fn(),
  executeFlow: vi.fn(),
};

vi.mock("../../src/services/FlowBuilderService.js", () => ({
  FlowBuilderService: vi.fn().mockImplementation(() => mockFlowMethods),
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
        roleId: "admin-role-uuid", roleName: "admin", permissions: {},
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
      c.set("tenantDb", {});
      c.set("orgSlug", "test-org");
      c.set("tenantSchema", "company_test_org");
      await next();
    }
  ),
}));

const sampleFlow = {
  id: "flow-1",
  name: "Bienvenida",
  triggerType: "new_conversation",
  nodesJson: [],
  edgesJson: [],
  isActive: false,
  version: 1,
  createdAt: new Date().toISOString(),
};

function buildApp() {
  const app = new Hono();
  app.route("/flows", createFlowBuilderRoutes());
  return app;
}

describe("GET /flows", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con array de flows", async () => {
    mockFlowMethods.getFlows.mockResolvedValueOnce([sampleFlow]);

    const res = await app.request("/flows");

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe("POST /flows", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 201 con el flow creado", async () => {
    mockFlowMethods.createFlow.mockResolvedValueOnce(sampleFlow);

    const res = await app.request("/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bienvenida",
        triggerType: "new_conversation",
        nodes: [],
        edges: [],
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("flow-1");
  });

  it("debería retornar 400 si falta el campo name", async () => {
    const res = await app.request("/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes: [], edges: [] }),
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /flows/:flowId", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con el flow por id", async () => {
    mockFlowMethods.getFlowById.mockResolvedValueOnce(sampleFlow);

    const res = await app.request("/flows/flow-1");

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { id: string } };
    expect(body.data.id).toBe("flow-1");
  });

  it("debería retornar 404 si el flow no existe", async () => {
    mockFlowMethods.getFlowById.mockRejectedValueOnce(new Error("FLOW_NOT_FOUND"));

    const res = await app.request("/flows/ghost");

    expect(res.status).toBe(404);
    const body = await res.json() as { success: boolean; error: { code: string } };
    expect(body.error.code).toBe("FLOW_NOT_FOUND");
  });
});

describe("POST /flows/:flowId/activate", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 al activar un flow existente", async () => {
    mockFlowMethods.activateFlow.mockResolvedValueOnce(undefined);

    const res = await app.request("/flows/flow-1/activate", { method: "POST" });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { isActive: boolean } };
    expect(body.data.isActive).toBe(true);
  });

  it("debería retornar 404 si el flow no existe", async () => {
    mockFlowMethods.activateFlow.mockRejectedValueOnce(new Error("FLOW_NOT_FOUND"));

    const res = await app.request("/flows/ghost/activate", { method: "POST" });

    expect(res.status).toBe(404);
  });
});

describe("POST /flows/:flowId/execute", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería ejecutar el flow y retornar los pasos", async () => {
    const flowWithNodes = {
      ...sampleFlow,
      nodesJson: [{ id: "1", type: "trigger", data: {}, position: { x: 0, y: 0 } }],
      edgesJson: [],
    };
    mockFlowMethods.getFlowById.mockResolvedValueOnce(flowWithNodes);
    mockFlowMethods.executeFlow.mockReturnValueOnce({
      steps: [{ nodeId: "1", type: "trigger", status: "executed" }],
      completed: true,
    });

    const res = await app.request("/flows/flow-1/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggerData: { channel: "whatsapp" } }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { completed: boolean; steps: unknown[] } };
    expect(body.data.completed).toBe(true);
    expect(body.data.steps).toHaveLength(1);
  });
});
