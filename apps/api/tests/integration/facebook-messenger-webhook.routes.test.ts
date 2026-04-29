import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createFacebookMessengerWebhookRoutes } from "../../src/routes/webhooks/facebook-messenger-webhook.routes.js";
import { createHmac } from "crypto";

const mockChannelLookup = {
  findTenantByChannelIdentifier: vi.fn(),
  createServicesForTenant: vi.fn(),
};

vi.mock("../../src/services/channels/FacebookMessengerService.js", () => ({
  FacebookMessengerService: vi.fn().mockImplementation(() => ({
    handleIncomingMessengerWebhook: vi.fn().mockResolvedValue(null),
  })),
}));

vi.mock("../../src/socket/socketServer.js", () => ({
  emitNewMessage: vi.fn(),
}));

function buildApp() {
  const app = new Hono();
  app.route(
    "/webhooks/facebook",
    createFacebookMessengerWebhookRoutes(mockChannelLookup as never, {} as never)
  );
  return app;
}

describe("GET /webhooks/facebook — verificación de webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("FACEBOOK_VERIFY_TOKEN", "my-fb-verify-token");
  });

  it("debería retornar el challenge si el token es correcto", async () => {
    const app = buildApp();
    const res = await app.request(
      "/webhooks/facebook?hub.mode=subscribe&hub.verify_token=my-fb-verify-token&hub.challenge=challenge-fb-123"
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("challenge-fb-123");
  });

  it("debería retornar 403 si el token es incorrecto", async () => {
    const app = buildApp();
    const res = await app.request(
      "/webhooks/facebook?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=challenge-fb-123"
    );
    expect(res.status).toBe(403);
  });

  it("debería retornar 403 si falta el verify_token", async () => {
    const app = buildApp();
    const res = await app.request(
      "/webhooks/facebook?hub.mode=subscribe&hub.challenge=challenge-fb-123"
    );
    expect(res.status).toBe(403);
  });

  it("debería retornar 403 si el mode no es 'subscribe'", async () => {
    const app = buildApp();
    const res = await app.request(
      "/webhooks/facebook?hub.mode=validate&hub.verify_token=my-fb-verify-token&hub.challenge=challenge-fb-123"
    );
    expect(res.status).toBe(403);
  });
});

describe("POST /webhooks/facebook — recepción de mensajes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("META_APP_SECRET", "test-app-secret");
  });

  it("debería retornar 200 y status ok para payloads no-page", async () => {
    const app = buildApp();
    const payload = { object: "instagram", entry: [] };
    const rawBody = JSON.stringify(payload);
    const signature = `sha256=${createHmac("sha256", "test-app-secret").update(rawBody).digest("hex")}`;

    const res = await app.request("/webhooks/facebook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: rawBody,
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe("ok");
  });

  it("debería rechazar webhook con firma HMAC inválida", async () => {
    const app = buildApp();
    const payload = {
      object: "page",
      entry: [
        {
          id: "page-123",
          time: Date.now(),
          messaging: [
            {
              sender: { id: "user-456" },
              recipient: { id: "page-123" },
              timestamp: Date.now(),
              message: { mid: "msg-789", text: "Hola desde FB" },
            },
          ],
        },
      ],
    };
    const rawBody = JSON.stringify(payload);
    const wrongSignature = "sha256=invalidsignature";

    const res = await app.request("/webhooks/facebook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": wrongSignature,
      },
      body: rawBody,
    });

    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Forbidden");
  });

  it("debería procesar payload de messenger válido y buscar tenant", async () => {
    const { FacebookMessengerService } = await import(
      "../../src/services/channels/FacebookMessengerService.js"
    );
    const mockFbService = vi.mocked(FacebookMessengerService).mock.results[0]?.value;

    mockChannelLookup.findTenantByChannelIdentifier.mockResolvedValueOnce({
      organizationId: "org-1",
      organizationSlug: "acme-corp",
    });

    mockChannelLookup.createServicesForTenant.mockReturnValueOnce({
      inboxService: {},
    });

    if (mockFbService) {
      vi.mocked(mockFbService.handleIncomingMessengerWebhook).mockResolvedValueOnce(null);
    }

    const payload = {
      object: "page",
      entry: [
        {
          id: "page-123",
          time: Date.now(),
          messaging: [
            {
              sender: { id: "user-456" },
              recipient: { id: "page-123" },
              timestamp: Date.now(),
              message: { mid: "msg-789", text: "Hola desde Facebook Messenger" },
            },
          ],
        },
      ],
    };

    const rawBody = JSON.stringify(payload);
    const signature = `sha256=${createHmac("sha256", "test-app-secret").update(rawBody).digest("hex")}`;

    const app = buildApp();
    const res = await app.request("/webhooks/facebook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: rawBody,
    });

    expect(res.status).toBe(200);
    expect(mockChannelLookup.findTenantByChannelIdentifier).toHaveBeenCalledWith(
      "facebook",
      "page-123"
    );
  });

  it("debería crear conversación y emitir mensaje via Socket.IO cuando service retorna resultado", async () => {
    const { FacebookMessengerService } = await import(
      "../../src/services/channels/FacebookMessengerService.js"
    );
    const { emitNewMessage } = await import(
      "../../src/socket/socketServer.js"
    );

    const mockFbService = vi.mocked(FacebookMessengerService).mock.results[0]?.value;
    const mockEmit = vi.mocked(emitNewMessage);

    mockChannelLookup.findTenantByChannelIdentifier.mockResolvedValueOnce({
      organizationId: "org-1",
      organizationSlug: "acme-corp",
    });

    mockChannelLookup.createServicesForTenant.mockReturnValueOnce({
      inboxService: {},
    });

    const conversationResult = {
      conversationId: "conv-999",
      message: {
        id: "msg-789",
        text: "Hola desde Facebook",
        channel: "facebook",
      },
    };

    if (mockFbService) {
      vi.mocked(mockFbService.handleIncomingMessengerWebhook).mockResolvedValueOnce(
        conversationResult
      );
    }

    const payload = {
      object: "page",
      entry: [
        {
          id: "page-123",
          time: Date.now(),
          messaging: [
            {
              sender: { id: "user-456" },
              recipient: { id: "page-123" },
              timestamp: Date.now(),
              message: {
                mid: "msg-789",
                text: "Hola desde Facebook",
                attachments: [],
              },
            },
          ],
        },
      ],
    };

    const rawBody = JSON.stringify(payload);
    const signature = `sha256=${createHmac("sha256", "test-app-secret").update(rawBody).digest("hex")}`;

    const app = buildApp();
    const res = await app.request("/webhooks/facebook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: rawBody,
    });

    expect(res.status).toBe(200);
    expect(mockEmit).toHaveBeenCalledWith(
      {},
      "conv-999",
      "acme-corp",
      conversationResult.message
    );
  });

  it("debería continuar si no se encuentra tenant para el pageId", async () => {
    mockChannelLookup.findTenantByChannelIdentifier.mockResolvedValueOnce(null);

    const payload = {
      object: "page",
      entry: [
        {
          id: "unknown-page-id",
          time: Date.now(),
          messaging: [
            {
              sender: { id: "user-456" },
              recipient: { id: "unknown-page-id" },
              timestamp: Date.now(),
              message: { mid: "msg-789", text: "Hola" },
            },
          ],
        },
      ],
    };

    const rawBody = JSON.stringify(payload);
    const signature = `sha256=${createHmac("sha256", "test-app-secret").update(rawBody).digest("hex")}`;

    const app = buildApp();
    const res = await app.request("/webhooks/facebook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: rawBody,
    });

    expect(res.status).toBe(200);
    expect(mockChannelLookup.createServicesForTenant).not.toHaveBeenCalled();
  });

  it("debería procesar múltiples eventos de messenger en una sola entrada", async () => {
    const { FacebookMessengerService } = await import(
      "../../src/services/channels/FacebookMessengerService.js"
    );
    const mockFbService = vi.mocked(FacebookMessengerService).mock.results[0]?.value;

    mockChannelLookup.findTenantByChannelIdentifier.mockResolvedValueOnce({
      organizationId: "org-1",
      organizationSlug: "acme",
    });

    mockChannelLookup.createServicesForTenant.mockReturnValueOnce({
      inboxService: {},
    });

    if (mockFbService) {
      vi.mocked(mockFbService.handleIncomingMessengerWebhook).mockResolvedValueOnce(
        {
          conversationId: "conv-123",
          message: { id: "msg-1", text: "Primer mensaje" },
        }
      );
    }

    const payload = {
      object: "page",
      entry: [
        {
          id: "page-123",
          time: Date.now(),
          messaging: [
            {
              sender: { id: "user-456" },
              recipient: { id: "page-123" },
              timestamp: Date.now(),
              message: { mid: "msg-1", text: "Primer mensaje" },
            },
            {
              sender: { id: "user-456" },
              recipient: { id: "page-123" },
              timestamp: Date.now() + 1000,
              message: { mid: "msg-2", text: "Segundo mensaje" },
            },
          ],
        },
      ],
    };

    const rawBody = JSON.stringify(payload);
    const signature = `sha256=${createHmac("sha256", "test-app-secret").update(rawBody).digest("hex")}`;

    const app = buildApp();
    const res = await app.request("/webhooks/facebook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: rawBody,
    });

    expect(res.status).toBe(200);
    expect(mockFbService?.handleIncomingMessengerWebhook).toHaveBeenCalled();
  });

  it("debería ignorar entries sin pageId", async () => {
    const payload = {
      object: "page",
      entry: [
        {
          time: Date.now(),
          messaging: [
            {
              sender: { id: "user-456" },
              message: { mid: "msg-789", text: "Hola" },
            },
          ],
        },
      ],
    };

    const rawBody = JSON.stringify(payload);
    const signature = `sha256=${createHmac("sha256", "test-app-secret").update(rawBody).digest("hex")}`;

    const app = buildApp();
    const res = await app.request("/webhooks/facebook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: rawBody,
    });

    expect(res.status).toBe(200);
    expect(mockChannelLookup.findTenantByChannelIdentifier).not.toHaveBeenCalled();
  });

  it("debería manejar webhook con META_APP_SECRET vacío (skip signature check)", async () => {
    vi.stubEnv("META_APP_SECRET", "");

    mockChannelLookup.findTenantByChannelIdentifier.mockResolvedValueOnce({
      organizationId: "org-1",
      organizationSlug: "acme",
    });

    mockChannelLookup.createServicesForTenant.mockReturnValueOnce({
      inboxService: {},
    });

    const { FacebookMessengerService } = await import(
      "../../src/services/channels/FacebookMessengerService.js"
    );
    const mockFbService = vi.mocked(FacebookMessengerService).mock.results[0]?.value;

    if (mockFbService) {
      vi.mocked(mockFbService.handleIncomingMessengerWebhook).mockResolvedValueOnce(null);
    }

    const payload = {
      object: "page",
      entry: [
        {
          id: "page-123",
          time: Date.now(),
          messaging: [
            {
              sender: { id: "user-456" },
              message: { mid: "msg-789", text: "Sin verificar firma" },
            },
          ],
        },
      ],
    };

    const app = buildApp();
    const res = await app.request("/webhooks/facebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    expect(mockChannelLookup.findTenantByChannelIdentifier).toHaveBeenCalledWith(
      "facebook",
      "page-123"
    );
  });
});
