import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createInstagramWebhookRoutes } from "../../src/routes/webhooks/instagram-webhook.routes.js";

const mockChannelLookup = {
  findTenantByChannelIdentifier: vi.fn(),
  createServicesForTenant: vi.fn(),
};

vi.mock("../../src/services/channels/InstagramService.js", () => ({
  InstagramService: vi.fn().mockImplementation(() => ({
    handleIncomingInstagramWebhook: vi.fn().mockResolvedValue(null),
  })),
}));

function buildApp() {
  const app = new Hono();
  app.route(
    "/webhooks/instagram",
    createInstagramWebhookRoutes(mockChannelLookup as never, {} as never)
  );
  return app;
}

describe("GET /webhooks/instagram — verificación", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "ig-verify-token");
  });

  it("debería retornar challenge con token correcto", async () => {
    const app = buildApp();
    const res = await app.request(
      "/webhooks/instagram?hub.mode=subscribe&hub.verify_token=ig-verify-token&hub.challenge=chal-999"
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("chal-999");
  });

  it("debería retornar 403 con token incorrecto", async () => {
    const app = buildApp();
    const res = await app.request(
      "/webhooks/instagram?hub.mode=subscribe&hub.verify_token=bad&hub.challenge=chal-999"
    );
    expect(res.status).toBe(403);
  });
});

describe("POST /webhooks/instagram — recepción de mensajes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("META_APP_SECRET", "");
  });

  it("debería retornar 200 para payload no-instagram", async () => {
    const app = buildApp();
    const res = await app.request("/webhooks/instagram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ object: "page", entry: [] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe("ok");
  });

  it("debería buscar tenant por pageId para payloads instagram", async () => {
    mockChannelLookup.findTenantByChannelIdentifier.mockResolvedValueOnce({
      organizationId: "org-1",
      organizationSlug: "acme",
    });

    mockChannelLookup.createServicesForTenant.mockReturnValueOnce({
      inboxService: {},
    });

    const app = buildApp();
    const res = await app.request("/webhooks/instagram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        object: "instagram",
        entry: [
          {
            id: "page-ig-111",
            messaging: [
              {
                sender: { id: "user-ig-123" },
                message: { text: "hola" },
              },
            ],
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    expect(mockChannelLookup.findTenantByChannelIdentifier).toHaveBeenCalledWith(
      "instagram",
      "page-ig-111"
    );
  });

  it("debería continuar si no se encuentra tenant para el pageId", async () => {
    mockChannelLookup.findTenantByChannelIdentifier.mockResolvedValueOnce(null);

    const app = buildApp();
    const res = await app.request("/webhooks/instagram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        object: "instagram",
        entry: [{ id: "unknown-page-id", messaging: [] }],
      }),
    });

    expect(res.status).toBe(200);
    expect(mockChannelLookup.createServicesForTenant).not.toHaveBeenCalled();
  });
});
