import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createCallLogsRoutes } from "../../src/routes/call-logs.routes.js";

const mockCallLogsMethods = {
  listCallLogs: vi.fn(),
  getCallLogById: vi.fn(),
  createCallLog: vi.fn(),
};

vi.mock("../../src/services/CallLogsService.js", () => ({
  CallLogsService: vi.fn().mockImplementation(() => mockCallLogsMethods),
}));

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("auth", {
      userId: "agent-1",
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
    await next();
  }),
}));

function buildApp() {
  const app = new Hono();
  app.route("/call-logs", createCallLogsRoutes() as never);
  return app;
}

describe("GET /call-logs", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con lista de call logs", async () => {
    mockCallLogsMethods.listCallLogs.mockResolvedValueOnce([
      {
        id: "log-1",
        contactId: "contact-1",
        duration: 180,
        transcript: "Conversation transcript",
        isSuccess: true,
        aiModel: "whisper-1",
        tokensUsed: 245,
        createdAt: new Date(),
      },
    ]);

    const res = await app.request("/call-logs?page=1&limit=10");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe("GET /call-logs/:id", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con un call log específico", async () => {
    const fakeLog = {
      id: "log-1",
      contactId: "contact-1",
      duration: 180,
      transcript: "Conversation transcript",
      isSuccess: true,
      aiModel: "whisper-1",
      tokensUsed: 245,
      createdAt: new Date(),
    };

    mockCallLogsMethods.getCallLogById.mockResolvedValueOnce(fakeLog);

    const res = await app.request("/call-logs/log-1");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: { id: string } };
    expect(body.data.id).toBe("log-1");
  });

  it("debería retornar 404 si el call log no existe", async () => {
    mockCallLogsMethods.getCallLogById.mockRejectedValueOnce(
      new Error("CALL_LOG_NOT_FOUND")
    );

    const res = await app.request("/call-logs/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("POST /call-logs", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería crear un call log y retornar 201", async () => {
    const fakeLog = {
      id: "log-2",
      contactId: "contact-1",
      duration: 120,
      transcript: "New call transcript",
      isSuccess: true,
      aiModel: "whisper-1",
      tokensUsed: 180,
      createdAt: new Date(),
    };

    mockCallLogsMethods.createCallLog.mockResolvedValueOnce(fakeLog);

    const res = await app.request("/call-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: "contact-1",
        duration: 120,
        transcript: "New call transcript",
        isSuccess: true,
        aiModel: "whisper-1",
        tokensUsed: 180,
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { success: boolean; data: { id: string } };
    expect(body.data.id).toBe("log-2");
  });
});
