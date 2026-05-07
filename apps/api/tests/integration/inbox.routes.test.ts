import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createInboxRoutes } from "../../src/routes/inbox.routes.js";

const mockInboxMethods = {
  getConversationsForAgent: vi.fn(),
  assignConversationToAgent: vi.fn(),
  markConversationAsResolved: vi.fn(),
  markConversationAsPending: vi.fn(),
};

vi.mock("../../src/services/InboxService.js", () => ({
  InboxService: vi.fn().mockImplementation(() => mockInboxMethods),
}));

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("auth", {
      userId: "user-test",
      organizationId: "org-1",
      organizationSlug: "test-org",
      roleName: "standard",
      permissions: {},
    });
    await next();
  }),
}));

vi.mock("../../src/middleware/tenantMiddleware.js", () => ({
  tenantMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("tenantDb", {});
    c.set("orgSlug", "test-org");
    c.set("tenantSchema", "company_test_org");
    await next();
  }),
}));

vi.mock("../../src/socket/socketServer.js", () => ({
  emitConversationAssigned: vi.fn(),
  emitConversationResolved: vi.fn(),
}));

function buildApp() {
  const app = new Hono();
  app.route("/inbox", createInboxRoutes({} as never));
  return app;
}

describe("GET /inbox/conversations", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con lista de conversaciones", async () => {
    mockInboxMethods.getConversationsForAgent.mockResolvedValueOnce([
      { id: "conv-1", channel: "whatsapp", status: "open" },
    ]);

    const res = await app.request("/inbox/conversations?tab=all");
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it("debería rechazar tab inválido con 400", async () => {
    const res = await app.request("/inbox/conversations?tab=invalid");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /inbox/conversations/:id/resolve", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 al resolver conversación", async () => {
    mockInboxMethods.markConversationAsResolved.mockResolvedValueOnce(undefined);

    const res = await app.request("/inbox/conversations/conv-abc/resolve", {
      method: "PATCH",
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { status: string } };
    expect(body.data.status).toBe("resolved");
  });
});

describe("PATCH /inbox/conversations/:id/pending", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 al marcar conversación como pendiente", async () => {
    mockInboxMethods.markConversationAsPending.mockResolvedValueOnce(undefined);

    const res = await app.request("/inbox/conversations/conv-abc/pending", {
      method: "PATCH",
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { status: string } };
    expect(body.data.status).toBe("pending");
  });
});
