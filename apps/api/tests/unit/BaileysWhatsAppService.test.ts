import { describe, it, expect, vi, beforeEach } from "vitest";
import { BaileysWhatsAppService } from "../../src/services/channels/BaileysWhatsAppService.js";

const mockInboxService = {
  createConversationFromIncomingMessage: vi.fn(),
};

describe("BaileysWhatsAppService", () => {
  let service: BaileysWhatsAppService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BaileysWhatsAppService(mockInboxService as never);
  });

  describe("getSessionStatus", () => {
    it("debería retornar 'not_found' para sesión inexistente", () => {
      expect(service.getSessionStatus("ghost")).toBe("not_found");
    });
  });

  describe("sendBaileysTextMessage", () => {
    it("debería lanzar error si la sesión no está lista", async () => {
      await expect(
        service.sendBaileysTextMessage("session-1", "5491112345678", "hola")
      ).rejects.toThrow("BAILEYS_SESSION_NOT_READY");
    });
  });

  describe("handleIncomingBaileysMessage", () => {
    it("debería ignorar mensajes de grupos (@g.us)", async () => {
      await service.handleIncomingBaileysMessage("session-1", {
        key: { remoteJid: "120363000000@g.us", fromMe: false, id: "m-1" },
        message: { conversation: "hola grupo" },
      });

      expect(
        mockInboxService.createConversationFromIncomingMessage
      ).not.toHaveBeenCalled();
    });

    it("debería procesar mensaje de texto entrante de un número individual", async () => {
      mockInboxService.createConversationFromIncomingMessage.mockResolvedValueOnce({
        conversationId: "conv-1",
        contactId: "c-1",
        message: {},
      });

      await service.handleIncomingBaileysMessage("session-1", {
        key: { remoteJid: "5491112345678@s.whatsapp.net", fromMe: false, id: "m-99" },
        message: { conversation: "hola" },
      });

      expect(
        mockInboxService.createConversationFromIncomingMessage
      ).toHaveBeenCalledOnce();

      const call = mockInboxService.createConversationFromIncomingMessage.mock.calls[0]?.[0];
      expect(call?.channel).toBe("whatsapp_qr");
      expect(call?.senderExternalId).toBe("5491112345678");
      expect(call?.content).toBe("hola");
    });

    it("debería manejar mensajes sin contenido de texto", async () => {
      mockInboxService.createConversationFromIncomingMessage.mockResolvedValueOnce({
        conversationId: "conv-1",
        contactId: "c-1",
        message: {},
      });

      await service.handleIncomingBaileysMessage("session-1", {
        key: { remoteJid: "5491199999999@s.whatsapp.net", fromMe: false, id: "m-100" },
        message: { imageMessage: {} },
      });

      const call = mockInboxService.createConversationFromIncomingMessage.mock.calls[0]?.[0];
      expect(call?.content).toBeUndefined();
    });
  });

  describe("disconnectWhatsAppQrSession", () => {
    it("debería no lanzar error si la sesión no existe", async () => {
      await expect(
        service.disconnectWhatsAppQrSession("ghost-session")
      ).resolves.not.toThrow();
    });
  });
});
