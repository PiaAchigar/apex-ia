import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createChannelsRoutes } from "../../src/routes/channels.routes.js";

// Mock context and database
const mockContext = {
  organizationId: "org-test-123",
  userId: "user-test-456",
  orgSlug: "test-org",
};

const mocks = vi.hoisted(() => {
  // Mock database operations
  const mockTenantDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };

  // Mock middlewares
  const mockAuthMiddleware = async (
    c: { set: (k: string, v: unknown) => void },
    next: () => Promise<void>
  ) => {
    c.set("auth", mockContext);
    c.set("organizationId", mockContext.organizationId);
    c.set("userId", mockContext.userId);
    await next();
  };

  const mockTenantMiddleware = async (
    c: { set: (k: string, v: unknown) => void },
    next: () => Promise<void>
  ) => {
    c.set("tenantDb", mockTenantDb);
    c.set("organizationId", mockContext.organizationId);
    c.set("orgSlug", mockContext.orgSlug);
    await next();
  };

  return {
    mockTenantDb,
    mockDb,
    mockAuthMiddleware,
    mockTenantMiddleware,
  };
});

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: mocks.mockAuthMiddleware,
}));

vi.mock("../../src/middleware/tenantMiddleware.js", () => ({
  tenantMiddleware: mocks.mockTenantMiddleware,
}));

vi.mock("../../src/db/drizzle.js", () => ({
  db: mocks.mockDb,
}));

// Mock logger
vi.mock("../../src/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock encryption functions (use real implementation pattern)
vi.mock("../../src/utils/encryption.js", () => ({
  encryptCredentials: vi.fn((plaintext: string) => {
    return Buffer.from(`encrypted:${plaintext}`).toString("base64");
  }),
  decryptCredentials: vi.fn((ciphertext: string) => {
    return Buffer.from(ciphertext, "base64").toString("utf-8").replace("encrypted:", "");
  }),
}));

function buildApp() {
  const app = new Hono();
  app.route("/settings/channels", createChannelsRoutes());
  return app;
}

describe("GET /settings/channels", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("should return 200 with list of active channels", async () => {
    const mockChannels = [
      {
        id: "ch-1",
        channelType: "whatsapp-cloud",
        encryptedCredentials: "encrypted-creds",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "ch-2",
        channelType: "telegram",
        encryptedCredentials: "encrypted-creds",
        isActive: true,
        createdAt: new Date(),
      },
    ];

    const mockSelect = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockChannels),
      }),
    };

    mocks.mockTenantDb.select.mockReturnValue(mockSelect);

    const res = await app.request("/settings/channels", {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { channelType: string; isActive: boolean; connectedAt: string | null }[];
    };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].channelType).toBe("whatsapp-cloud");
    expect(body.data[1].channelType).toBe("telegram");
  });

  it("should return 200 with empty array when no channels are connected", async () => {
    const mockSelect = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    };

    mocks.mockTenantDb.select.mockReturnValue(mockSelect);

    const res = await app.request("/settings/channels", {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: unknown[];
    };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(0);
  });
});

describe("POST /settings/channels/:type/connect", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("should validate WhatsApp Cloud credentials and connect successfully (201)", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    const mockSelectWhereLimit = {
      limit: vi.fn().mockResolvedValue([]),
    };
    const mockSelectFrom = {
      where: vi.fn().mockReturnValue(mockSelectWhereLimit),
    };
    const mockSelect = {
      from: vi.fn().mockReturnValue(mockSelectFrom),
    };

    const mockInsertValues = {
      returning: vi.fn().mockResolvedValue([{ id: "ch-new-1" }]),
    };
    const mockInsert = {
      values: vi.fn().mockReturnValue(mockInsertValues),
    };

    const mockUpdateSet = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    const mockUpdate = {
      set: vi.fn().mockReturnValue(mockUpdateSet),
    };

    mocks.mockTenantDb.select.mockReturnValue(mockSelect);
    mocks.mockTenantDb.insert.mockReturnValue(mockInsert);
    mocks.mockDb.select.mockReturnValue(mockSelect);
    mocks.mockDb.insert.mockReturnValue(mockInsert);

    const res = await app.request("/settings/channels/whatsapp-cloud/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumberId: "1234567890",
        accessToken: "test-access-token-123",
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      success: boolean;
      data: { channelType: string; isActive: boolean; connectedAt: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.channelType).toBe("whatsapp-cloud");
    expect(body.data.isActive).toBe(true);
    expect(body.data.connectedAt).toBeTruthy();
  });

  it("should return 400 for invalid WhatsApp Cloud schema (missing phoneNumberId)", async () => {
    const res = await app.request("/settings/channels/whatsapp-cloud/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: "test-access-token-123",
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string; message: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when WhatsApp Cloud API validation fails", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const res = await app.request("/settings/channels/whatsapp-cloud/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumberId: "1234567890",
        accessToken: "invalid-token",
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("should return 409 if WhatsApp Cloud channel is already connected", async () => {
    const existingChannel = [
      {
        id: "ch-existing",
        channelType: "whatsapp-cloud",
        encryptedCredentials: "encrypted-creds",
        isActive: true,
        createdAt: new Date(),
      },
    ];

    const mockSelectWhereLimit = {
      limit: vi.fn().mockResolvedValue(existingChannel),
    };
    const mockSelectFrom = {
      where: vi.fn().mockReturnValue(mockSelectWhereLimit),
    };
    const mockSelect = {
      from: vi.fn().mockReturnValue(mockSelectFrom),
    };

    mocks.mockTenantDb.select.mockReturnValue(mockSelect);

    const res = await app.request("/settings/channels/whatsapp-cloud/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumberId: "1234567890",
        accessToken: "test-access-token-123",
      }),
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.error.code).toBe("CHANNEL_ALREADY_CONNECTED");
  });

  it("should validate Telegram credentials and connect successfully (201)", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true, result: { id: 123456 } }),
    });

    const mockSelectWhereLimit = {
      limit: vi.fn().mockResolvedValue([]),
    };
    const mockSelectFrom = {
      where: vi.fn().mockReturnValue(mockSelectWhereLimit),
    };
    const mockSelect = {
      from: vi.fn().mockReturnValue(mockSelectFrom),
    };

    const mockInsertValues = {
      returning: vi.fn().mockResolvedValue([{ id: "ch-new-telegram" }]),
    };
    const mockInsert = {
      values: vi.fn().mockReturnValue(mockInsertValues),
    };

    mocks.mockTenantDb.select.mockReturnValue(mockSelect);
    mocks.mockTenantDb.insert.mockReturnValue(mockInsert);
    mocks.mockDb.select.mockReturnValue(mockSelect);
    mocks.mockDb.insert.mockReturnValue(mockInsert);

    const res = await app.request("/settings/channels/telegram/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        botToken: "123456:ABCDEFghijklmnopqrstuvwxyz",
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      success: boolean;
      data: { channelType: string; isActive: boolean };
    };
    expect(body.success).toBe(true);
    expect(body.data.channelType).toBe("telegram");
  });

  it("should return 400 for invalid Telegram schema (missing botToken)", async () => {
    const res = await app.request("/settings/channels/telegram/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when Telegram API validation fails", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const res = await app.request("/settings/channels/telegram/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        botToken: "invalid-token",
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("should validate Email credentials and connect successfully (201)", async () => {
    const mockSelectWhereLimit = {
      limit: vi.fn().mockResolvedValue([]),
    };
    const mockSelectFrom = {
      where: vi.fn().mockReturnValue(mockSelectWhereLimit),
    };
    const mockSelect = {
      from: vi.fn().mockReturnValue(mockSelectFrom),
    };

    const mockInsertValues = {
      returning: vi.fn().mockResolvedValue([{ id: "ch-new-email" }]),
    };
    const mockInsert = {
      values: vi.fn().mockReturnValue(mockInsertValues),
    };

    mocks.mockTenantDb.select.mockReturnValue(mockSelect);
    mocks.mockTenantDb.insert.mockReturnValue(mockInsert);
    mocks.mockDb.select.mockReturnValue(mockSelect);
    mocks.mockDb.insert.mockReturnValue(mockInsert);

    const res = await app.request("/settings/channels/email/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resendApiKey: "re_test_key_123",
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      success: boolean;
      data: { channelType: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.channelType).toBe("email");
  });

  it("should return 400 for unsupported channel type", async () => {
    const res = await app.request("/settings/channels/unsupported-channel/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.error.code).toBe("INVALID_CHANNEL_TYPE");
  });

  it("should validate Instagram credentials and connect successfully (201)", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    const mockSelectWhereLimit = {
      limit: vi.fn().mockResolvedValue([]),
    };
    const mockSelectFrom = {
      where: vi.fn().mockReturnValue(mockSelectWhereLimit),
    };
    const mockSelect = {
      from: vi.fn().mockReturnValue(mockSelectFrom),
    };

    const mockInsertValues = {
      returning: vi.fn().mockResolvedValue([{ id: "ch-new-ig" }]),
    };
    const mockInsert = {
      values: vi.fn().mockReturnValue(mockInsertValues),
    };

    mocks.mockTenantDb.select.mockReturnValue(mockSelect);
    mocks.mockTenantDb.insert.mockReturnValue(mockInsert);
    mocks.mockDb.select.mockReturnValue(mockSelect);
    mocks.mockDb.insert.mockReturnValue(mockInsert);

    const res = await app.request("/settings/channels/instagram/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageAccessToken: "ig-token-123",
        pageId: "ig-page-id-456",
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      success: boolean;
      data: { channelType: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.channelType).toBe("instagram");
  });

  it("should validate Facebook credentials and connect successfully (201)", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    const mockSelectWhereLimit = {
      limit: vi.fn().mockResolvedValue([]),
    };
    const mockSelectFrom = {
      where: vi.fn().mockReturnValue(mockSelectWhereLimit),
    };
    const mockSelect = {
      from: vi.fn().mockReturnValue(mockSelectFrom),
    };

    const mockInsertValues = {
      returning: vi.fn().mockResolvedValue([{ id: "ch-new-fb" }]),
    };
    const mockInsert = {
      values: vi.fn().mockReturnValue(mockInsertValues),
    };

    mocks.mockTenantDb.select.mockReturnValue(mockSelect);
    mocks.mockTenantDb.insert.mockReturnValue(mockInsert);
    mocks.mockDb.select.mockReturnValue(mockSelect);
    mocks.mockDb.insert.mockReturnValue(mockInsert);

    const res = await app.request("/settings/channels/facebook/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageAccessToken: "fb-token-123",
        pageId: "fb-page-id-456",
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      success: boolean;
      data: { channelType: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.channelType).toBe("facebook");
  });

  it("should validate WebChat credentials and connect successfully (201)", async () => {
    const mockSelectWhereLimit = {
      limit: vi.fn().mockResolvedValue([]),
    };
    const mockSelectFrom = {
      where: vi.fn().mockReturnValue(mockSelectWhereLimit),
    };
    const mockSelect = {
      from: vi.fn().mockReturnValue(mockSelectFrom),
    };

    const mockInsertValues = {
      returning: vi.fn().mockResolvedValue([{ id: "ch-new-webchat" }]),
    };
    const mockInsert = {
      values: vi.fn().mockReturnValue(mockInsertValues),
    };

    mocks.mockTenantDb.select.mockReturnValue(mockSelect);
    mocks.mockTenantDb.insert.mockReturnValue(mockInsert);
    mocks.mockDb.select.mockReturnValue(mockSelect);
    mocks.mockDb.insert.mockReturnValue(mockInsert);

    const res = await app.request("/settings/channels/webchat/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        widgetId: "widget-123",
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      success: boolean;
      data: { channelType: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.channelType).toBe("webchat");
  });

  it("should restore inactive channel on reconnect (update isActive=true)", async () => {
    const inactiveChannel = [
      {
        id: "ch-existing",
        channelType: "telegram",
        encryptedCredentials: "encrypted-creds",
        isActive: false,
        createdAt: new Date(),
      },
    ];

    const mockSelectWhereLimit = {
      limit: vi.fn()
        .mockResolvedValueOnce(inactiveChannel)
        .mockResolvedValueOnce(inactiveChannel),
    };
    const mockSelectFrom = {
      where: vi.fn().mockReturnValue(mockSelectWhereLimit),
    };
    const mockSelect = {
      from: vi.fn().mockReturnValue(mockSelectFrom),
    };

    const mockUpdateSet = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    const mockUpdate = {
      set: vi.fn().mockReturnValue(mockUpdateSet),
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    mocks.mockTenantDb.select.mockReturnValue(mockSelect);
    mocks.mockTenantDb.update.mockReturnValue(mockUpdate);
    mocks.mockDb.select.mockReturnValue(mockSelect);
    mocks.mockDb.update.mockReturnValue(mockUpdate);

    const res = await app.request("/settings/channels/telegram/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        botToken: "123456:ABCDEFghijklmnopqrstuvwxyz",
      }),
    });

    expect(res.status).toBe(201);
    expect(mocks.mockTenantDb.update).toHaveBeenCalled();
  });
});

describe("DELETE /settings/channels/:type", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("should soft delete (isActive=false) and return 200", async () => {
    const existingChannel = [
      {
        id: "ch-existing",
        channelType: "whatsapp-cloud",
        encryptedCredentials: "encrypted-creds",
        isActive: true,
        createdAt: new Date(),
      },
    ];

    const mockSelectWhereLimit = {
      limit: vi.fn()
        .mockResolvedValueOnce(existingChannel)
        .mockResolvedValueOnce(existingChannel),
    };
    const mockSelectFrom = {
      where: vi.fn().mockReturnValue(mockSelectWhereLimit),
    };
    const mockSelect = {
      from: vi.fn().mockReturnValue(mockSelectFrom),
    };

    const mockUpdateSet = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    const mockUpdate = {
      set: vi.fn().mockReturnValue(mockUpdateSet),
    };

    mocks.mockTenantDb.select.mockReturnValue(mockSelect);
    mocks.mockTenantDb.update.mockReturnValue(mockUpdate);
    mocks.mockDb.select.mockReturnValue(mockSelect);
    mocks.mockDb.update.mockReturnValue(mockUpdate);

    const res = await app.request("/settings/channels/whatsapp-cloud", {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { disconnected: boolean; channelType: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.disconnected).toBe(true);
    expect(body.data.channelType).toBe("whatsapp-cloud");
    expect(mocks.mockTenantDb.update).toHaveBeenCalled();
    expect(mocks.mockDb.update).toHaveBeenCalled();
  });

  it("should return 404 if channel not found", async () => {
    const mockSelectWhereLimit = {
      limit: vi.fn().mockResolvedValue([]),
    };
    const mockSelectFrom = {
      where: vi.fn().mockReturnValue(mockSelectWhereLimit),
    };
    const mockSelect = {
      from: vi.fn().mockReturnValue(mockSelectFrom),
    };

    mocks.mockTenantDb.select.mockReturnValue(mockSelect);

    const res = await app.request("/settings/channels/nonexistent-channel", {
      method: "DELETE",
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.error.code).toBe("CHANNEL_NOT_FOUND");
  });

  it("should update channel_index in public schema when disconnecting", async () => {
    const existingChannel = [
      {
        id: "ch-existing",
        channelType: "telegram",
        encryptedCredentials: "encrypted-creds",
        isActive: true,
        createdAt: new Date(),
      },
    ];

    const mockSelectWhereLimit = {
      limit: vi.fn()
        .mockResolvedValueOnce(existingChannel)
        .mockResolvedValueOnce(existingChannel),
    };
    const mockSelectFrom = {
      where: vi.fn().mockReturnValue(mockSelectWhereLimit),
    };
    const mockSelect = {
      from: vi.fn().mockReturnValue(mockSelectFrom),
    };

    const mockUpdateSet = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    const mockUpdate = {
      set: vi.fn().mockReturnValue(mockUpdateSet),
    };

    mocks.mockTenantDb.select.mockReturnValue(mockSelect);
    mocks.mockTenantDb.update.mockReturnValue(mockUpdate);
    mocks.mockDb.select.mockReturnValue(mockSelect);
    mocks.mockDb.update.mockReturnValue(mockUpdate);

    const res = await app.request("/settings/channels/telegram", {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    expect(mocks.mockDb.update).toHaveBeenCalled();
  });
});

describe("POST /settings/channels/whatsapp-qr/connect (placeholder)", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("should return 202 with pending status", async () => {
    const res = await app.request("/settings/channels/whatsapp-qr/connect", {
      method: "POST",
    });

    expect(res.status).toBe(202);
    const body = (await res.json()) as {
      success: boolean;
      data: { status: string; message: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("pending");
    expect(body.data.message).toContain("in progress");
  });
});

describe("GET /settings/channels/whatsapp-qr/status (placeholder)", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("should return 200 with QR status pending", async () => {
    const res = await app.request("/settings/channels/whatsapp-qr/status", {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { status: string; message: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("pending");
    expect(body.data.message).toContain("Awaiting");
  });
});

describe("Channel Lifecycle Integration", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("should handle complete flow: list -> connect -> disconnect", async () => {
    // Step 1: List channels (empty)
    const mockSelectWhereLimit = {
      limit: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: "ch-1",
            channelType: "telegram",
            encryptedCredentials: "encrypted-creds",
            isActive: true,
            createdAt: new Date(),
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "ch-1",
            channelType: "telegram",
            encryptedCredentials: "encrypted-creds",
            isActive: true,
            createdAt: new Date(),
          },
        ]),
    };
    const mockSelectFrom = {
      where: vi.fn().mockReturnValue(mockSelectWhereLimit),
    };
    const mockSelect = {
      from: vi.fn().mockReturnValue(mockSelectFrom),
    };

    const mockInsertValues = {
      returning: vi.fn().mockResolvedValue([{ id: "ch-1" }]),
    };
    const mockInsert = {
      values: vi.fn().mockReturnValue(mockInsertValues),
    };

    const mockUpdateSet = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    const mockUpdate = {
      set: vi.fn().mockReturnValue(mockUpdateSet),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    mocks.mockTenantDb.select.mockReturnValue(mockSelect);
    mocks.mockTenantDb.insert.mockReturnValue(mockInsert);
    mocks.mockTenantDb.update.mockReturnValue(mockUpdate);
    mocks.mockDb.select.mockReturnValue(mockSelect);
    mocks.mockDb.insert.mockReturnValue(mockInsert);
    mocks.mockDb.update.mockReturnValue(mockUpdate);

    // List empty
    const listRes1 = await app.request("/settings/channels", { method: "GET" });
    expect(listRes1.status).toBe(200);
    const listBody1 = (await listRes1.json()) as { data: unknown[] };
    expect(listBody1.data).toHaveLength(0);

    // Connect Telegram
    const connectRes = await app.request("/settings/channels/telegram/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        botToken: "123456:ABCDEFghijklmnopqrstuvwxyz",
      }),
    });
    expect(connectRes.status).toBe(201);

    // List should show channel
    const listRes2 = await app.request("/settings/channels", { method: "GET" });
    expect(listRes2.status).toBe(200);

    // Disconnect
    const disconnectRes = await app.request("/settings/channels/telegram", {
      method: "DELETE",
    });
    expect(disconnectRes.status).toBe(200);
  });
});
