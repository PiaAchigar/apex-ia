import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createBillingRoutes } from "../../src/routes/billing.routes.js";

const mockAuthContext = {
  organizationId: "test-org-123",
  userId: "test-user-456",
};

const mockAuthMiddleware = vi.hoisted(() => async (_c: unknown, next: () => Promise<void>) => {
  const c = _c as any;
  c.set("auth", mockAuthContext);
  await next();
});

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: mockAuthMiddleware,
}));

const mockBillingService = vi.hoisted(() => ({
  getBillingStatus: vi.fn(),
  createPreapprovalSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
}));

vi.mock("../../src/services/BillingService.js", () => ({
  billingService: mockBillingService,
}));

function buildApp() {
  const app = new Hono();
  app.route("/billing", createBillingRoutes());
  return app;
}

describe("GET /billing/status", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con status de billing", async () => {
    mockBillingService.getBillingStatus.mockResolvedValue({
      plan: "starter",
      trialStatus: {
        isActive: true,
        daysLeft: 7,
        isExpired: false,
        endsAt: new Date(),
      },
      subscription: null,
      paymentHistory: [],
    });

    const res = await app.request("/billing/status", {
      method: "GET",
      headers: { Authorization: "Bearer test-token" },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.plan).toBe("starter");
    expect(body.data.trialStatus.daysLeft).toBe(7);
  });

  it("debería retornar 500 en caso de error", async () => {
    mockBillingService.getBillingStatus.mockRejectedValue(new Error("Test error"));

    const res = await app.request("/billing/status", {
      method: "GET",
      headers: { Authorization: "Bearer test-token" },
    });

    expect(res.status).toBe(500);
  });
});

describe("POST /billing/subscribe", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con checkoutUrl cuando la suscripción se crea", async () => {
    mockBillingService.createPreapprovalSubscription.mockResolvedValue({
      checkoutUrl: "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=test",
      mpSubscriptionId: "test-sub-123",
    });

    const res = await app.request("/billing/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({
        planId: "growth",
        billingPeriod: "monthly",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.checkoutUrl).toContain("mercadopago");
  });

  it("debería retornar 400 si planId es inválido", async () => {
    const res = await app.request("/billing/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({
        planId: "invalid-plan",
        billingPeriod: "monthly",
      }),
    });

    expect(res.status).toBe(400);
  });

  it("debería retornar 400 si billingPeriod es inválido", async () => {
    const res = await app.request("/billing/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({
        planId: "growth",
        billingPeriod: "quarterly",
      }),
    });

    expect(res.status).toBe(400);
  });

  it("debería retornar 500 en caso de error", async () => {
    mockBillingService.createPreapprovalSubscription.mockRejectedValue(
      new Error("MP API error")
    );

    const res = await app.request("/billing/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({
        planId: "growth",
        billingPeriod: "monthly",
      }),
    });

    expect(res.status).toBe(500);
  });
});

describe("DELETE /billing/subscription", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 cuando la suscripción se cancela", async () => {
    mockBillingService.cancelSubscription.mockResolvedValue(undefined);

    const res = await app.request("/billing/subscription", {
      method: "DELETE",
      headers: { Authorization: "Bearer test-token" },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
  });

  it("debería retornar 500 en caso de error", async () => {
    mockBillingService.cancelSubscription.mockRejectedValue(new Error("Test error"));

    const res = await app.request("/billing/subscription", {
      method: "DELETE",
      headers: { Authorization: "Bearer test-token" },
    });

    expect(res.status).toBe(500);
  });
});
