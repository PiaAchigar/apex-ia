import { describe, it, expect, beforeEach, vi } from "vitest";
import { BackupService } from "../../src/services/BackupService.js";

describe("BackupService", () => {
  let mockTenantDb: any;
  let mockSupabaseAdmin: any;
  let service: BackupService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTenantDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(Promise.resolve([])),
      }),
    };

    mockSupabaseAdmin = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          download: vi.fn().mockResolvedValue({ data: new Uint8Array(), error: null }),
          remove: vi.fn().mockResolvedValue({ error: null }),
        }),
      },
    };

    service = new BackupService(mockTenantDb, mockSupabaseAdmin);
  });

  describe("createBackup", () => {
    it("debería crear un backup exitosamente", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnValue({
          then: vi.fn().mockResolvedValue([]),
        }),
      };

      mockTenantDb.select.mockReturnValue(mockSelectChain);

      const result = await service.createBackup("org-123");

      expect(result).toBeDefined();
      expect(result.organizationId).toBe("org-123");
    });

    it("debería lanzar error si falla el upload", async () => {
      mockSupabaseAdmin.storage.from = vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: new Error("Upload failed") }),
      });

      await expect(service.createBackup("org-123")).rejects.toThrow("BACKUP_UPLOAD_FAILED");
    });
  });

  describe("listBackups", () => {
    it("debería retornar lista de backups", async () => {
      const mockBackups = [
        { id: "backup-1", organizationId: "org-123", fileName: "backup.json", createdAt: new Date() },
      ];

      vi.mocked(mockTenantDb.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockBackups),
        }),
      });

      const result = await service.listBackups("org-123");

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("deleteBackup", () => {
    it("debería eliminar un backup exitosamente", async () => {
      vi.mocked(mockTenantDb.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "backup-1", organizationId: "org-123", storageBucket: "backups", storagePath: "org-123/backup.json" },
            ]),
          }),
        }),
      });

      await service.deleteBackup("org-123", "backup-1");

      expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith("backups");
    });

    it("debería lanzar error si backup no existe", async () => {
      vi.mocked(mockTenantDb.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.deleteBackup("org-123", "backup-1")).rejects.toThrow("BACKUP_NOT_FOUND");
    });
  });

  describe("restoreBackup", () => {
    it("debería restaurar un backup exitosamente", async () => {
      const mockBackupData = {
        exportedAt: new Date().toISOString(),
        organizationId: "org-123",
        tables: {
          contacts: [],
          conversations: [],
        },
      };

      vi.mocked(mockTenantDb.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "backup-1",
                organizationId: "org-123",
                storageBucket: "backups",
                storagePath: "org-123/backup.json",
              },
            ]),
          }),
        }),
      });

      mockSupabaseAdmin.storage.from = vi.fn().mockReturnValue({
        download: vi.fn().mockResolvedValue({
          data: new TextEncoder().encode(JSON.stringify(mockBackupData)),
          error: null,
        }),
      });

      await service.restoreBackup("org-123", "backup-1");

      expect(mockSupabaseAdmin.storage.from).toHaveBeenCalled();
    });

    it("debería lanzar error si backup no existe", async () => {
      vi.mocked(mockTenantDb.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.restoreBackup("org-123", "backup-1")).rejects.toThrow("BACKUP_NOT_FOUND");
    });
  });
});
