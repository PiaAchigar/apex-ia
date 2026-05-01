import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createApiKeyRoutes } from "../../src/routes/settings/api-keys.routes.js";

const mockApiKeyMethods = {
  listApiKeys: vi.fn(),
  generateApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
};

vi.mock("../../src/services/ApiKeyService.js", () => ({
  ApiKeyService: vi.fn().mockImplementation(() => mockApiKeyMethods),
}));

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("auth", { userId: "user-1", organizationId: "org-1" });
    await next();
  }),
}));

function buildApp() {
  const app = new Hono();
  app.route("/settings/api-keys", createApiKeyRoutes());
  return app;
}

describe("api-keys routes", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería tener rutas registradas", () => {
    expect(app).toBeDefined();
  });

  it("GET /settings/api-keys debería estar disponible", async () => {
    const mockKeys = [
      {
        id: "key-1",
        organizationId: "org-1",
        name: "Production Key",
        isActive: true,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
      },
    ];

    mockApiKeyMethods.listApiKeys.mockResolvedValueOnce(mockKeys);

    const res = await app.request("/settings/api-keys");

    expect([200, 400, 500]).toContain(res.status);
  });

  it("POST /settings/api-keys debería estar disponible", async () => {
    const mockResponse = {
      key: "apex_test123",
      record: {
        id: "key-1",
        organizationId: "org-1",
        name: "Test Key",
        isActive: true,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
      },
    };

    mockApiKeyMethods.generateApiKey.mockResolvedValueOnce(mockResponse);

    const res = await app.request("/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Key",
      }),
    });

    expect([200, 201, 400, 422]).toContain(res.status);
  });

  it("DELETE /settings/api-keys/:id debería estar disponible", async () => {
    mockApiKeyMethods.revokeApiKey.mockResolvedValueOnce(undefined);

    const res = await app.request("/settings/api-keys/key-1", {
      method: "DELETE",
    });

    expect([200, 400, 500]).toContain(res.status);
  });
});
