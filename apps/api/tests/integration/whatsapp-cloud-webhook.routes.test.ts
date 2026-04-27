import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createWhatsAppCloudWebhookRoutes } from "../../src/routes/webhooks/whatsapp-cloud-webhook.routes.js";

const mockChannelLookup = {
  findTenantByChannelIdentifier: vi.fn(),
  createServicesForTenant: vi.fn(),
};

vi.mock("../../src/services/channels/WhatsAppCloudApiService.js", () => ({
  WhatsAppCloudApiService: vi.fn().mockImplementation(() => ({
    handleIncomingWhatsAppWebhook: vi.fn(),
  })),
}));

vi.mock("../../src/socket/socketServer.js", () => ({
  emitNewMessage: vi.fn(),
}));

function buildApp() {
  const app = new Hono();
  app.route(
    "/webhooks/whatsapp",
    createWhatsAppCloudWebhookRoutes(mockChannelLookup as never, {} as never)
  );
  return app;
}

describe("GET /webhooks/whatsapp — verificación de webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "my-secret-token");
  });

  it("debería retornar el challenge si el token es correcto", async () => {
    const app = buildApp();
    const res = await app.request(
      "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=my-secret-token&hub.challenge=challenge-123"
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("challenge-123");
  });

  it("debería retornar 403 si el token es incorrecto", async () => {
    const app = buildApp();
    const res = await app.request(
      "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=challenge-123"
    );
    expect(res.status).toBe(403);
  });
});

describe("POST /webhooks/whatsapp — recepción de mensajes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("META_APP_SECRET", "");
  });

  it("debería retornar 200 y status ok para payloads no-whatsapp", async () => {
    const app = buildApp();
    const res = await app.request("/webhooks/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ object: "page", entry: [] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe("ok");
  });

  it("debería procesar payload whatsapp y buscar tenant", async () => {
    const { WhatsAppCloudApiService } = await import(
      "../../src/services/channels/WhatsAppCloudApiService.js"
    );
    const mockWaService = vi.mocked(WhatsAppCloudApiService).mock.results[0]?.value;

    mockChannelLookup.findTenantByChannelIdentifier.mockResolvedValueOnce({
      organizationId: "org-1",
      organizationSlug: "acme",
    });

    mockChannelLookup.createServicesForTenant.mockReturnValueOnce({
      inboxService: {},
      conversationService: {},
    });

    if (mockWaService) {
      vi.mocked(mockWaService.handleIncomingWhatsAppWebhook).mockResolvedValueOnce(null);
    }

    const app = buildApp();
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "entry-1",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: { phone_number_id: "123456789" },
                messages: [],
              },
            },
          ],
        },
      ],
    };

    const res = await app.request("/webhooks/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    expect(mockChannelLookup.findTenantByChannelIdentifier).toHaveBeenCalledWith(
      "whatsapp",
      "123456789"
    );
  });
});
