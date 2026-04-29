import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreateTransport, mockVerify, mockClose, mockSendMail } = vi.hoisted(() => ({
  mockCreateTransport: vi.fn(),
  mockVerify: vi.fn(),
  mockClose: vi.fn(),
  mockSendMail: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { EmailService } from "../../src/services/channels/EmailService.js";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
};

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

function makeInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
}

describe("EmailService", () => {
  let service: EmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTransport.mockReturnValue({
      sendMail: mockSendMail,
      verify: mockVerify,
      close: mockClose,
    });
    vi.stubEnv("SMTP_HOST", "smtp.gmail.com");
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("SMTP_USER", "test@gmail.com");
    vi.stubEnv("SMTP_PASS", "password123");
    service = new EmailService(mockDb as never);
  });

  describe("sendEmail", () => {
    it("debería enviar un email correctamente", async () => {
      mockSendMail.mockResolvedValueOnce({ accepted: ["recipient@example.com"] });

      await expect(
        service.sendEmail(
          "recipient@example.com",
          "Test Subject",
          "<h1>Test</h1>",
          "sender@example.com"
        )
      ).resolves.not.toThrow();

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "recipient@example.com",
          subject: "Test Subject",
          from: "sender@example.com",
          html: "<h1>Test</h1>",
        })
      );
    });

    it("debería lanzar error si el servicio no está configurado", async () => {
      mockCreateTransport.mockReturnValueOnce(null);
      const serviceWithoutConfig = new EmailService();

      await expect(
        serviceWithoutConfig.sendEmail(
          "recipient@example.com",
          "Test",
          "<h1>Test</h1>"
        )
      ).rejects.toThrow("EMAIL_SERVICE_NOT_CONFIGURED");
    });
  });

  describe("configureSmtp", () => {
    it("debería validar la conexión SMTP antes de guardar", async () => {
      mockVerify.mockResolvedValueOnce(true);

      await service.configureSmtp({
        host: "smtp.gmail.com",
        port: 587,
        user: "test@gmail.com",
        pass: "password123",
        fromName: "My App",
      });

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "smtp.gmail.com",
          port: 587,
        })
      );
      expect(mockVerify).toHaveBeenCalled();
    });

    it("debería lanzar error si la validación falla", async () => {
      mockVerify.mockRejectedValueOnce(new Error("Connection refused"));

      await expect(
        service.configureSmtp({
          host: "invalid.host",
          port: 587,
          user: "test@gmail.com",
          pass: "wrong",
          fromName: "App",
        })
      ).rejects.toThrow();
    });
  });

  describe("testSmtpConnection", () => {
    it("debería retornar success: true si la conexión es válida", async () => {
      mockVerify.mockResolvedValueOnce(true);
      mockClose.mockResolvedValueOnce(undefined);

      const result = await service.testSmtpConnection({
        host: "smtp.gmail.com",
        port: 587,
        user: "test@gmail.com",
        pass: "password123",
        fromName: "App",
      });

      expect(result.success).toBe(true);
      expect(mockVerify).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });

    it("debería retornar error si la conexión falla", async () => {
      mockVerify.mockRejectedValueOnce(new Error("Connection refused"));
      mockClose.mockResolvedValueOnce(undefined);

      const result = await service.testSmtpConnection({
        host: "invalid.host",
        port: 587,
        user: "test@gmail.com",
        pass: "wrong",
        fromName: "App",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Connection refused");
    });
  });

  describe("handleIncomingEmail", () => {
    it("debería crear un contacto y una conversación a partir de un email entrante", async () => {
      const fakeContact = {
        id: "contact-1",
        email: "sender@example.com",
        name: "sender",
      };

      const fakeConversation = {
        id: "conv-1",
        contactId: "contact-1",
        channel: "email",
        status: "open",
      };

      const fakeMessage = {
        id: "msg-1",
        conversationId: "conv-1",
        content: "Test email body",
        senderType: "contact",
      };

      // Select contact (no existe) + select conversation (no existe)
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]));

      // Insert contact + conversation + message
      mockDb.insert
        .mockReturnValueOnce(makeInsertChain([fakeContact]))
        .mockReturnValueOnce(makeInsertChain([fakeConversation]))
        .mockReturnValueOnce(makeInsertChain([fakeMessage]));

      const result = await service.handleIncomingEmail({
        from: "sender@example.com",
        to: "myapp@example.com",
        subject: "Test",
        html: "Test email body",
        text: "Test email body",
      });

      expect(result).toBeDefined();
      expect(result?.conversationId).toBe("conv-1");
      expect(result?.messageId).toBe("msg-1");
    });

    it("debería reutilizar una conversación abierta existente", async () => {
      const fakeContact = {
        id: "contact-1",
        email: "sender@example.com",
        name: "sender",
      };

      const fakeConversation = {
        id: "conv-1",
        contactId: "contact-1",
        channel: "email",
        status: "open",
      };

      const fakeMessage = {
        id: "msg-2",
        conversationId: "conv-1",
        content: "Another email",
        senderType: "contact",
      };

      // Select contact (existe) + select conversation (existe)
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([fakeContact]))
        .mockReturnValueOnce(makeSelectChain([fakeConversation]));

      // Insert solo message
      mockDb.insert.mockReturnValueOnce(makeInsertChain([fakeMessage]));

      const result = await service.handleIncomingEmail({
        from: "sender@example.com",
        to: "myapp@example.com",
        subject: "Follow-up",
        html: "Another email",
        text: "Another email",
      });

      expect(result?.conversationId).toBe("conv-1");
      expect(result?.messageId).toBe("msg-2");
    });

    it("debería retornar null si la DB no está configurada", async () => {
      const serviceNoDB = new EmailService();
      const result = await serviceNoDB.handleIncomingEmail({
        from: "sender@example.com",
        to: "myapp@example.com",
        subject: "Test",
        html: "Test",
        text: "Test",
      });

      expect(result).toBeNull();
    });
  });
});
