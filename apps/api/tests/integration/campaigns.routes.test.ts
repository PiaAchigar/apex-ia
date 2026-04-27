import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createCampaignsRoutes } from "../../src/routes/campaigns.routes.js";

const mockCampaignMethods = {
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  getCampaigns: vi.fn(),
  getCampaignById: vi.fn(),
  scheduleCampaign: vi.fn(),
  pauseCampaign: vi.fn(),
  resumeCampaign: vi.fn(),
  cancelCampaign: vi.fn(),
  getCampaignMetrics: vi.fn(),
};

vi.mock("../../src/services/CampaignService.js", () => ({
  CampaignService: vi.fn().mockImplementation(() => mockCampaignMethods),
}));

vi.mock("../../src/queues/campaignQueue.js", () => ({
  getCampaignQueue: vi.fn().mockReturnValue({ add: vi.fn().mockResolvedValue({ id: "job-1" }) }),
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
        roleId: "admin-role-uuid", roleName: "admin", permissions: {},
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

const sampleCampaign = {
  id: "camp-1",
  name: "Black Friday",
  channel: "whatsapp",
  messageContent: "Oferta especial!",
  status: "draft",
  targetCount: 0,
  sentCount: 0,
  failedCount: 0,
  scheduledAt: null,
  completedAt: null,
  createdAt: new Date().toISOString(),
};

function buildApp() {
  const app = new Hono();
  app.route("/campaigns", createCampaignsRoutes());
  return app;
}

describe("GET /campaigns", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con lista de campañas", async () => {
    mockCampaignMethods.getCampaigns.mockResolvedValueOnce([sampleCampaign]);

    const res = await app.request("/campaigns");

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe("POST /campaigns", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 201 con la campaña creada", async () => {
    mockCampaignMethods.createCampaign.mockResolvedValueOnce(sampleCampaign);

    const res = await app.request("/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Black Friday",
        channel: "whatsapp",
        messageContent: "Oferta especial!",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: { id: string } };
    expect(body.data.id).toBe("camp-1");
  });

  it("debería retornar 400 si falta messageContent", async () => {
    const res = await app.request("/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Sin contenido", channel: "whatsapp" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /campaigns/:campaignId", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con la campaña por id", async () => {
    mockCampaignMethods.getCampaignById.mockResolvedValueOnce(sampleCampaign);

    const res = await app.request("/campaigns/camp-1");

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { id: string } };
    expect(body.data.id).toBe("camp-1");
  });

  it("debería retornar 404 si la campaña no existe", async () => {
    mockCampaignMethods.getCampaignById.mockRejectedValueOnce(new Error("CAMPAIGN_NOT_FOUND"));

    const res = await app.request("/campaigns/ghost");

    expect(res.status).toBe(404);
  });
});

describe("POST /campaigns/:campaignId/schedule", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería programar la campaña y retornar 200", async () => {
    const scheduledAt = new Date(Date.now() + 3600000).toISOString();
    mockCampaignMethods.scheduleCampaign.mockResolvedValueOnce({
      ...sampleCampaign,
      status: "scheduled",
      scheduledAt,
    });

    const res = await app.request("/campaigns/camp-1/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { status: string } };
    expect(body.data.status).toBe("scheduled");
  });

  it("debería retornar 409 si la campaña no es schedulable", async () => {
    mockCampaignMethods.scheduleCampaign.mockRejectedValueOnce(
      new Error("CAMPAIGN_NOT_SCHEDULABLE")
    );

    const res = await app.request("/campaigns/camp-1/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt: new Date().toISOString() }),
    });

    expect(res.status).toBe(409);
  });
});

describe("GET /campaigns/:campaignId/metrics", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar métricas de la campaña", async () => {
    mockCampaignMethods.getCampaignMetrics.mockResolvedValueOnce({
      campaignId: "camp-1",
      status: "running",
      targetCount: 100,
      sentCount: 50,
      failedCount: 5,
      pendingCount: 45,
      deliveryRate: 50,
    });

    const res = await app.request("/campaigns/camp-1/metrics");

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { deliveryRate: number } };
    expect(body.data.deliveryRate).toBe(50);
  });
});
