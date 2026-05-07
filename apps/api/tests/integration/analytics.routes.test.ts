import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createAnalyticsRoutes } from "../../src/routes/analytics.routes.js";

const mockAnalyticsMethods = {
  getConversationMetrics: vi.fn(),
  getAgentPerformanceReport: vi.fn(),
  getChannelSlaReport: vi.fn(),
  getVolumeHeatmap: vi.fn(),
  getCsatReport: vi.fn(),
  getAiUsageSummary: vi.fn(),
};

vi.mock("../../src/services/AnalyticsService.js", () => ({
  AnalyticsService: vi.fn().mockImplementation(() => mockAnalyticsMethods),
}));

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("auth", {
      userId: "agent-1",
      organizationId: "org-1",
      organizationSlug: "test-org",
      roleName: "standard",
      permissions: {},
    });
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
      success: boolean;
      data: { totalConversations: number; openConversations: number };
    };
    expect(body.success).toBe(true);
    expect(body.data.totalConversations).toBe(150);
    expect(body.data.openConversations).toBe(50);
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
    const body = (await res.json()) as { success: boolean; data: Array<{ agentId: string }> };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.agentId).toBe("agent-1");
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
    const body = (await res.json()) as { success: boolean; data: Array<{ channel: string }> };
    expect(body.success).toBe(true);
    expect(body.data[0]?.channel).toBe("whatsapp");
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
    const body = (await res.json()) as { success: boolean; data: Array<{ date: string }> };
    expect(body.success).toBe(true);
    expect(body.data[0]?.date).toBe("2026-04-28");
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
    const body = (await res.json()) as { success: boolean; data: { averageCsat: number } };
    expect(body.success).toBe(true);
    expect(body.data.averageCsat).toBe(4.25);
  });
});

describe("GET /analytics/ai-usage", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con resumen de uso de IA", async () => {
    mockAnalyticsMethods.getAiUsageSummary.mockResolvedValueOnce({
      summary: {
        totalRequests: 42,
        totalInputTokens: 5000,
        totalOutputTokens: 3000,
        totalTokens: 8000,
        estimatedCostUsd: 2.5,
        errorRate: 2.38,
      },
      byProvider: [
        {
          provider: "anthropic",
          requests: 30,
          totalTokens: 6000,
          estimatedCostUsd: 1.8,
        },
        {
          provider: "openai",
          requests: 12,
          totalTokens: 2000,
          estimatedCostUsd: 0.7,
        },
      ],
      byModel: [
        {
          model: "claude-haiku-4-5-20251001",
          provider: "anthropic",
          requests: 30,
          totalTokens: 6000,
        },
        {
          model: "gpt-4o-mini",
          provider: "openai",
          requests: 12,
          totalTokens: 2000,
        },
      ],
      dailyTimeline: [
        {
          date: "2026-04-28",
          requests: 20,
          totalTokens: 4000,
        },
        {
          date: "2026-04-29",
          requests: 22,
          totalTokens: 4000,
        },
      ],
    });

    const res = await app.request("/analytics/ai-usage");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: {
        summary: { totalRequests: number };
        byProvider: Array<{ provider: string }>;
      };
    };
    expect(body.success).toBe(true);
    expect(body.data.summary.totalRequests).toBe(42);
    expect(body.data.byProvider).toHaveLength(2);
  });

  it("debería filtrar por fechas correctamente", async () => {
    mockAnalyticsMethods.getAiUsageSummary.mockResolvedValueOnce({
      summary: {
        totalRequests: 10,
        totalInputTokens: 2000,
        totalOutputTokens: 1000,
        totalTokens: 3000,
        estimatedCostUsd: 0.9,
        errorRate: 0,
      },
      byProvider: [],
      byModel: [],
      dailyTimeline: [],
    });

    const startDate = encodeURIComponent("2026-04-01T00:00:00Z");
    const endDate = encodeURIComponent("2026-04-15T23:59:59Z");
    const res = await app.request(
      `/analytics/ai-usage?startDate=${startDate}&endDate=${endDate}`
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: { summary: { totalRequests: number } } };
    expect(body.success).toBe(true);
    expect(body.data.summary.totalRequests).toBe(10);
  });
});
