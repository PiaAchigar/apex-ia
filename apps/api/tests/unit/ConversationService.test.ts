import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConversationService } from "../../src/services/ConversationService.js";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

describe("ConversationService", () => {
  let service: ConversationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ConversationService(mockDb as never);
  });

  describe("sendOutgoingMessageToChannel", () => {
    it("debería lanzar error si la conversación no existe", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      await expect(
        service.sendOutgoingMessageToChannel("ghost-conv", "hola", "agent-1")
      ).rejects.toThrow("CONVERSATION_NOT_FOUND");
    });

    it("debería lanzar error si la conversación está resuelta", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: "conv-1", status: "resolved", channel: "whatsapp", contactId: "c-1" },
        ]),
      });

      await expect(
        service.sendOutgoingMessageToChannel("conv-1", "hola", "agent-1")
      ).rejects.toThrow("CONVERSATION_RESOLVED");
    });

    it("debería insertar mensaje y actualizar lastMessageAt si la conversación está abierta", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: "conv-1", status: "open", channel: "whatsapp", contactId: "c-1" },
        ]),
      });

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: "msg-out-1", content: "hola" }]),
      });

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      });

      const msg = await service.sendOutgoingMessageToChannel(
        "conv-1",
        "hola",
        "agent-1"
      );

      expect(msg.id).toBe("msg-out-1");
      expect(mockDb.update).toHaveBeenCalledOnce();
    });
  });

  describe("getMessagesForConversation", () => {
    it("debería retornar lista de mensajes ordenados", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([
          { id: "m1", content: "a" },
          { id: "m2", content: "b" },
        ]),
      });

      const rows = await service.getMessagesForConversation("conv-1");
      expect(rows).toHaveLength(2);
    });
  });

  describe("getConversationWithContact", () => {
    it("debería retornar null si la conversación no existe", async () => {
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        });

      const result = await service.getConversationWithContact("ghost-id");
      expect(result).toBeNull();
    });

    it("debería retornar conversación con contacto", async () => {
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([{ id: "conv-1", contactId: "c-1" }]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([{ id: "c-1", whatsappId: "5491112345678" }]),
        });

      const result = await service.getConversationWithContact("conv-1");
      expect(result?.id).toBe("conv-1");
      expect(result?.contact?.id).toBe("c-1");
    });
  });
});
