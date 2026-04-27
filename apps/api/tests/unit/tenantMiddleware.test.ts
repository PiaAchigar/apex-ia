import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

vi.mock("../../src/db/database-provider.js", () => ({
  databaseProvider: {
    getClientDrizzle: vi.fn().mockResolvedValue({ mock: "clientDb" }),
    invalidate: vi.fn(),
  },
}));

vi.mock("../../src/db/drizzle.js", () => ({
  db: {},
}));

import { tenantMiddleware } from "../../src/middleware/tenantMiddleware.js";

const AUTH_CONTEXT = {
  userId: "user-123",
  organizationId: "org-uuid-123",
  organizationSlug: "acme",
  roleId: "admin-role-uuid",
  roleName: "admin",
  permissions: {},
};

function makeApp(withAuth = true) {
  const app = new Hono();
  if (withAuth) {
    app.use("*", async (c, next) => {
      c.set("auth", AUTH_CONTEXT);
      await next();
    });
  }
  return app;
}

describe("tenantMiddleware (dual-database)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debería setear tenantDb, organizationId y orgSlug desde auth context", async () => {
    const app = makeApp();
    app.use("*", tenantMiddleware);
    app.get("/test", (c) =>
      c.json({
        orgSlug: c.get("orgSlug"),
        organizationId: c.get("organizationId"),
        hasTenantDb: !!c.get("tenantDb"),
      })
    );

    const res = await app.request("/test");
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body["orgSlug"]).toBe("acme");
    expect(body["organizationId"]).toBe("org-uuid-123");
    expect(body["hasTenantDb"]).toBe(true);
  });

  it("debería retornar 400 si no hay auth context", async () => {
    const app = makeApp(false);
    app.use("*", tenantMiddleware);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect((body["error"] as Record<string, unknown>)["code"]).toBe("MISSING_TENANT");
  });

  it("debería retornar 403 si el cliente no tiene base de datos configurada", async () => {
    const { databaseProvider } = await import("../../src/db/database-provider.js");
    vi.mocked(databaseProvider.getClientDrizzle).mockRejectedValueOnce(
      new Error("CLIENT_DB_NOT_CONFIGURED")
    );

    const app = makeApp();
    app.use("*", tenantMiddleware);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(403);
    expect((body["error"] as Record<string, unknown>)["code"]).toBe("SETUP_REQUIRED");
  });

  it("debería retornar 503 si hay un error de conexión genérico", async () => {
    const { databaseProvider } = await import("../../src/db/database-provider.js");
    vi.mocked(databaseProvider.getClientDrizzle).mockRejectedValueOnce(
      new Error("connection refused")
    );

    const app = makeApp();
    app.use("*", tenantMiddleware);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(503);
    expect((body["error"] as Record<string, unknown>)["code"]).toBe("DB_CONNECTION_ERROR");
  });
});
