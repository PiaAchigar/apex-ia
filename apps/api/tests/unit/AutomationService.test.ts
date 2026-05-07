import { describe, it, expect, beforeEach, vi } from "vitest";
import { AutomationService } from "../../src/services/AutomationService.js";
import type { DrizzleDb } from "../../src/db/drizzle.js";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("AutomationService", () => {
  let service: AutomationService;
  let mockTenantDb: Partial<DrizzleDb>;
  let mockSupabaseAdmin: Partial<SupabaseClient>;

  beforeEach(() => {
    // Mock tenant database
    mockTenantDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "test-id",
              name: "Test Automation",
              type: "python",
              filePath: "test.py",
              storageBucket: "automations-test",
              isActive: true,
              executedCount: 0,
              createdAt: new Date(),
            },
          ]),
        }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "test-id",
                name: "Test Automation",
                type: "python",
                filePath: "test.py",
                storageBucket: "automations-test",
                isActive: true,
                executedCount: 0,
                createdAt: new Date(),
              },
            ]),
          }),
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "test-id",
              isActive: false,
            },
          ]),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(true),
      }),
    };

    // Mock Supabase Admin
    mockSupabaseAdmin = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          download: vi.fn().mockResolvedValue({
            data: new TextEncoder().encode('print("test")'),
            error: null,
          }),
          remove: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any,
    };

    service = new AutomationService(mockTenantDb as DrizzleDb, mockSupabaseAdmin as SupabaseClient);
  });

  describe("uploadAutomation", () => {
    it("should upload automation file and create record", async () => {
      const result = await service.uploadAutomation(
        "Test Automation",
        "python",
        'print("hello")',
        "org-123"
      );

      expect(result.id).toBe("test-id");
      expect(result.name).toBe("Test Automation");
      expect(result.type).toBe("python");
      expect(mockTenantDb.insert).toHaveBeenCalled();
    });

    it("should reject invalid automation type", async () => {
      await expect(
        service.uploadAutomation("Test", "invalid" as never, "code", "org-123")
      ).rejects.toThrow("INVALID_AUTOMATION_TYPE");
    });

    it("should reject empty file content", async () => {
      await expect(service.uploadAutomation("Test", "python", "", "org-123")).rejects.toThrow(
        "EMPTY_FILE_CONTENT"
      );
    });
  });

  describe("listAutomations", () => {
    it("should return empty array when no automations exist", async () => {
      // Mock returns empty array
      (mockTenantDb.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.listAutomations();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("executeAutomation", () => {
    it("should parse and return JSON structure on dry-run", async () => {
      const jsonContent = JSON.stringify({ trigger: "new_contact", action: "send_message" });

      (mockSupabaseAdmin.storage?.from as any).mockReturnValueOnce({
        download: vi
          .fn()
          .mockResolvedValue({ data: new TextEncoder().encode(jsonContent), error: null }),
      });

      const result = await service.executeAutomation("test-id");

      expect(result.success).toBe(true);
      expect(result.output).toContain("trigger");
      expect(result.output).toContain("action");
    });

    it("should throw when automation not found", async () => {
      (mockTenantDb.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.executeAutomation("nonexistent-id")).rejects.toThrow(
        "AUTOMATION_NOT_FOUND"
      );
    });
  });

  describe("toggleAutomation", () => {
    it("should toggle automation active status", async () => {
      const result = await service.toggleAutomation("test-id", false);

      expect(mockTenantDb.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should throw when automation not found", async () => {
      (mockTenantDb.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.toggleAutomation("nonexistent-id", true)).rejects.toThrow(
        "AUTOMATION_NOT_FOUND"
      );
    });
  });

  describe("deleteAutomation", () => {
    it("should delete automation and file from storage", async () => {
      await service.deleteAutomation("test-id");

      expect(mockSupabaseAdmin.storage?.from).toHaveBeenCalled();
      expect(mockTenantDb.delete).toHaveBeenCalled();
    });

    it("should throw when automation not found", async () => {
      (mockTenantDb.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.deleteAutomation("nonexistent-id")).rejects.toThrow(
        "AUTOMATION_NOT_FOUND"
      );
    });
  });
});
