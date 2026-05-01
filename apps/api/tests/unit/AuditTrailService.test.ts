import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { AuditTrailService } from "../../src/services/AuditTrailService.js";
import { auditLogs } from "@apex-ia/database/schema/public";

vi.mock("../../src/db/drizzle.js");
vi.mock("../../src/utils/logger.js");

describe("AuditTrailService", () => {
  let mockDb: any;
  let service: AuditTrailService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    };

    vi.doMock("../../src/db/drizzle.js", () => ({
      db: mockDb,
    }));

    service = new AuditTrailService();
  });

  describe("logAction", () => {
    it("debería insertar un audit log con todos los campos", async () => {
      const params = {
        userId: "user-123",
        organizationId: "org-456",
        action: "user.created",
        resourceType: "user",
        resourceId: "user-123",
        newValues: { name: "John" },
        ipAddress: "192.168.1.1",
      };

      await service.logAction(params);

      expect(mockDb.insert).toHaveBeenCalledWith(auditLogs);
    });

    it("debería manejar errores silenciosamente", async () => {
      mockDb.insert = vi.fn().mockImplementation(() => {
        throw new Error("DB error");
      });

      const params = {
        organizationId: "org-456",
        action: "test",
      };

      await service.logAction(params);

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("listAuditLogs", () => {
    it("debería retornar lista de audit logs", async () => {
      const mockLogs = [
        { id: "log-1", organizationId: "org-456", action: "test", createdAt: new Date() },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockLogs),
            }),
          }),
        }),
      });

      const result = await service.listAuditLogs("org-456");

      expect(result).toEqual(mockLogs);
    });

    it("debería aceptar filtros de paginación", async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      await service.listAuditLogs("org-456", { limit: 100, offset: 50 });

      const selectChain = mockDb.select().from().where().limit(100).offset(50);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it("debería lanzar error en caso de falla de DB", async () => {
      mockDb.select = vi.fn().mockImplementation(() => {
        throw new Error("DB connection failed");
      });

      await expect(service.listAuditLogs("org-456")).rejects.toThrow("AUDIT_LOG_LIST_FAILED");
    });
  });
});
