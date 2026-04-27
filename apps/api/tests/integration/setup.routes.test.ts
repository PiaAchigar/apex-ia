import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createSetupRoutes } from "../../src/routes/setup.routes.js";

const mockAuthContext = {
  organizationId: "test-org-123",
  userId: "test-user-456",
};

const mocks = vi.hoisted(() => {
  const mockAuthMiddleware = async (_c: unknown, next: () => Promise<void>) => {
    const c = _c as any;
    c.set("auth", mockAuthContext);
    await next();
  };

  const mockDb = {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(),
  };

  return { mockAuthMiddleware, mockDb };
});

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: mocks.mockAuthMiddleware,
}));

vi.mock("../../src/middleware/rateLimitMiddleware.js", () => ({
  sensitiveRateLimitMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) => next()),
}));

vi.mock("../../src/utils/database-validation.js", () => ({
  validateClientDatabaseUrl: vi.fn((url: string) => {
    if (!url.startsWith("postgresql://")) {
      return Promise.resolve({ valid: false, error: "La URL debe ser una conexión PostgreSQL" });
    }
    if (!url.includes("supabase.co")) {
      return Promise.resolve({ valid: false, error: "La URL debe ser de un proyecto Supabase" });
    }
    return Promise.resolve({ valid: true });
  }),
  validateSupabaseProjectUrl: vi.fn((url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.endsWith("supabase.co") && parsed.protocol === "https:";
    } catch {
      return false;
    }
  }),
}));

vi.mock("../../src/db/drizzle.js", () => ({
  db: mocks.mockDb,
}));

vi.mock("../../src/services/ClientDatabaseService.js");
vi.mock("../../src/db/database-provider.js");

vi.mock("postgres", () => ({
  default: vi.fn(() => ({
    unsafe: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue("-- Mock SQL migrations"),
}));

function buildApp() {
  const app = new Hono();
  app.route("/setup", createSetupRoutes());
  return app;
}

describe("POST /setup/validate-database", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar error si la URL no es PostgreSQL", async () => {
    const res = await app.request("/setup/validate-database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        databaseUrl: "mysql://user:pass@example.com",
      }),
    });

    expect(res.status).toBe(400);
  });

  it("debería retornar error si la URL no es de Supabase", async () => {
    const res = await app.request("/setup/validate-database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        databaseUrl: "postgresql://user:pass@mydb.example.com",
      }),
    });

    expect(res.status).toBe(400);
  });

  it("debería retornar error si supabaseProjectUrl no es válida", async () => {
    const res = await app.request("/setup/validate-database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        databaseUrl: "postgresql://user:pass@db.supabase.co",
        supabaseProjectUrl: "http://invalid.example.com",
      }),
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /setup/status", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar estado de setup incompleto", async () => {
    const selectMock = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              setupCompletedAt: null,
              paidAt: null,
              plan: "starter",
            },
          ]),
        }),
      }),
    };

    mocks.mockDb.select.mockReturnValue(selectMock);

    const res = await app.request("/setup/status", {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.isComplete).toBe(false);
    expect(body.data.plan).toBe("starter");
  });

  it("debería retornar estado de setup completado con plan activo", async () => {
    const now = new Date();
    const selectMock = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              setupCompletedAt: now,
              paidAt: now,
              plan: "growth",
            },
          ]),
        }),
      }),
    };

    mocks.mockDb.select.mockReturnValue(selectMock);

    const res = await app.request("/setup/status", {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.isComplete).toBe(true);
    expect(body.data.plan).toBe("growth");
  });
});

describe("POST /setup/initialize-schema", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();

    const insertMock = {
      values: vi.fn().mockResolvedValue(undefined),
    };

    mocks.mockDb.insert.mockReturnValue(insertMock);
  });

  it("debería retornar error si la URL de la base de datos es inválida", async () => {
    const res = await app.request("/setup/initialize-schema", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        databaseUrl: "mysql://user:pass@example.com",
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
  });

  it("debería inicializar el schema y retornar lista de tablas creadas", async () => {
    const res = await app.request("/setup/initialize-schema", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        databaseUrl: "postgresql://user:pass@db.supabase.co",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.tablesCreated)).toBe(true);
    expect(body.data.tablesCreated.length).toBeGreaterThan(0);
  });
});

describe("POST /setup/complete", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();

    const updateMock = {
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    };

    const insertMock = {
      values: vi.fn().mockResolvedValue(undefined),
    };

    mocks.mockDb.update.mockReturnValue(updateMock);
    mocks.mockDb.insert.mockReturnValue(insertMock);
  });

  it("debería marcar setup como completado", async () => {
    const res = await app.request("/setup/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
  });
});
