import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createCustomFieldsRoutes } from "../../src/routes/custom-fields.routes.js";

const mockTenantDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

const mockAuthMiddleware = (c: any, next: any) => {
  c.set("organizationId", "org-test-1");
  c.set("tenantDb", mockTenantDb);
  return next();
};

const mockTenantMiddleware = (c: any, next: any) => {
  return next();
};

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: mockAuthMiddleware,
}));

vi.mock("../../src/middleware/tenantMiddleware.js", () => ({
  tenantMiddleware: mockTenantMiddleware,
}));

function buildApp() {
  const app = new Hono();
  app.route("/settings/custom-fields", createCustomFieldsRoutes());
  return app;
}

describe("GET /settings/custom-fields — list field definitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debería listar todos los campos activos para entity type contact", async () => {
    const mockFields = [
      {
        id: "field-1",
        entityType: "contact",
        fieldKey: "company",
        label: "Company",
        fieldType: "text",
        options: [],
        isRequired: true,
        displayOrder: 1,
        isActive: true,
        createdAt: new Date(),
      },
    ];

    const mockChain = {
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(mockFields),
    };

    mockTenantDb.select.mockReturnValue(mockChain);

    const app = buildApp();
    const res = await app.request("/settings/custom-fields?entityType=contact");

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: any[] };
    expect(body.success).toBe(true);
    expect(body.data).toEqual(mockFields);
  });

  it("debería retornar 400 si entityType no es válido", async () => {
    const app = buildApp();
    const res = await app.request("/settings/custom-fields?entityType=invalid");

    expect(res.status).toBe(400);
    const body = (await res.json()) as { success: boolean; error: any };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVALID_QUERY");
  });

  it("debería retornar 400 si falta entityType", async () => {
    const app = buildApp();
    const res = await app.request("/settings/custom-fields");

    expect(res.status).toBe(400);
  });
});

describe("POST /settings/custom-fields — crear campo personalizado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debería crear un nuevo campo personalizado", async () => {
    const payload = {
      entityType: "contact",
      fieldKey: "birthDate",
      label: "Birth Date",
      fieldType: "date",
      isRequired: false,
      displayOrder: 2,
    };

    const mockCreated = {
      id: "field-new-1",
      ...payload,
      options: [],
      isActive: true,
      createdAt: new Date(),
    };

    const mockChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([mockCreated]),
    };

    mockTenantDb.insert.mockReturnValue(mockChain);

    const app = buildApp();
    const res = await app.request("/settings/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { success: boolean; data: any };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("field-new-1");
    expect(body.data.label).toBe("Birth Date");
  });

  it("debería rechazar request sin fieldKey", async () => {
    const payload = {
      entityType: "contact",
      label: "Birth Date",
      fieldType: "date",
    };

    const app = buildApp();
    const res = await app.request("/settings/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /settings/custom-fields/:fieldId — actualizar campo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debería actualizar un campo personalizado", async () => {
    const fieldId = "field-1";
    const payload = {
      label: "Updated Label",
      isRequired: true,
    };

    const mockUpdated = {
      id: fieldId,
      entityType: "contact",
      fieldKey: "company",
      label: "Updated Label",
      fieldType: "text",
      options: [],
      isRequired: true,
      displayOrder: 1,
      isActive: true,
      createdAt: new Date(),
    };

    const mockChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([mockUpdated]),
    };

    mockTenantDb.update.mockReturnValue(mockChain);

    const app = buildApp();
    const res = await app.request(`/settings/custom-fields/${fieldId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: any };
    expect(body.success).toBe(true);
    expect(body.data.label).toBe("Updated Label");
  });

  it("debería retornar 404 si campo no existe", async () => {
    const fieldId = "nonexistent";
    const payload = { label: "Test" };

    const mockChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    };

    mockTenantDb.update.mockReturnValue(mockChain);

    const app = buildApp();
    const res = await app.request(`/settings/custom-fields/${fieldId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as { success: boolean; error: any };
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("DELETE /settings/custom-fields/:fieldId — eliminar campo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debería soft-delete un campo personalizado", async () => {
    const fieldId = "field-1";

    const mockChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue({ rowCount: 1 }),
    };

    mockTenantDb.update.mockReturnValue(mockChain);

    const app = buildApp();
    const res = await app.request(`/settings/custom-fields/${fieldId}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: any };
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe(true);
  });

  it("debería retornar 404 si campo no existe", async () => {
    const fieldId = "nonexistent";

    const mockChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue({ rowCount: 0 }),
    };

    mockTenantDb.update.mockReturnValue(mockChain);

    const app = buildApp();
    const res = await app.request(`/settings/custom-fields/${fieldId}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as { success: boolean; error: any };
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
