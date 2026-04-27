import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createContactsRoutes } from "../../src/routes/contacts.routes.js";

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

const mockContactsMethods = { createContact: vi.fn() };
vi.mock("../../src/services/ContactsService.js", () => ({
  ContactsService: vi.fn().mockImplementation(() => mockContactsMethods),
}));

function buildApp() {
  const app = new Hono();
  app.route("/contacts", createContactsRoutes());
  return app;
}

describe("SQL Injection Prevention", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería permitir strings normales con apóstrofe (no son SQL injection)", async () => {
    mockContactsMethods.createContact.mockResolvedValueOnce({ id: "c-1", name: "John O'Connor" });

    const res = await app.request("/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "John O'Connor", email: "john@example.com" }),
    });

    // Strings con apóstrofe son válidos — la protección contra SQL injection viene de Drizzle ORM
    expect(res.status).toBe(201);
  });

  it("debería rechazar email con formato inválido", async () => {
    const res = await app.request("/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", email: "not-an-email'; DROP TABLE users; --" }),
    });

    expect(res.status).toBe(400);
  });

  it("debería rechazar name que exceda el límite de caracteres", async () => {
    const res = await app.request("/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "A".repeat(101) }),
    });

    expect(res.status).toBe(400);
  });
});
