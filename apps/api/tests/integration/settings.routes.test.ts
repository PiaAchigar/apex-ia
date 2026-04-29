import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createSettingsRoutes } from "../../src/routes/settings.routes.js";

const mockEmailServiceMethods = {
  configureSmtp: vi.fn(),
  testSmtpConnection: vi.fn(),
  handleIncomingEmail: vi.fn(),
};

vi.mock("../../src/services/channels/EmailService.js", () => ({
  EmailService: vi.fn().mockImplementation(() => mockEmailServiceMethods),
}));

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("auth", { userId: "agent-1", organizationId: "org-1" });
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
  app.route("/settings", createSettingsRoutes({} as never, {} as never));
  return app;
}

describe("POST /settings/channels/email/configure", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería guardar la configuración SMTP y retornar 200", async () => {
    mockEmailServiceMethods.configureSmtp.mockResolvedValueOnce(undefined);

    const res = await app.request("/settings/channels/email/configure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "smtp",
        config: {
          host: "smtp.gmail.com",
          port: 587,
          user: "test@gmail.com",
          pass: "password123",
          fromName: "My App",
        },
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("debería retornar 400 si faltan campos requeridos", async () => {
    const res = await app.request("/settings/channels/email/configure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "smtp",
        config: {
          host: "smtp.gmail.com",
          // port falta
          user: "test@gmail.com",
          pass: "password123",
        },
      }),
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /settings/channels/email/test", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería probar la conexión SMTP y retornar 200 con success: true", async () => {
    mockEmailServiceMethods.testSmtpConnection.mockResolvedValueOnce({
      success: true,
    });

    const res = await app.request("/settings/channels/email/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: "smtp.gmail.com",
        port: 587,
        user: "test@gmail.com",
        pass: "password123",
        fromName: "My App",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("debería retornar success: false si la conexión falla", async () => {
    mockEmailServiceMethods.testSmtpConnection.mockResolvedValueOnce({
      success: false,
      error: "Authentication failed",
    });

    const res = await app.request("/settings/channels/email/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: "invalid.host",
        port: 587,
        user: "wrong@gmail.com",
        pass: "wrongpass",
        fromName: "App",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; error?: string };
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });
});

describe("POST /webhooks/email", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería crear una conversación a partir de un email entrante y retornar 200", async () => {
    mockEmailServiceMethods.handleIncomingEmail.mockResolvedValueOnce({
      conversationId: "conv-1",
      messageId: "msg-1",
    });

    const res = await app.request("/webhooks/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "customer@example.com",
        to: "myapp@example.com",
        subject: "Support Request",
        html: "<p>I need help</p>",
        text: "I need help",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });
});
