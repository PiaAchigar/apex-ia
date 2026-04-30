import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiCredentialsService } from "../../src/services/AiCredentialsService.js";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock("../../src/utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../../src/utils/encryption.js", () => ({
  encryptCredentials: (key: string) => `encrypted:${key}`,
  decryptCredentials: (key: string) => key.replace("encrypted:", ""),
}));

describe("AiCredentialsService", () => {
  let service: AiCredentialsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AiCredentialsService(mockDb as never);
  });

  describe("error handling", () => {
    it("should throw AI_CREDENTIALS_LIST_FAILED on error", async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error("DB error");
      });

      await expect(service.listCredentials("org-1")).rejects.toThrow(
        "AI_CREDENTIALS_LIST_FAILED"
      );
    });

    it("should throw AI_CREDENTIAL_CREATE_FAILED on error", async () => {
      mockDb.insert.mockImplementation(() => ({
        values: () => {
          throw new Error("DB error");
        },
      }));

      await expect(
        service.createCredential("org-1", {
          provider: "anthropic",
          apiKey: "test-key",
        })
      ).rejects.toThrow("AI_CREDENTIAL_CREATE_FAILED");
    });

    it("should throw AI_CREDENTIAL_UPDATE_FAILED on error", async () => {
      mockDb.update.mockImplementation(() => ({
        set: () => ({
          where: () => {
            throw new Error("DB error");
          },
        }),
      }));

      await expect(
        service.updateCredential("id-1", "org-1", { isActive: false })
      ).rejects.toThrow("AI_CREDENTIAL_UPDATE_FAILED");
    });

    it("should throw AI_CREDENTIAL_DELETE_FAILED on error", async () => {
      mockDb.delete.mockImplementation(() => ({
        where: () => {
          throw new Error("DB error");
        },
      }));

      await expect(service.deleteCredential("id-1", "org-1")).rejects.toThrow(
        "AI_CREDENTIAL_DELETE_FAILED"
      );
    });
  });

  describe("service initialization", () => {
    it("should create service with database", () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AiCredentialsService);
    });

    it("should have all required methods", () => {
      expect(typeof service.listCredentials).toBe("function");
      expect(typeof service.createCredential).toBe("function");
      expect(typeof service.updateCredential).toBe("function");
      expect(typeof service.setApiKey).toBe("function");
      expect(typeof service.deleteCredential).toBe("function");
    });
  });
});
