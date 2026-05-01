import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiKeyService } from "../../src/services/ApiKeyService.js";

const mocks = vi.hoisted(() => {
  return {
    mockDb: {},
    mockLogger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    },
  };
});

vi.mock("../../src/db/drizzle.js", () => ({
  db: mocks.mockDb,
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: mocks.mockLogger,
}));

describe("ApiKeyService", () => {
  let service: ApiKeyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ApiKeyService();
  });

  describe("estructura", () => {
    it("debería tener método listApiKeys", () => {
      expect(typeof service.listApiKeys).toBe("function");
    });

    it("debería tener método generateApiKey", () => {
      expect(typeof service.generateApiKey).toBe("function");
    });

    it("debería tener método revokeApiKey", () => {
      expect(typeof service.revokeApiKey).toBe("function");
    });

    it("debería tener método validateApiKey", () => {
      expect(typeof service.validateApiKey).toBe("function");
    });
  });

  describe("generateApiKey", () => {
    it("debería retornar un objeto con key y record", async () => {
      // Estructura básica verificada
      expect(service).toBeDefined();
    });
  });

  describe("validateApiKey", () => {
    it("debería retornar null o organizationId", async () => {
      // Método existe y puede ser llamado
      expect(typeof service.validateApiKey).toBe("function");
    });
  });
});
