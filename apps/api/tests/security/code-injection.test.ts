import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createFlowBuilderRoutes } from "../../src/routes/flow-builder.routes.js";

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: vi.fn(
    async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
      c.set("auth", { userId: "u-1", organizationId: "org-1", organizationSlug: "test", roleId: "admin-role-uuid", roleName: "admin", permissions: {} });
      await next();
    }
  ),
}));

vi.mock("../../src/middleware/tenantMiddleware.js", () => ({
  tenantMiddleware: vi.fn(
    async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
      c.set("tenantDb", {});
      c.set("orgSlug", "test");
      c.set("tenantSchema", "company_test");
      await next();
    }
  ),
}));

vi.mock("../../src/services/FlowBuilderService.js", () => ({
  FlowBuilderService: vi.fn().mockImplementation(() => ({
    createFlow: vi.fn(),
  })),
}));

function buildApp() {
  const app = new Hono();
  app.route("/flows", createFlowBuilderRoutes());
  return app;
}

describe("Code Injection Prevention en Flow nodes", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería rechazar nodo con eval", async () => {
    const res = await app.request("/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Flow",
        triggerType: "keyword",
        nodes: [{
          id: "node-1",
          type: "ConditionNode",
          data: { condition: "eval('__import__(\"os\").system(\"rm -rf /\")')", operator: "==", value: "true" },
          position: { x: 0, y: 0 },
        }],
        edges: [],
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { error: { message: string } };
    expect(body.error.message).toContain("no permitido");
  });

  it("debería rechazar nodo con process en mensaje", async () => {
    const res = await app.request("/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Flow",
        triggerType: "keyword",
        nodes: [{
          id: "node-1",
          type: "SendMessageNode",
          data: { content: "Hola {{process.env.SECRET_KEY}}" },
          position: { x: 0, y: 0 },
        }],
        edges: [],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("debería rechazar nodo con child_process", async () => {
    const res = await app.request("/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Flow",
        triggerType: "keyword",
        nodes: [{
          id: "node-1",
          type: "AiResponseNode",
          data: { prompt: "require('child_process').exec('ls')", model: "gpt-4o" },
          position: { x: 0, y: 0 },
        }],
        edges: [],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("debería permitir nodos con contenido legítimo", async () => {
    const mockMethods = { createFlow: vi.fn().mockResolvedValueOnce({ id: "flow-1", name: "Test" }) };
    vi.mocked(
      (await import("../../src/services/FlowBuilderService.js")).FlowBuilderService
    ).mockImplementation(() => mockMethods as never);

    const res = await app.request("/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bienvenida",
        triggerType: "keyword",
        nodes: [{
          id: "node-1",
          type: "SendMessageNode",
          data: { content: "¡Hola! Bienvenido a nuestro servicio." },
          position: { x: 0, y: 0 },
        }],
        edges: [],
      }),
    });

    expect(res.status).toBe(201);
  });
});
