import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPlanLimit,
  isWithinPlanLimit,
  getPlanLimitExceededMessage,
  checkPlanLimitBeforeAction,
} from "../../src/utils/planLimits.js";

const mocks = vi.hoisted(() => {
  return {
    mockDb: {
      select: vi.fn(),
    },
    mockTenantDb: {
      select: vi.fn(),
    },
    mockDatabaseProvider: {
      getClientDrizzle: vi.fn(),
    },
  };
});

vi.mock("../../src/db/drizzle.js", () => ({
  db: mocks.mockDb,
}));

vi.mock("../../src/db/database-provider.js", () => ({
  databaseProvider: mocks.mockDatabaseProvider,
}));

describe("planLimits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPlanLimit", () => {
    it("debería retornar 3 para flows en starter", () => {
      const limit = getPlanLimit("starter", "flows");
      expect(limit).toBe(3);
    });

    it("debería retornar Infinity para flows en growth", () => {
      const limit = getPlanLimit("growth", "flows");
      expect(limit).toBe(Infinity);
    });

    it("debería retornar 2 para channels en starter", () => {
      const limit = getPlanLimit("starter", "channels");
      expect(limit).toBe(2);
    });

    it("debería retornar 5 para team_members en growth", () => {
      const limit = getPlanLimit("growth", "team_members");
      expect(limit).toBe(5);
    });
  });

  describe("isWithinPlanLimit", () => {
    it("debería retornar true cuando current < limit", () => {
      const result = isWithinPlanLimit("starter", "flows", 2);
      expect(result).toBe(true);
    });

    it("debería retornar false cuando current >= limit", () => {
      const result = isWithinPlanLimit("starter", "flows", 3);
      expect(result).toBe(false);
    });

    it("debería retornar true cuando current < Infinity", () => {
      const result = isWithinPlanLimit("growth", "flows", 1000);
      expect(result).toBe(true);
    });
  });

  describe("getPlanLimitExceededMessage", () => {
    it("debería retornar mensaje para flows", () => {
      const msg = getPlanLimitExceededMessage("flows");
      expect(msg).toContain("flows");
      expect(msg.length).toBeGreaterThan(0);
    });

    it("debería retornar mensaje para channels", () => {
      const msg = getPlanLimitExceededMessage("channels");
      expect(msg).toContain("canales");
      expect(msg.length).toBeGreaterThan(0);
    });

    it("debería retornar mensaje para team_members", () => {
      const msg = getPlanLimitExceededMessage("team_members");
      expect(msg).toContain("equipo");
      expect(msg.length).toBeGreaterThan(0);
    });
  });

  describe("checkPlanLimitBeforeAction", () => {
    it("debería retornar allowed true cuando current < limit", async () => {
      const mockOrgId = "org-1";

      // Mock db.select() para organizations
      mocks.mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ plan: "starter" }]),
        }),
      });

      // Mock tenantDb para flows
      mocks.mockTenantDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });

      mocks.mockDatabaseProvider.getClientDrizzle.mockResolvedValue(
        mocks.mockTenantDb
      );

      const result = await checkPlanLimitBeforeAction(mockOrgId, "flows");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(3);
      expect(result.current).toBe(2);
    });

    it("debería retornar allowed false cuando current >= limit", async () => {
      const mockOrgId = "org-1";

      mocks.mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ plan: "starter" }]),
        }),
      });

      mocks.mockTenantDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      });

      mocks.mockDatabaseProvider.getClientDrizzle.mockResolvedValue(
        mocks.mockTenantDb
      );

      const result = await checkPlanLimitBeforeAction(mockOrgId, "flows");

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(3);
      expect(result.current).toBe(3);
    });

    it("debería retornar limit -1 para plan Infinity", async () => {
      const mockOrgId = "org-1";

      mocks.mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ plan: "business" }]),
        }),
      });

      mocks.mockTenantDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1000 }]),
        }),
      });

      mocks.mockDatabaseProvider.getClientDrizzle.mockResolvedValue(
        mocks.mockTenantDb
      );

      const result = await checkPlanLimitBeforeAction(mockOrgId, "flows");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
      expect(result.current).toBe(1000);
    });

    it("debería contar team_members desde public schema", async () => {
      const mockOrgId = "org-1";

      mocks.mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ plan: "starter" }]),
        }),
      });

      // Re-mock para el team_members count
      mocks.mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ plan: "starter" }]),
        }),
      });

      mocks.mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });

      const result = await checkPlanLimitBeforeAction(
        mockOrgId,
        "team_members"
      );

      expect(result.limit).toBe(1);
      expect(result.current).toBe(1);
      expect(result.allowed).toBe(false);
    });
  });
});
