import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMercadoPagoWebhookRoutes } from "../../src/routes/webhooks/mercadopago.routes.js";
import { createHmac } from "crypto";

const mockDb = vi.hoisted(() => ({
  transaction: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("../../src/db/drizzle.js", () => ({
  db: mockDb,
}));

function buildApp() {
  const app = new Hono();
  app.route("/webhooks/mercadopago", createMercadoPagoWebhookRoutes());
  return app;
}

function generateMercadoPagoSignature(
  data: Record<string, unknown>,
  timestamp: string,
  requestId: string,
  secret: string
): string {
  const message = `id:${data.id};request-id:${requestId};ts:${timestamp}`;
  const hmac = createHmac("sha256", secret).update(message).digest("hex");
  return `ts=${timestamp},v1=${hmac}`;
}

describe("POST /webhooks/mercadopago", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
    process.env["MP_WEBHOOK_SECRET"] = "test-secret-key";
    process.env["MP_ACCESS_TOKEN"] = "test-access-token";
  });

  it("debería retornar 200 para notificación sin firma válida (si secret configurado)", async () => {
    const res = await app.request("/webhooks/mercadopago", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": "ts=1234567890,v1=invalidsignature",
        "x-request-id": "test-request-id",
      },
      body: JSON.stringify({
        type: "payment",
        action: "payment.created",
        data: { id: "123" },
      }),
    });

    expect(res.status).toBe(200);
  });

  it("debería ignorar notificaciones sin type=payment", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const requestId = "test-request-id";
    const secret = "test-secret-key";
    const data = { id: "123" };

    const signature = generateMercadoPagoSignature(data, timestamp, requestId, secret);

    const res = await app.request("/webhooks/mercadopago", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": signature,
        "x-request-id": requestId,
      },
      body: JSON.stringify({
        type: "merchant_order",
        action: "payment.created",
        data,
      }),
    });

    expect(res.status).toBe(200);
  });

  it("debería ignorar pagos no aprobados", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          id: 123,
          status: "pending",
          external_reference: "test-org-id",
        }),
      })
    ) as any);

    const timestamp = String(Math.floor(Date.now() / 1000));
    const requestId = "test-request-id";
    const secret = "test-secret-key";
    const data = { id: "123" };

    const signature = generateMercadoPagoSignature(data, timestamp, requestId, secret);

    const res = await app.request("/webhooks/mercadopago", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": signature,
        "x-request-id": requestId,
      },
      body: JSON.stringify({
        type: "payment",
        action: "payment.created",
        data,
      }),
    });

    expect(res.status).toBe(200);
  });

  it("debería retornar 200 sin procesar si MP_ACCESS_TOKEN no está configurado", async () => {
    delete process.env["MP_ACCESS_TOKEN"];

    const timestamp = String(Math.floor(Date.now() / 1000));
    const requestId = "test-request-id";
    const secret = "test-secret-key";
    const data = { id: "123" };

    const signature = generateMercadoPagoSignature(data, timestamp, requestId, secret);

    const res = await app.request("/webhooks/mercadopago", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": signature,
        "x-request-id": requestId,
      },
      body: JSON.stringify({
        type: "payment",
        action: "payment.created",
        data,
      }),
    });

    expect(res.status).toBe(200);
  });

  it("debería retornar 200 si el JSON es inválido", async () => {
    const res = await app.request("/webhooks/mercadopago", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": "ts=1234,v1=abc",
        "x-request-id": "test-id",
      },
      body: "invalid json",
    });

    expect(res.status).toBe(200);
  });

  it("debería procesar un pago aprobado y actualizar la base de datos", async () => {
    mockDb.transaction.mockResolvedValue(undefined);

    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          id: 123,
          status: "approved",
          external_reference: "org-uuid-here",
          transaction_amount: 4900,
          currency_id: "ARS",
          date_approved: new Date().toISOString(),
          payer: { id: 456 },
          metadata: { plan: "growth" },
        }),
      })
    ) as any);

    const timestamp = String(Math.floor(Date.now() / 1000));
    const requestId = "test-request-id";
    const secret = "test-secret-key";
    const data = { id: "123" };

    const signature = generateMercadoPagoSignature(data, timestamp, requestId, secret);

    const res = await app.request("/webhooks/mercadopago", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": signature,
        "x-request-id": requestId,
      },
      body: JSON.stringify({
        type: "payment",
        action: "payment.created",
        data,
      }),
    });

    expect(res.status).toBe(200);
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });
});
