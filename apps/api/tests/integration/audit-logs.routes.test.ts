import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createAuditLogsRoutes } from "../../src/routes/settings/audit-logs.routes.js";

const mockAuditTrailMethods = {
  listAuditLogs: vi.fn(),
  logAction: vi.fn(),
};

vi.mock("../../src/services/AuditTrailService.js", () => ({
  AuditTrailService: vi.fn().mockImplementation(() => mockAuditTrailMethods),
}));

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("auth", { userId: "user-1", organizationId: "org-1" });
    await next();
  }),
}));

function buildApp() {
  const app = new Hono();
  app.route("/settings/audit-logs", createAuditLogsRoutes());
  return app;
}

describe("GET /settings/audit-logs", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con lista de audit logs", async () => {
    const mockLogs = [
      {
        id: "log-1",
        organizationId: "org-1",
        action: "user.created",
        resourceType: "user",
        createdAt: new Date(),
      },
    ];

    mockAuditTrailMethods.listAuditLogs.mockResolvedValueOnce(mockLogs);

    const res = await app.request("/settings/audit-logs");

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: Array<{ action: string }>;
    };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.action).toBe("user.created");
  });

  it("debería retornar 200 con parámetros de paginación", async () => {
    mockAuditTrailMethods.listAuditLogs.mockResolvedValueOnce([]);

    const res = await app.request("/settings/audit-logs?limit=10&offset=0");

    expect(res.status).toBe(200);
    expect(mockAuditTrailMethods.listAuditLogs).toHaveBeenCalledWith("org-1", {
      limit: 10,
      offset: 0,
    });
  });

  it("debería retornar 500 si hay error en el servicio", async () => {
    mockAuditTrailMethods.listAuditLogs.mockRejectedValueOnce(
      new Error("AUDIT_LOG_LIST_FAILED: DB error")
    );

    const res = await app.request("/settings/audit-logs");

    expect(res.status).toBe(500);
    const body = (await res.json()) as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("AUDIT_LOG_LIST_FAILED");
  });
});
