import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createWebChatRoutes } from "../../src/routes/webchat.routes.js";

const mockWebChatMethods = {
  handleIncomingWebChatMessage: vi.fn(),
  sendWebChatMessage: vi.fn(),
  getEmbedScript: vi.fn().mockReturnValue("/* embed script */"),
};

vi.mock("../../src/services/channels/WebChatService.js", () => ({
  WebChatService: vi.fn().mockImplementation(() => mockWebChatMethods),
}));

vi.mock("../../src/socket/socketServer.js", () => ({
  emitNewMessage: vi.fn(),
}));

const mockDbQuery = vi.fn();

vi.mock("../../src/db/drizzle.js", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: (n: number) => Promise.resolve(mockDbQuery()),
        }),
      }),
    }),
  },
}));

const mockChannelLookup = {
  createServicesForTenant: vi.fn().mockReturnValue({
    inboxService: {},
    conversationService: {},
    tenantDb: {},
  }),
  findTenantByChannelIdentifier: vi.fn(),
};

function buildApp() {
  const app = new Hono();
  app.route("/webchat", createWebChatRoutes(mockChannelLookup as never, {} as never));
  return app;
}

describe("POST /webchat/messages", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDbQuery.mockResolvedValueOnce([{ id: "org-123" }]);
    mockChannelLookup.createServicesForTenant.mockReturnValue(Promise.resolve({
      inboxService: {},
      conversationService: {},
      tenantDb: {},
    }));
    app = buildApp();
  });

  it("debería retornar 200 al recibir mensaje de WebChat", async () => {
    mockWebChatMethods.handleIncomingWebChatMessage.mockResolvedValueOnce(undefined);

    const res = await app.request("/webchat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-abc",
        orgSlug: "acme",
        content: "Hola, necesito ayuda",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
    expect(mockWebChatMethods.handleIncomingWebChatMessage).toHaveBeenCalledOnce();
  });

  it("debería retornar 400 con contenido vacío", async () => {
    const res = await app.request("/webchat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-abc",
        orgSlug: "acme",
        content: "",
      }),
    });

    expect(res.status).toBe(400);
  });

  it("debería retornar 500 si el servicio falla", async () => {
    mockWebChatMethods.handleIncomingWebChatMessage.mockRejectedValueOnce(
      new Error("DB error")
    );

    const res = await app.request("/webchat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-abc",
        orgSlug: "acme",
        content: "Hola",
      }),
    });

    expect(res.status).toBe(500);
  });
});

describe("GET /webchat/embed/:orgSlug", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar el script de embed como JavaScript", async () => {
    const res = await app.request("/webchat/embed/acme");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/javascript");
  });
});
