import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChannelDispatcherService } from "../../src/services/ChannelDispatcherService.js";
import * as encryptionModule from "../../src/utils/encryption.js";

// Mock drizzle chain helpers
function makeSelectChain<T>(result: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

// Mock Socket.IO instance
const mockIo = {
  to: vi.fn().mockReturnThis(),
  emit: vi.fn().mockReturnThis(),
};

// Mock database
const mockDb = {
  select: vi.fn(),
};

// Mock channel services
const mockWhatsAppCloudApiService = {
  sendWhatsAppTextMessage: vi.fn(),
};

const mockInstagramService = {
  sendInstagramMessage: vi.fn(),
};

const mockFacebookMessengerService = {
  sendMessengerMessage: vi.fn(),
};

const mockTelegramService = {
  initializeTelegramBot: vi.fn(),
  sendTelegramMessage: vi.fn(),
};

const mockWebChatService = {
  sendWebChatMessage: vi.fn(),
};

const mockInboxService = {};

describe("ChannelDispatcherService", () => {
  let dispatcher: ChannelDispatcherService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(encryptionModule, "decryptCredentials");

    // Mock service constructors
    vi.doMock("../../src/services/channels/WhatsAppCloudApiService.js", () => ({
      WhatsAppCloudApiService: vi.fn(() => mockWhatsAppCloudApiService),
    }));

    vi.doMock("../../src/services/channels/InstagramService.js", () => ({
      InstagramService: vi.fn(() => mockInstagramService),
    }));

    vi.doMock("../../src/services/channels/FacebookMessengerService.js", () => ({
      FacebookMessengerService: vi.fn(() => mockFacebookMessengerService),
    }));

    vi.doMock("../../src/services/channels/TelegramService.js", () => ({
      TelegramService: vi.fn(() => mockTelegramService),
    }));

    vi.doMock("../../src/services/channels/WebChatService.js", () => ({
      WebChatService: vi.fn(() => mockWebChatService),
    }));

    vi.doMock("../../src/services/InboxService.js", () => ({
      InboxService: vi.fn(() => mockInboxService),
    }));

    dispatcher = new ChannelDispatcherService(mockDb as never, mockIo as never);
  });

  afterEach(() => {
    vi.unmock("../../src/services/channels/WhatsAppCloudApiService.js");
    vi.unmock("../../src/services/channels/InstagramService.js");
    vi.unmock("../../src/services/channels/FacebookMessengerService.js");
    vi.unmock("../../src/services/channels/TelegramService.js");
    vi.unmock("../../src/services/channels/WebChatService.js");
    vi.unmock("../../src/services/InboxService.js");
  });

  describe("dispatch - WhatsApp", () => {
    it("debería enviar mensaje por WhatsApp con credenciales válidas", async () => {
      const contactId = "contact-123";
      const externalId = "5491112345678";
      const content = "Hola, ¿cómo estás?";
      const phoneNumberId = "123456789";
      const credentials = { phoneNumberId };
      const encryptedCreds = "encrypted-creds-whatsapp";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "John Doe" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-1",
              encryptedCredentials: encryptedCreds,
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify(credentials)
      );

      mockWhatsAppCloudApiService.sendWhatsAppTextMessage.mockResolvedValueOnce(
        undefined
      );

      await dispatcher.dispatch("whatsapp", contactId, content);

      expect(mockWhatsAppCloudApiService.sendWhatsAppTextMessage).toHaveBeenCalledWith(
        {
          to: externalId,
          text: content,
          phoneNumberId,
        }
      );
    });

    it("debería fallar si faltan las credenciales phoneNumberId de WhatsApp", async () => {
      const contactId = "contact-123";
      const externalId = "5491112345678";
      const content = "Test message";
      const credentials = {}; // Missing phoneNumberId
      const encryptedCreds = "encrypted-creds-incomplete";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "John Doe" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-1",
              encryptedCredentials: encryptedCreds,
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify(credentials)
      );

      await expect(
        dispatcher.dispatch("whatsapp", contactId, content)
      ).rejects.toThrow("Missing phoneNumberId in WhatsApp credentials");
    });
  });

  describe("dispatch - Instagram", () => {
    it("debería enviar mensaje por Instagram con credenciales válidas", async () => {
      const contactId = "contact-456";
      const externalId = "instagram-user-123";
      const content = "¡Hola desde Instagram!";
      const pageAccessToken = "page-access-token-ig";
      const credentials = { pageAccessToken };
      const encryptedCreds = "encrypted-creds-instagram";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "Jane Doe" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-2",
              encryptedCredentials: encryptedCreds,
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify(credentials)
      );

      mockInstagramService.sendInstagramMessage.mockResolvedValueOnce(undefined);

      await dispatcher.dispatch("instagram", contactId, content);

      expect(mockInstagramService.sendInstagramMessage).toHaveBeenCalledWith(
        externalId,
        content,
        pageAccessToken
      );
    });

    it("debería fallar si faltan las credenciales pageAccessToken de Instagram", async () => {
      const contactId = "contact-456";
      const externalId = "instagram-user-123";
      const content = "Test message";
      const credentials = {}; // Missing pageAccessToken
      const encryptedCreds = "encrypted-creds-instagram-incomplete";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "Jane Doe" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-2",
              encryptedCredentials: encryptedCreds,
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify(credentials)
      );

      await expect(
        dispatcher.dispatch("instagram", contactId, content)
      ).rejects.toThrow("Missing pageAccessToken in Instagram credentials");
    });
  });

  describe("dispatch - Facebook Messenger", () => {
    it("debería enviar mensaje por Facebook Messenger con credenciales válidas", async () => {
      const contactId = "contact-789";
      const externalId = "facebook-user-456";
      const content = "¡Hola desde Facebook!";
      const pageAccessToken = "page-access-token-fb";
      const credentials = { pageAccessToken };
      const encryptedCreds = "encrypted-creds-facebook";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "Bob Smith" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-3",
              encryptedCredentials: encryptedCreds,
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify(credentials)
      );

      mockFacebookMessengerService.sendMessengerMessage.mockResolvedValueOnce(
        undefined
      );

      await dispatcher.dispatch("facebook", contactId, content);

      expect(mockFacebookMessengerService.sendMessengerMessage).toHaveBeenCalledWith(
        externalId,
        content,
        pageAccessToken
      );
    });

    it("debería fallar si faltan las credenciales pageAccessToken de Facebook", async () => {
      const contactId = "contact-789";
      const externalId = "facebook-user-456";
      const content = "Test message";
      const credentials = {}; // Missing pageAccessToken
      const encryptedCreds = "encrypted-creds-facebook-incomplete";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "Bob Smith" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-3",
              encryptedCredentials: encryptedCreds,
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify(credentials)
      );

      await expect(
        dispatcher.dispatch("facebook", contactId, content)
      ).rejects.toThrow("Missing pageAccessToken in Facebook credentials");
    });
  });

  describe("dispatch - Telegram", () => {
    it("debería enviar mensaje por Telegram con credenciales válidas", async () => {
      const contactId = "contact-999";
      const externalId = "telegram-user-789";
      const content = "¡Hola desde Telegram!";
      const botToken = "telegram-bot-token-123";
      const credentials = { botToken };
      const encryptedCreds = "encrypted-creds-telegram";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "Alice Johnson" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-4",
              encryptedCredentials: encryptedCreds,
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify(credentials)
      );

      mockTelegramService.initializeTelegramBot.mockResolvedValueOnce(undefined);
      mockTelegramService.sendTelegramMessage.mockResolvedValueOnce(undefined);

      await dispatcher.dispatch("telegram", contactId, content);

      expect(mockTelegramService.initializeTelegramBot).toHaveBeenCalledWith(botToken);
      expect(mockTelegramService.sendTelegramMessage).toHaveBeenCalledWith(
        externalId,
        content
      );
    });

    it("debería fallar si faltan las credenciales botToken de Telegram", async () => {
      const contactId = "contact-999";
      const externalId = "telegram-user-789";
      const content = "Test message";
      const credentials = {}; // Missing botToken
      const encryptedCreds = "encrypted-creds-telegram-incomplete";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "Alice Johnson" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-4",
              encryptedCredentials: encryptedCreds,
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify(credentials)
      );

      await expect(
        dispatcher.dispatch("telegram", contactId, content)
      ).rejects.toThrow("Missing botToken in Telegram credentials");
    });
  });

  describe("dispatch - WebChat", () => {
    it("debería enviar mensaje por WebChat vía Socket.IO sin necesidad de credenciales", async () => {
      const contactId = "contact-webchat";
      const externalId = "webchat-session-123";
      const content = "¡Hola desde WebChat!";

      mockDb.select.mockReturnValueOnce(
        makeSelectChain([
          { id: contactId, externalId, name: "WebChat User" },
        ])
      );

      mockWebChatService.sendWebChatMessage.mockResolvedValueOnce(undefined);

      await dispatcher.dispatch("webchat", contactId, content);

      expect(mockWebChatService.sendWebChatMessage).toHaveBeenCalledWith(
        externalId,
        content,
        mockIo
      );
    });

    it("debería no intentar recuperar credenciales para WebChat", async () => {
      const contactId = "contact-webchat";
      const externalId = "webchat-session-456";
      const content = "Another WebChat message";

      mockDb.select.mockReturnValueOnce(
        makeSelectChain([
          { id: contactId, externalId, name: "Another User" },
        ])
      );

      mockWebChatService.sendWebChatMessage.mockResolvedValueOnce(undefined);

      await dispatcher.dispatch("webchat", contactId, content);

      // select() should only be called once for contacts, not for channel_credentials
      expect(mockDb.select).toHaveBeenCalledOnce();
      expect(mockWebChatService.sendWebChatMessage).toHaveBeenCalled();
    });
  });

  describe("Error Handling - Contact Not Found", () => {
    it("debería fallar con CONTACT_NOT_FOUND si el contacto no existe", async () => {
      const contactId = "non-existent-contact";
      const content = "Test message";

      mockDb.select.mockReturnValueOnce(makeSelectChain([]));

      await expect(
        dispatcher.dispatch("whatsapp", contactId, content)
      ).rejects.toThrow("CONTACT_NOT_FOUND");
    });

    it("debería fallar con CONTACT_NOT_FOUND para cualquier canal si el contacto no existe", async () => {
      const contactId = "non-existent-contact";
      const content = "Test message";

      mockDb.select.mockReturnValueOnce(makeSelectChain([]));

      await expect(
        dispatcher.dispatch("instagram", contactId, content)
      ).rejects.toThrow("CONTACT_NOT_FOUND");

      mockDb.select.mockReturnValueOnce(makeSelectChain([]));

      await expect(
        dispatcher.dispatch("facebook", contactId, content)
      ).rejects.toThrow("CONTACT_NOT_FOUND");
    });
  });

  describe("Error Handling - No Active Credentials", () => {
    it("debería fallar con NO_CREDENTIALS_FOR_CHANNEL si no hay credenciales activas", async () => {
      const contactId = "contact-123";
      const externalId = "5491112345678";
      const content = "Test message";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "John Doe" },
          ])
        )
        .mockReturnValueOnce(makeSelectChain([])); // No credentials found

      await expect(
        dispatcher.dispatch("whatsapp", contactId, content)
      ).rejects.toThrow("NO_CREDENTIALS_FOR_CHANNEL_WHATSAPP");
    });

    it("debería incluir el tipo de canal correcto en el error", async () => {
      const contactId = "contact-456";
      const externalId = "instagram-user-123";
      const content = "Test message";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "Jane Doe" },
          ])
        )
        .mockReturnValueOnce(makeSelectChain([])); // No credentials found

      await expect(
        dispatcher.dispatch("instagram", contactId, content)
      ).rejects.toThrow("NO_CREDENTIALS_FOR_CHANNEL_INSTAGRAM");
    });

    it("debería fallar con NO_CREDENTIALS_FOR_CHANNEL para Telegram", async () => {
      const contactId = "contact-999";
      const externalId = "telegram-user-789";
      const content = "Test message";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "Alice Johnson" },
          ])
        )
        .mockReturnValueOnce(makeSelectChain([])); // No credentials found

      await expect(
        dispatcher.dispatch("telegram", contactId, content)
      ).rejects.toThrow("NO_CREDENTIALS_FOR_CHANNEL_TELEGRAM");
    });
  });

  describe("Error Handling - Credentials Decryption", () => {
    it("debería fallar con CREDENTIALS_DECRYPTION_FAILED si la desencriptación falla", async () => {
      const contactId = "contact-123";
      const externalId = "5491112345678";
      const content = "Test message";
      const encryptedCreds = "invalid-encrypted-data";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "John Doe" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-1",
              encryptedCredentials: encryptedCreds,
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockImplementationOnce(() => {
        throw new Error("Invalid encryption key or corrupted data");
      });

      await expect(
        dispatcher.dispatch("whatsapp", contactId, content)
      ).rejects.toThrow("CREDENTIALS_DECRYPTION_FAILED");
    });

    it("debería fallar si el JSON desencriptado es inválido", async () => {
      const contactId = "contact-123";
      const externalId = "5491112345678";
      const content = "Test message";
      const encryptedCreds = "encrypted-invalid-json";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "John Doe" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-1",
              encryptedCredentials: encryptedCreds,
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        "{ invalid json "
      );

      await expect(
        dispatcher.dispatch("whatsapp", contactId, content)
      ).rejects.toThrow("CREDENTIALS_DECRYPTION_FAILED");
    });
  });

  describe("Error Handling - Service Failures", () => {
    it("debería propagar errores del servicio WhatsApp", async () => {
      const contactId = "contact-123";
      const externalId = "5491112345678";
      const content = "Test message";
      const phoneNumberId = "123456789";
      const credentials = { phoneNumberId };
      const encryptedCreds = "encrypted-creds-whatsapp";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "John Doe" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-1",
              encryptedCredentials: encryptedCreds,
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify(credentials)
      );

      const error = new Error("WhatsApp API error");
      mockWhatsAppCloudApiService.sendWhatsAppTextMessage.mockRejectedValueOnce(
        error
      );

      await expect(
        dispatcher.dispatch("whatsapp", contactId, content)
      ).rejects.toThrow("WhatsApp API error");
    });

    it("debería propagar errores del servicio Instagram", async () => {
      const contactId = "contact-456";
      const externalId = "instagram-user-123";
      const content = "Test message";
      const pageAccessToken = "page-access-token-ig";
      const credentials = { pageAccessToken };
      const encryptedCreds = "encrypted-creds-instagram";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "Jane Doe" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-2",
              encryptedCredentials: encryptedCreds,
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify(credentials)
      );

      const error = new Error("Instagram API unavailable");
      mockInstagramService.sendInstagramMessage.mockRejectedValueOnce(error);

      await expect(
        dispatcher.dispatch("instagram", contactId, content)
      ).rejects.toThrow("Instagram API unavailable");
    });

    it("debería propagar errores del servicio Telegram", async () => {
      const contactId = "contact-999";
      const externalId = "telegram-user-789";
      const content = "Test message";
      const botToken = "telegram-bot-token-123";
      const credentials = { botToken };
      const encryptedCreds = "encrypted-creds-telegram";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "Alice Johnson" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-4",
              encryptedCredentials: encryptedCreds,
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify(credentials)
      );

      mockTelegramService.initializeTelegramBot.mockResolvedValueOnce(undefined);
      const error = new Error("Telegram message delivery failed");
      mockTelegramService.sendTelegramMessage.mockRejectedValueOnce(error);

      await expect(
        dispatcher.dispatch("telegram", contactId, content)
      ).rejects.toThrow("Telegram message delivery failed");
    });

    it("debería propagar errores del servicio WebChat", async () => {
      const contactId = "contact-webchat";
      const externalId = "webchat-session-123";
      const content = "Test message";

      mockDb.select.mockReturnValueOnce(
        makeSelectChain([
          { id: contactId, externalId, name: "WebChat User" },
        ])
      );

      const error = new Error("WebChat connection lost");
      mockWebChatService.sendWebChatMessage.mockRejectedValueOnce(error);

      await expect(
        dispatcher.dispatch("webchat", contactId, content)
      ).rejects.toThrow("WebChat connection lost");
    });
  });

  describe("Multi-Channel Dispatch Patterns", () => {
    it("debería manejar secuencialmente múltiples mensajes a distintos canales", async () => {
      const contact1 = "contact-1";
      const contact2 = "contact-2";
      const externalId1 = "5491112345678";
      const externalId2 = "instagram-user-123";
      const messageContent = "Sequential dispatch test";

      // First dispatch: WhatsApp
      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contact1, externalId: externalId1, name: "User 1" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-wa",
              encryptedCredentials: "encrypted-wa",
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify({ phoneNumberId: "123" })
      );

      mockWhatsAppCloudApiService.sendWhatsAppTextMessage.mockResolvedValueOnce(
        undefined
      );

      await dispatcher.dispatch("whatsapp", contact1, messageContent);

      // Second dispatch: Instagram
      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contact2, externalId: externalId2, name: "User 2" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-ig",
              encryptedCredentials: "encrypted-ig",
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify({ pageAccessToken: "ig-token" })
      );

      mockInstagramService.sendInstagramMessage.mockResolvedValueOnce(undefined);

      await dispatcher.dispatch("instagram", contact2, messageContent);

      expect(mockWhatsAppCloudApiService.sendWhatsAppTextMessage).toHaveBeenCalledOnce();
      expect(mockInstagramService.sendInstagramMessage).toHaveBeenCalledOnce();
    });

    it("debería permitir reutilizar externalId para diferentes canales del mismo contacto", async () => {
      const contactId = "contact-omnichannell";
      const externalId = "user-12345"; // Could map to different channels
      const messageContent = "Omnichannel message";

      // Simulate sending same contact via multiple channels
      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "Omnichannel User" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-wa",
              encryptedCredentials: "encrypted-wa",
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify({ phoneNumberId: "123" })
      );

      mockWhatsAppCloudApiService.sendWhatsAppTextMessage.mockResolvedValueOnce(
        undefined
      );

      await dispatcher.dispatch("whatsapp", contactId, messageContent);

      // Verify the externalId is used as-is (caller responsible for mapping per channel)
      expect(
        mockWhatsAppCloudApiService.sendWhatsAppTextMessage
      ).toHaveBeenCalledWith({
        to: externalId,
        text: messageContent,
        phoneNumberId: "123",
      });
    });
  });

  describe("Edge Cases", () => {
    it("debería manejar contactos con nombre vacío", async () => {
      const contactId = "contact-noname";
      const externalId = "5491112345678";
      const content = "Message to contact without name";

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: null }, // No name
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-1",
              encryptedCredentials: "encrypted-creds",
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify({ phoneNumberId: "123" })
      );

      mockWhatsAppCloudApiService.sendWhatsAppTextMessage.mockResolvedValueOnce(
        undefined
      );

      await dispatcher.dispatch("whatsapp", contactId, content);

      expect(mockWhatsAppCloudApiService.sendWhatsAppTextMessage).toHaveBeenCalled();
    });

    it("debería manejar contenido de mensaje vacío", async () => {
      const contactId = "contact-123";
      const externalId = "5491112345678";
      const content = ""; // Empty content

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "John Doe" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-1",
              encryptedCredentials: "encrypted-creds",
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify({ phoneNumberId: "123" })
      );

      mockWhatsAppCloudApiService.sendWhatsAppTextMessage.mockResolvedValueOnce(
        undefined
      );

      await dispatcher.dispatch("whatsapp", contactId, content);

      // Should still dispatch, service validates content
      expect(mockWhatsAppCloudApiService.sendWhatsAppTextMessage).toHaveBeenCalledWith({
        to: externalId,
        text: content,
        phoneNumberId: "123",
      });
    });

    it("debería manejar credenciales con campos adicionales", async () => {
      const contactId = "contact-123";
      const externalId = "5491112345678";
      const content = "Message with extra creds";
      const credentials = {
        phoneNumberId: "123456789",
        extraField1: "value1",
        extraField2: { nested: true },
      };

      mockDb.select
        .mockReturnValueOnce(
          makeSelectChain([
            { id: contactId, externalId, name: "John Doe" },
          ])
        )
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: "cred-1",
              encryptedCredentials: "encrypted-creds",
            },
          ])
        );

      vi.mocked(encryptionModule.decryptCredentials).mockReturnValueOnce(
        JSON.stringify(credentials)
      );

      mockWhatsAppCloudApiService.sendWhatsAppTextMessage.mockResolvedValueOnce(
        undefined
      );

      await dispatcher.dispatch("whatsapp", contactId, content);

      // Should only use required fields
      expect(mockWhatsAppCloudApiService.sendWhatsAppTextMessage).toHaveBeenCalledWith({
        to: externalId,
        text: content,
        phoneNumberId: "123456789",
      });
    });
  });
});
