import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsAppCloudApiService } from "../../src/services/channels/WhatsAppCloudApiService.js";

const mockInboxService = {
  createConversationFromIncomingMessage: vi.fn(),
};

const mockConversationService = {};

describe("WhatsAppCloudApiService", () => {
  let service: WhatsAppCloudApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "test-verify-token");
    vi.stubEnv("META_APP_SECRET", "");
    service = new WhatsAppCloudApiService(
      mockInboxService as never,
      mockConversationService as never
    );
  });

  describe("verifyWhatsAppWebhookChallenge", () => {
    it("debería retornar el challenge si el token y modo son correctos", () => {
      const result = service.verifyWhatsAppWebhookChallenge(
        "subscribe",
        "test-verify-token",
        "challenge-abc"
      );
      expect(result).toBe("challenge-abc");
    });

    it("debería retornar null si el token es incorrecto", () => {
      const result = service.verifyWhatsAppWebhookChallenge(
        "subscribe",
        "wrong-token",
        "challenge-abc"
      );
      expect(result).toBeNull();
    });

    it("debería retornar null si el modo no es 'subscribe'", () => {
      const result = service.verifyWhatsAppWebhookChallenge(
        "unsubscribe",
        "test-verify-token",
        "challenge-abc"
      );
      expect(result).toBeNull();
    });
  });

  describe("verifyWebhookSignature", () => {
    it("debería retornar false si META_APP_SECRET no está configurado", () => {
      vi.stubEnv("META_APP_SECRET", "");
      const result = service.verifyWebhookSignature("payload", "sha256=abc");
      expect(result).toBe(false);
    });
  });

  describe("handleIncomingWhatsAppWebhook", () => {
    it("debería ignorar payloads que no son 'whatsapp_business_account'", async () => {
      const result = await service.handleIncomingWhatsAppWebhook({
        object: "page",
        entry: [],
      });
      expect(result).toBeNull();
    });

    it("debería procesar mensaje de texto entrante correctamente", async () => {
      mockInboxService.createConversationFromIncomingMessage.mockResolvedValueOnce({
        conversationId: "conv-1",
        contactId: "c-1",
        message: { id: "m-1" },
      });

      const result = await service.handleIncomingWhatsAppWebhook({
        object: "whatsapp_business_account",
        entry: [
          {
            id: "entry-1",
            changes: [
              {
                field: "messages",
                value: {
                  messaging_product: "whatsapp",
                  metadata: { phone_number_id: "1234567890" },
                  contacts: [{ profile: { name: "Juan" }, wa_id: "5491112345678" }],
                  messages: [
                    {
                      from: "5491112345678",
                      id: "wamid.xxx",
                      timestamp: "1700000000",
                      type: "text",
                      text: { body: "Hola" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      });

      expect(result?.conversationId).toBe("conv-1");
      expect(mockInboxService.createConversationFromIncomingMessage).toHaveBeenCalledOnce();
    });

    it("debería ignorar entries sin cambios de tipo 'messages'", async () => {
      const result = await service.handleIncomingWhatsAppWebhook({
        object: "whatsapp_business_account",
        entry: [
          {
            id: "entry-1",
            changes: [
              {
                field: "statuses",
                value: {
                  messaging_product: "whatsapp",
                  metadata: { phone_number_id: "111" },
                },
              },
            ],
          },
        ],
      });

      expect(result).toBeNull();
      expect(mockInboxService.createConversationFromIncomingMessage).not.toHaveBeenCalled();
    });
  });
});
