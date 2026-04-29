import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnalyticsService } from "../../src/services/AnalyticsService.js";

const mockDb = {
  select: vi.fn(),
};

vi.mock("../../src/utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("AnalyticsService", () => {
  let service: AnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AnalyticsService(mockDb as never);
  });

  describe("error handling", () => {
    it("should throw METRICS_FETCH_FAILED on error", async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error("DB error");
      });

      await expect(service.getConversationMetrics("org-1")).rejects.toThrow(
        "METRICS_FETCH_FAILED"
      );
    });

    it("should throw AGENT_PERFORMANCE_FETCH_FAILED on error", async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error("DB error");
      });

      await expect(service.getAgentPerformanceReport("org-1")).rejects.toThrow(
        "AGENT_PERFORMANCE_FETCH_FAILED"
      );
    });

    it("should throw CHANNEL_SLA_FETCH_FAILED on error", async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error("DB error");
      });

      await expect(service.getChannelSlaReport("org-1")).rejects.toThrow(
        "CHANNEL_SLA_FETCH_FAILED"
      );
    });

    it("should throw VOLUME_HEATMAP_FETCH_FAILED on error", async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error("DB error");
      });

      await expect(
        service.getVolumeHeatmap("org-1", {
          startDate: new Date("2026-04-01"),
          endDate: new Date("2026-04-30"),
        })
      ).rejects.toThrow("VOLUME_HEATMAP_FETCH_FAILED");
    });

    it("should throw CSAT_REPORT_FETCH_FAILED on error", async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error("DB error");
      });

      await expect(service.getCsatReport("org-1")).rejects.toThrow(
        "CSAT_REPORT_FETCH_FAILED"
      );
    });
  });

  describe("service initialization", () => {
    it("should create service with database", () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AnalyticsService);
    });

    it("should have all required methods", () => {
      expect(typeof service.getConversationMetrics).toBe("function");
      expect(typeof service.getAgentPerformanceReport).toBe("function");
      expect(typeof service.getChannelSlaReport).toBe("function");
      expect(typeof service.getVolumeHeatmap).toBe("function");
      expect(typeof service.getCsatReport).toBe("function");
    });
  });
});
