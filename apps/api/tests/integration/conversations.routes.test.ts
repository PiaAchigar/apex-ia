import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createConversationRoutes } from "../../src/routes/conversations.routes.js";

const mockConversationMethods = {
  getMessagesForConversation: vi.fn(),
  sendOutgoingMessageToChannel: vi.fn(),
  markMessagesAsRead: vi.fn(),
  getConversationWithContact: vi.fn(),
};

vi.mock("../../src/services/ConversationService.js", () => ({
  ConversationService: vi.fn().mockImplementation(() => mockConversationMethods),
}));

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("auth", { userId: "agent-1", organizationId: "org-1", organizationSlug: "acme" });
    await next();
  }),
}));

vi.mock("../../src/middleware/tenantMiddleware.js", () => ({
  tenantMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("tenantDb", {});
    c.set("orgSlug", "acme");
    c.set("tenantSchema", "company_acme");
    await next();
  }),
}));

vi.mock("../../src/socket/socketServer.js", () => ({
  emitNewMessage: vi.fn(),
}));

function buildApp() {
  const app = new Hono();
  app.route("/conversations", createConversationRoutes({} as never));
  return app;
}

describe("GET /conversations/:id/messages", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con lista de mensajes", async () => {
    mockConversationMethods.getMessagesForConversation.mockResolvedValueOnce([
      { id: "m-1", content: "hola", senderType: "contact" },
    ]);

    const res = await app.request("/conversations/conv-1/messages");
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe("POST /conversations/:id/messages", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 201 con el mensaje enviado", async () => {
    mockConversationMethods.sendOutgoingMessageToChannel.mockResolvedValueOnce({
      message: {
        id: "msg-out-1",
        content: "Hola cliente",
        senderType: "agent",
      },
      channel: "whatsapp",
      contactId: "c-1",
    });

    const res = await app.request("/conversations/conv-1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hola cliente" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: { id: string } };
    expect(body.data.id).toBe("msg-out-1");
  });

  it("debería rechazar contenido vacío con 400", async () => {
    const res = await app.request("/conversations/conv-1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /conversations/:id", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 404 si la conversación no existe", async () => {
    mockConversationMethods.getConversationWithContact.mockResolvedValueOnce(null);

    const res = await app.request("/conversations/ghost-id");
    expect(res.status).toBe(404);
  });

  it("debería retornar 200 con conversación y contacto", async () => {
    mockConversationMethods.getConversationWithContact.mockResolvedValueOnce({
      id: "conv-1",
      channel: "whatsapp",
      contact: { id: "c-1", whatsappId: "54911" },
    });

    const res = await app.request("/conversations/conv-1");
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { id: string } };
    expect(body.data.id).toBe("conv-1");
  });
});
