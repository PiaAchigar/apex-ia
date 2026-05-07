import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createContactsRoutes } from "../../src/routes/contacts.routes.js";

const mockContactsMethods = {
  searchContacts: vi.fn(),
  createContact: vi.fn(),
  fetchContactWithFullConversationHistory: vi.fn(),
  updateContact: vi.fn(),
  archiveContact: vi.fn(),
  importContactsFromCsvFile: vi.fn(),
  exportContactsToCsv: vi.fn(),
};

vi.mock("../../src/services/ContactsService.js", () => ({
  ContactsService: vi.fn().mockImplementation(() => mockContactsMethods),
}));

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: vi.fn(
    async (
      c: { set: (k: string, v: unknown) => void },
      next: () => Promise<void>
    ) => {
      c.set("auth", {
        userId: "user-test",
        organizationId: "org-1",
        organizationSlug: "test-org",
        roleName: "standard",
        permissions: {},
      });
      await next();
    }
  ),
}));

vi.mock("../../src/middleware/tenantMiddleware.js", () => ({
  tenantMiddleware: vi.fn(
    async (
      c: { set: (k: string, v: unknown) => void },
      next: () => Promise<void>
    ) => {
      c.set("tenantDb", {});
      c.set("orgSlug", "test-org");
      c.set("tenantSchema", "company_test_org");
      await next();
    }
  ),
}));

function buildApp() {
  const app = new Hono();
  app.route("/contacts", createContactsRoutes());
  return app;
}

describe("GET /contacts", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con lista de contactos", async () => {
    mockContactsMethods.searchContacts.mockResolvedValueOnce([
      { id: "c-1", name: "Alice", email: "alice@example.com" },
    ]);

    const res = await app.request("/contacts");
    expect(res.status).toBe(200);

    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("debería retornar 200 con query param q", async () => {
    mockContactsMethods.searchContacts.mockResolvedValueOnce([]);

    const res = await app.request("/contacts?q=alice");
    expect(res.status).toBe(200);
  });
});

describe("POST /contacts", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 201 al crear un contacto válido", async () => {
    const fakeContact = {
      id: "c-new",
      name: "New Contact",
      email: "new@example.com",
      phone: null,
      tags: [],
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    mockContactsMethods.createContact.mockResolvedValueOnce(fakeContact);

    const res = await app.request("/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Contact", email: "new@example.com" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("c-new");
  });

  it("debería retornar 400 con email inválido", async () => {
    const res = await app.request("/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /contacts/:id", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 404 si el contacto no existe", async () => {
    mockContactsMethods.fetchContactWithFullConversationHistory.mockResolvedValueOnce(null);

    const res = await app.request("/contacts/ghost-id");
    expect(res.status).toBe(404);

    const body = await res.json() as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("CONTACT_NOT_FOUND");
  });

  it("debería retornar 200 con el contacto y conversaciones si existe", async () => {
    const fakeResult = {
      id: "c-1",
      name: "Alice",
      conversations: [{ id: "conv-1", channel: "whatsapp" }],
    };

    mockContactsMethods.fetchContactWithFullConversationHistory.mockResolvedValueOnce(
      fakeResult
    );

    const res = await app.request("/contacts/c-1");
    expect(res.status).toBe(200);

    const body = await res.json() as {
      success: boolean;
      data: { id: string; conversations: unknown[] };
    };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("c-1");
    expect(body.data.conversations).toHaveLength(1);
  });
});

describe("PATCH /contacts/:id", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 al actualizar el contacto", async () => {
    const updated = {
      id: "c-1",
      name: "Updated",
      email: "updated@example.com",
      phone: null,
      tags: [],
      isArchived: false,
    };

    mockContactsMethods.updateContact.mockResolvedValueOnce(updated);

    const res = await app.request("/contacts/c-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated", email: "updated@example.com" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { name: string } };
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("Updated");
  });

  it("debería retornar 404 si el contacto no existe", async () => {
    mockContactsMethods.updateContact.mockRejectedValueOnce(
      new Error("CONTACT_NOT_FOUND")
    );

    const res = await app.request("/contacts/ghost-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ghost" }),
    });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /contacts/:id/archive", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 al archivar el contacto", async () => {
    mockContactsMethods.archiveContact.mockResolvedValueOnce(undefined);

    const res = await app.request("/contacts/c-1/archive", {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body = await res.json() as {
      success: boolean;
      data: { contactId: string; isArchived: boolean };
    };
    expect(body.success).toBe(true);
    expect(body.data.isArchived).toBe(true);
    expect(body.data.contactId).toBe("c-1");
  });
});
