import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createAnalyticsRoutes } from "../../src/routes/analytics.routes.js";

const mockAnalyticsMethods = {
  getConversationMetrics: vi.fn(),
  getAgentPerformanceReport: vi.fn(),
  getChannelSlaReport: vi.fn(),
  getVolumeHeatmap: vi.fn(),
  getCsatReport: vi.fn(),
};

vi.mock("../../src/services/AnalyticsService.js", () => ({
  AnalyticsService: vi.fn().mockImplementation(() => mockAnalyticsMethods),
}));

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("auth", { userId: "agent-1", organizationId: "org-1" });
    c.set("organizationId", "org-1");
    await next();
  }),
}));

vi.mock("../../src/middleware/tenantMiddleware.js", () => ({
  tenantMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("tenantDb", {});
    await next();
  }),
}));

vi.mock("../../src/db/database-provider.js", () => ({
  databaseProvider: {
    getClientDrizzle: vi.fn().mockResolvedValue({}),
  },
}));

function buildApp() {
  const app = new Hono();
  app.route("/analytics", createAnalyticsRoutes());
  return app;
}

describe("GET /analytics/conversations", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con métricas de conversaciones", async () => {
    mockAnalyticsMethods.getConversationMetrics.mockResolvedValueOnce({
      totalConversations: 150,
      openConversations: 50,
      closedConversations: 100,
      byChannel: { whatsapp: 100, email: 50 },
      avgMessagesPerConversation: 3,
    });

    const res = await app.request("/analytics/conversations");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      totalConversations: number;
      openConversations: number;
    };
    expect(body.totalConversations).toBe(150);
    expect(body.openConversations).toBe(50);
  });
});

describe("GET /analytics/agents", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con reporte de agentes", async () => {
    mockAnalyticsMethods.getAgentPerformanceReport.mockResolvedValueOnce([
      {
        agentId: "agent-1",
        assignedConversations: 25,
        messagesHandled: 150,
        avgResponseTimeMinutes: 5,
      },
    ]);

    const res = await app.request("/analytics/agents");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ agentId: string }>;
    expect(body).toHaveLength(1);
    expect(body[0]?.agentId).toBe("agent-1");
  });
});

describe("GET /analytics/channels-sla", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con reporte SLA", async () => {
    mockAnalyticsMethods.getChannelSlaReport.mockResolvedValueOnce([
      {
        channel: "whatsapp",
        totalConversations: 200,
        avgResponseTimeMinutes: 3,
        avgResolutionTimeHours: 24,
        slaCompliancePercentage: 95,
      },
    ]);

    const res = await app.request("/analytics/channels-sla");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ channel: string }>;
    expect(body[0]?.channel).toBe("whatsapp");
  });
});

describe("GET /analytics/volume-heatmap", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 400 sin fechas", async () => {
    const res = await app.request("/analytics/volume-heatmap");
    expect(res.status).toBe(400);
  });

  it("debería retornar 200 con heatmap", async () => {
    mockAnalyticsMethods.getVolumeHeatmap.mockResolvedValueOnce([
      {
        date: "2026-04-28",
        hour: 9,
        channel: "whatsapp",
        messageCount: 50,
      },
    ]);

    const startDate = encodeURIComponent("2026-04-01T00:00:00Z");
    const endDate = encodeURIComponent("2026-04-30T23:59:59Z");
    const res = await app.request(
      `/analytics/volume-heatmap?startDate=${startDate}&endDate=${endDate}`
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ date: string }>;
    expect(body[0]?.date).toBe("2026-04-28");
  });
});

describe("GET /analytics/csat", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con reporte CSAT", async () => {
    mockAnalyticsMethods.getCsatReport.mockResolvedValueOnce({
      averageCsat: 4.25,
      totalRatings: 4,
      byRating: { 3: 1, 4: 1, 5: 2 },
      byChannel: {
        whatsapp: 4.25,
        instagram: 4.25,
        facebook: 4.25,
        email: 4.25,
        telegram: 4.25,
      },
    });

    const res = await app.request("/analytics/csat");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { averageCsat: number };
    expect(body.averageCsat).toBe(4.25);
  });
});
