import { describe, it, expect, beforeEach, vi } from "vitest";
import { BillingService } from "../../src/services/BillingService.js";

const mocks = vi.hoisted(() => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };

  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  };

  return { mockDb, mockLogger };
});

vi.mock("../../src/db/drizzle.js", () => ({
  db: mocks.mockDb,
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: mocks.mockLogger,
}));

describe("BillingService", () => {
  let service: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env["MP_ACCESS_TOKEN"] = "test-token";
    process.env["MP_CURRENCY"] = "ARS";
    process.env["NEXT_PUBLIC_APP_URL"] = "http://localhost:3000";
    service = new BillingService();
  });

  describe("getBillingStatus", () => {
    it("debería calcular correctamente daysLeft cuando el trial está activo", async () => {
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const selectMock = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "org-123",
                plan: "starter",
                trialEndsAt,
              },
            ]),
          }),
        }),
      };

      mocks.mockDb.select.mockReturnValue(selectMock);

      // Mock subscriptions select
      const subSelectMock = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      // Mock payment history select
      const paySelectMock = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      // Set up mock to return different responses for each call
      let callCount = 0;
      mocks.mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return selectMock;
        if (callCount === 2) return subSelectMock;
        return paySelectMock;
      });

      const status = await service.getBillingStatus("org-123");

      expect(status.plan).toBe("starter");
      expect(status.trialStatus.isActive).toBe(true);
      expect(status.trialStatus.daysLeft).toBe(7);
      expect(status.trialStatus.isExpired).toBe(false);
    });

    it("debería marcar trial como expirado cuando trialEndsAt < now", async () => {
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

      const selectMock = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "org-123",
                plan: "starter",
                trialEndsAt,
              },
            ]),
          }),
        }),
      };

      mocks.mockDb.select.mockReturnValue(selectMock);

      const subSelectMock = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      const paySelectMock = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      let callCount = 0;
      mocks.mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return selectMock;
        if (callCount === 2) return subSelectMock;
        return paySelectMock;
      });

      const status = await service.getBillingStatus("org-123");

      expect(status.trialStatus.isActive).toBe(false);
      expect(status.trialStatus.isExpired).toBe(true);
      expect(status.trialStatus.daysLeft).toBe(0);
    });
  });

  describe("createPreapprovalSubscription", () => {
    it("debería lanzar error si MP_ACCESS_TOKEN no está configurado", async () => {
      delete process.env["MP_ACCESS_TOKEN"];

      await expect(
        service.createPreapprovalSubscription("org-123", "growth", "monthly", "org-slug")
      ).rejects.toThrow("MP_ACCESS_TOKEN not configured");
    });
  });

  describe("cancelSubscription", () => {
    it("debería lanzar error si MP_ACCESS_TOKEN no está configurado", async () => {
      delete process.env["MP_ACCESS_TOKEN"];

      await expect(service.cancelSubscription("org-123")).rejects.toThrow(
        "MP_ACCESS_TOKEN not configured"
      );
    });
  });
});
