import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createTelegramWebhookRoutes } from "../../src/routes/webhooks/telegram-webhook.routes.js";

const mockChannelLookup = {
  findTenantByChannelIdentifier: vi.fn(),
  createServicesForTenant: vi.fn(),
};

const mockInboxService = {
  createConversationFromIncomingMessage: vi.fn(),
};

vi.mock("../../src/services/channels/TelegramService.js", () => ({
  TelegramService: vi.fn().mockImplementation(() => ({
    initializeTelegramBot: vi.fn().mockResolvedValue(undefined),
    handleIncomingTelegramUpdate: vi.fn(),
  })),
}));

vi.mock("../../src/utils/encryption.js", () => ({
  decryptCredentials: vi.fn(),
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockIO = {} as never;
vi.mock("../../src/socket/socketServer.js", () => ({
  emitNewMessage: vi.fn(),
}));

function buildApp() {
  const app = new Hono();
  app.route("/webhooks/telegram", createTelegramWebhookRoutes(mockChannelLookup as never, mockIO));
  return app;
}

describe("POST /webhooks/telegram — recepción de mensajes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "my-secret-telegram-token");
  });

  it("debería rechazar webhook con secretToken inválido", async () => {
    const app = buildApp();
    const payload = {
      update_id: 123,
      message: {
        message_id: 456,
        chat: { id: 789, type: "private" },
        from: { id: 111, first_name: "Juan" },
        date: Math.floor(Date.now() / 1000),
        text: "Hola",
      },
    };

    const res = await app.request("/webhooks/telegram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": "wrong-token",
        "x-apex-bot-id": "default",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Forbidden");
  });

  it("debería procesar payload válido: crear conversación, guardar mensaje, emitir Socket.IO", async () => {
    const { TelegramService } = await import(
      "../../src/services/channels/TelegramService.js"
    );
    const { emitNewMessage } = await import(
      "../../src/socket/socketServer.js"
    );
    const { decryptCredentials } = await import(
      "../../src/utils/encryption.js"
    );

    const mockTelegramService = vi.mocked(TelegramService).mock.results[0]?.value;
    const mockEmitNewMessage = vi.mocked(emitNewMessage);
    const mockDecryptCreds = vi.mocked(decryptCredentials);

    mockChannelLookup.findTenantByChannelIdentifier.mockResolvedValueOnce({
      organizationId: "org-telegram-1",
      organizationSlug: "telegram-company",
    });

    const mockTenantDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "cred-1",
                channelType: "telegram",
                encryptedCredentials: "encrypted-bot-token-here",
              },
            ]),
          }),
        }),
      }),
    };

    mockChannelLookup.createServicesForTenant.mockResolvedValueOnce({
      inboxService: mockInboxService,
      tenantDb: mockTenantDb,
    });

    mockDecryptCreds.mockReturnValueOnce('{"botToken":"123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"}');

    if (mockTelegramService) {
      vi.mocked(mockTelegramService.initializeTelegramBot).mockResolvedValueOnce(undefined);
      vi.mocked(mockTelegramService.handleIncomingTelegramUpdate).mockResolvedValueOnce({
        conversationId: "conv-1",
        message: { id: "msg-1", content: "Hola", channel: "telegram" },
      });
    }

    const app = buildApp();
    const payload = {
      update_id: 123,
      message: {
        message_id: 456,
        chat: { id: 789, type: "private" },
        from: { id: 111, first_name: "Juan" },
        date: Math.floor(Date.now() / 1000),
        text: "Hola",
      },
    };

    const res = await app.request("/webhooks/telegram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": "my-secret-telegram-token",
        "x-apex-bot-id": "default",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe("ok");

    expect(mockChannelLookup.findTenantByChannelIdentifier).toHaveBeenCalledWith(
      "telegram",
      "default"
    );

    expect(mockChannelLookup.createServicesForTenant).toHaveBeenCalledWith(
      "org-telegram-1"
    );

    expect(mockDecryptCreds).toHaveBeenCalledWith("encrypted-bot-token-here");

    if (mockTelegramService) {
      expect(vi.mocked(mockTelegramService.initializeTelegramBot)).toHaveBeenCalledWith(
        "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
      );

      expect(vi.mocked(mockTelegramService.handleIncomingTelegramUpdate)).toHaveBeenCalledWith(payload);
    }

    expect(mockEmitNewMessage).toHaveBeenCalledWith(
      mockIO,
      "conv-1",
      "telegram-company",
      { id: "msg-1", content: "Hola", channel: "telegram" }
    );
  });

  it("debería continuar si no se encuentra tenant para el botId", async () => {
    mockChannelLookup.findTenantByChannelIdentifier.mockResolvedValueOnce(null);

    const app = buildApp();
    const payload = {
      update_id: 123,
      message: {
        message_id: 456,
        chat: { id: 789, type: "private" },
        from: { id: 111, first_name: "Juan" },
        date: Math.floor(Date.now() / 1000),
        text: "Hola",
      },
    };

    const res = await app.request("/webhooks/telegram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": "my-secret-telegram-token",
        "x-apex-bot-id": "unknown-bot",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe("ok");

    expect(mockChannelLookup.createServicesForTenant).not.toHaveBeenCalled();
  });

  it("debería manejar credenciales de Telegram faltantes o inválidas", async () => {
    const { TelegramService } = await import(
      "../../src/services/channels/TelegramService.js"
    );
    const { logger } = await import(
      "../../src/utils/logger.js"
    );

    const mockTelegramService = vi.mocked(TelegramService).mock.results[0]?.value;
    const mockLoggerWarn = vi.mocked(logger.warn);

    mockChannelLookup.findTenantByChannelIdentifier.mockResolvedValueOnce({
      organizationId: "org-telegram-2",
      organizationSlug: "telegram-company-2",
    });

    const mockTenantDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    mockChannelLookup.createServicesForTenant.mockResolvedValueOnce({
      inboxService: mockInboxService,
      tenantDb: mockTenantDb,
    });

    if (mockTelegramService) {
      vi.mocked(mockTelegramService.handleIncomingTelegramUpdate).mockResolvedValueOnce(null);
    }

    const app = buildApp();
    const payload = {
      update_id: 123,
      message: {
        message_id: 456,
        chat: { id: 789, type: "private" },
        from: { id: 111, first_name: "Juan" },
        date: Math.floor(Date.now() / 1000),
        text: "Hola",
      },
    };

    const res = await app.request("/webhooks/telegram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": "my-secret-telegram-token",
        "x-apex-bot-id": "default",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    expect(mockLoggerWarn).toHaveBeenCalled();
  });

  it("debería manejar errores de desencriptación de credenciales gracefully", async () => {
    const { TelegramService } = await import(
      "../../src/services/channels/TelegramService.js"
    );
    const { decryptCredentials } = await import(
      "../../src/utils/encryption.js"
    );
    const { logger } = await import(
      "../../src/utils/logger.js"
    );

    const mockTelegramService = vi.mocked(TelegramService).mock.results[0]?.value;
    const mockDecryptCreds = vi.mocked(decryptCredentials);
    const mockLoggerWarn = vi.mocked(logger.warn);

    mockChannelLookup.findTenantByChannelIdentifier.mockResolvedValueOnce({
      organizationId: "org-telegram-3",
      organizationSlug: "telegram-company-3",
    });

    const mockTenantDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "cred-bad",
                channelType: "telegram",
                encryptedCredentials: "corrupted-encrypted-data",
              },
            ]),
          }),
        }),
      }),
    };

    mockChannelLookup.createServicesForTenant.mockResolvedValueOnce({
      inboxService: mockInboxService,
      tenantDb: mockTenantDb,
    });

    mockDecryptCreds.mockImplementationOnce(() => {
      throw new Error("Decryption failed");
    });

    if (mockTelegramService) {
      vi.mocked(mockTelegramService.handleIncomingTelegramUpdate).mockResolvedValueOnce(null);
    }

    const app = buildApp();
    const payload = {
      update_id: 123,
      message: {
        message_id: 456,
        chat: { id: 789, type: "private" },
        from: { id: 111, first_name: "Juan" },
        date: Math.floor(Date.now() / 1000),
        text: "Hola",
      },
    };

    const res = await app.request("/webhooks/telegram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": "my-secret-telegram-token",
        "x-apex-bot-id": "default",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    expect(mockLoggerWarn).toHaveBeenCalled();
  });
});
