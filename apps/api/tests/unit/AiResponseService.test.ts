import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiResponseService } from "../../src/services/AiResponseService.js";

const mockAiCredentials = {
  organizationId: "org-1",
  provider: "anthropic",
  encryptedApiKey: "encrypted-key",
  isActive: true,
  isPrimary: true,
};

vi.mock("../../src/utils/encryption.js", () => ({
  decryptCredentials: vi.fn((encrypted: string) => `decrypted-${encrypted}`),
  encryptCredentials: vi.fn((plain: string) => `encrypted-${plain}`),
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
};

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
}

function makeInsertChain() {
  return {
    values: vi.fn().mockResolvedValue([{ id: "log-1" }]),
  };
}

describe("AiResponseService", () => {
  let service: AiResponseService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ANTHROPIC_API_KEY", "default-anthropic-key");
    vi.stubEnv("OPENAI_API_KEY", "default-openai-key");
    service = new AiResponseService(mockDb as never, "org-1");
  });

  describe("getActiveCredential", () => {
    it("debería retornar credencial de DB si está configurada", async () => {
      mockDb.select.mockReturnValue(makeSelectChain([mockAiCredentials]));

      const result = await service.getActiveCredential("anthropic");

      expect(result).toEqual({
        provider: "anthropic",
        apiKey: "decrypted-encrypted-key",
      });
    });

    it("debería retornar fallback si no hay credenciales en DB", async () => {
      mockDb.select.mockReturnValue(makeSelectChain([]));

      const result = await service.getActiveCredential("anthropic");

      expect(result).toEqual({
        provider: "anthropic",
        apiKey: "default-anthropic-key",
      });
    });

    it("debería retornar null si no hay credenciales y sin DB", async () => {
      const serviceNoDB = new AiResponseService();
      vi.stubEnv("ANTHROPIC_API_KEY", undefined);
      vi.stubEnv("OPENAI_API_KEY", undefined);
      vi.stubEnv("GOOGLE_GEMINI_API_KEY", undefined);

      const result = await serviceNoDB.getActiveCredential("anthropic");

      expect(result).toBeNull();
    });
  });

  describe("generateAiResponse", () => {
    it("debería generar respuesta con Anthropic", async () => {
      mockDb.select.mockReturnValue(
        makeSelectChain([
          {
            ...mockAiCredentials,
            provider: "anthropic",
          },
        ])
      );

      const anthropicMock = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: "AI response" }],
          }),
        },
      };

      vi.spyOn(service as any, "getOrCreateClient").mockResolvedValue(anthropicMock);

      const result = await service.generateAiResponse(
        "You are helpful",
        "What is 2+2?",
        "anthropic"
      );

      expect(result).toBe("AI response");
    });

    it("debería lanzar error si no hay credenciales", async () => {
      mockDb.select.mockReturnValue(makeSelectChain([]));
      vi.stubEnv("ANTHROPIC_API_KEY", undefined);
      vi.stubEnv("OPENAI_API_KEY", undefined);

      await expect(
        service.generateAiResponse("You are helpful", "What is 2+2?", "anthropic")
      ).rejects.toThrow("AI_PROVIDER_NOT_CONFIGURED");
    });
  });

  describe("generateAiResponseWithFallback", () => {
    it("debería intentar proveedor primario primero", async () => {
      mockDb.select.mockReturnValue(
        makeSelectChain([
          {
            ...mockAiCredentials,
            provider: "anthropic",
            isPrimary: true,
          },
        ])
      );

      const anthropicMock = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: "Success with primary" }],
          }),
        },
      };

      vi.spyOn(service as any, "getOrCreateClient").mockResolvedValue(anthropicMock);
      vi.spyOn(service, "logAiUsage").mockResolvedValue(undefined);

      const result = await service.generateAiResponseWithFallback(
        "You are helpful",
        "What is 2+2?"
      );

      expect(result).toBe("Success with primary");
      expect(service.logAiUsage).toHaveBeenCalled();
    });

    it("debería hacer fallback a segundo proveedor si primero falla", async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeSelectChain([
            { ...mockAiCredentials, provider: "anthropic", isPrimary: true },
          ]);
        } else if (callCount === 2) {
          return makeSelectChain([
            { ...mockAiCredentials, provider: "openai", isPrimary: false },
          ]);
        }
        return makeSelectChain([]);
      });

      const openaiMock = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: "Success with fallback" } }],
            }),
          },
        },
      };

      const getOrCreateSpy = vi.spyOn(service as any, "getOrCreateClient") as any;
      getOrCreateSpy.mockImplementation(async (provider: string) => {
        if (provider === "openai") return openaiMock;
        throw new Error("API Error");
      });

      const generateSpy = vi.spyOn(service, "generateAiResponse");
      generateSpy.mockImplementationOnce(async () => {
        throw new Error("Primary failed");
      }).mockImplementationOnce(async () => "Success with fallback");

      vi.spyOn(service, "logAiUsage").mockResolvedValue(undefined);

      const result = await service.generateAiResponseWithFallback(
        "You are helpful",
        "What is 2+2?"
      );

      expect(result).toBe("Success with fallback");
    });
  });

  describe("transcribeAudioMessage", () => {
    it("debería transcribir audio usando OpenAI Whisper", async () => {
      mockDb.select.mockReturnValue(
        makeSelectChain([
          {
            ...mockAiCredentials,
            provider: "openai",
          },
        ])
      );

      const openaiMock = {
        audio: {
          transcriptions: {
            create: vi.fn().mockResolvedValue({
              text: "Hola mundo",
            }),
          },
        },
      };

      vi.spyOn(service as any, "getOrCreateClient").mockResolvedValue(openaiMock);
      vi.spyOn(service, "logAiUsage").mockResolvedValue(undefined);

      const audioBuffer = Buffer.from("fake-audio-data");
      const result = await service.transcribeAudioMessage(audioBuffer, "audio/mp3");

      expect(result).toBe("Hola mundo");
      expect(service.logAiUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "openai",
          model: "whisper-1",
          endpoint: "audio.transcriptions.create",
        })
      );
    });

    it("debería lanzar error si OpenAI no está configurado", async () => {
      mockDb.select.mockReturnValue(makeSelectChain([]));
      vi.stubEnv("OPENAI_API_KEY", undefined);

      const audioBuffer = Buffer.from("fake-audio-data");

      await expect(
        service.transcribeAudioMessage(audioBuffer, "audio/mp3")
      ).rejects.toThrow("OPENAI_NOT_CONFIGURED");
    });
  });

  describe("logAiUsage", () => {
    it("debería insertar log de uso en DB", async () => {
      mockDb.insert.mockReturnValue(makeInsertChain());

      await service.logAiUsage({
        provider: "anthropic",
        model: "claude-haiku-4-5-20251001",
        totalTokens: 150,
        estimatedCostUsd: 0.0003,
        endpoint: "messages.create",
        statusCode: 200,
      });

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.calls[0]?.[0];
      expect(insertCall).toBeDefined();
    });

    it("debería silenciosamente ignorar errores de logging", async () => {
      mockDb.insert.mockImplementation(() => {
        throw new Error("DB error");
      });

      await expect(
        service.logAiUsage({
          provider: "anthropic",
          model: "claude-haiku-4-5-20251001",
          totalTokens: 100,
        })
      ).resolves.not.toThrow();
    });
  });
});
