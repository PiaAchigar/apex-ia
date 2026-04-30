import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createAiCredentialsRoutes } from "../../src/routes/ai-credentials.routes.js";

const mockCredentialsMethods = {
  listCredentials: vi.fn(),
  createCredential: vi.fn(),
  updateCredential: vi.fn(),
  setApiKey: vi.fn(),
  deleteCredential: vi.fn(),
};

vi.mock("../../src/services/AiCredentialsService.js", () => ({
  AiCredentialsService: vi.fn().mockImplementation(() => mockCredentialsMethods),
}));

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("auth", { userId: "agent-1", organizationId: "org-1" });
    c.set("organizationId", "org-1");
    await next();
  }),
}));

vi.mock("../../src/middleware/tenantMiddleware.js", () => ({
  tenantMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("tenantDb", {});
    await next();
  }),
}));

vi.mock("../../src/db/database-provider.js", () => ({
  databaseProvider: {
    getClientDrizzle: vi.fn().mockResolvedValue({}),
  },
}));

function buildApp() {
  const app = new Hono();
  app.route("/settings/ai-credentials", createAiCredentialsRoutes());
  return app;
}

describe("GET /settings/ai-credentials", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con lista de credenciales", async () => {
    mockCredentialsMethods.listCredentials.mockResolvedValueOnce([
      {
        id: "cred-1",
        provider: "anthropic",
        isPrimary: true,
        isActive: true,
        createdAt: "2026-04-29T00:00:00Z",
      },
    ]);

    const res = await app.request("/settings/ai-credentials");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: Array<{ provider: string }>;
    };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.provider).toBe("anthropic");
  });
});

describe("POST /settings/ai-credentials", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 201 al crear credencial", async () => {
    mockCredentialsMethods.createCredential.mockResolvedValueOnce({
      id: "cred-2",
      provider: "openai",
      isPrimary: false,
      isActive: true,
      createdAt: "2026-04-29T00:00:00Z",
    });

    const res = await app.request("/settings/ai-credentials", {
      method: "POST",
      body: JSON.stringify({
        provider: "openai",
        apiKey: "sk-test-123",
        isPrimary: false,
      }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("cred-2");
  });
});

describe("PATCH /settings/ai-credentials/:id", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 al actualizar credencial", async () => {
    mockCredentialsMethods.updateCredential.mockResolvedValueOnce({
      id: "cred-1",
      provider: "anthropic",
      isPrimary: true,
      isActive: false,
      createdAt: "2026-04-29T00:00:00Z",
    });

    const res = await app.request("/settings/ai-credentials/cred-1", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("cred-1");
  });

  it("debería retornar 404 si credencial no existe", async () => {
    mockCredentialsMethods.updateCredential.mockImplementationOnce(() => {
      throw new Error("AI_CREDENTIAL_NOT_FOUND");
    });

    const res = await app.request("/settings/ai-credentials/nonexistent", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /settings/ai-credentials/:id", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 204 al eliminar credencial", async () => {
    mockCredentialsMethods.deleteCredential.mockResolvedValueOnce(undefined);

    const res = await app.request("/settings/ai-credentials/cred-1", {
      method: "DELETE",
    });

    expect(res.status).toBe(204);
  });

  it("debería retornar 404 si credencial no existe", async () => {
    mockCredentialsMethods.deleteCredential.mockImplementationOnce(() => {
      throw new Error("AI_CREDENTIAL_NOT_FOUND");
    });

    const res = await app.request("/settings/ai-credentials/nonexistent", {
      method: "DELETE",
    });

    expect(res.status).toBe(404);
  });
});

describe("POST /settings/ai-credentials/:id/key", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 al actualizar API key", async () => {
    mockCredentialsMethods.setApiKey.mockResolvedValueOnce({
      id: "cred-1",
      provider: "anthropic",
      isPrimary: true,
      isActive: true,
      createdAt: "2026-04-29T00:00:00Z",
    });

    const res = await app.request("/settings/ai-credentials/cred-1/key", {
      method: "POST",
      body: JSON.stringify({ apiKey: "new-key-123" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
  });
});
