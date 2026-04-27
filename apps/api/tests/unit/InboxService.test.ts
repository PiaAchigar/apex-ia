import { describe, it, expect, vi, beforeEach } from "vitest";
import { InboxService } from "../../src/services/InboxService.js";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    offset: vi.fn().mockReturnThis(),
  };
}

function makeInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
}

function makeUpdateChain() {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
}

describe("InboxService", () => {
  let inboxService: InboxService;

  beforeEach(() => {
    vi.clearAllMocks();
    inboxService = new InboxService(mockDb as never);
  });

  describe("createConversationFromIncomingMessage", () => {
    it("debería crear contacto y conversación nuevos si no existen", async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]));

      mockDb.insert
        .mockReturnValueOnce(makeInsertChain([{ id: "contact-1" }]))
        .mockReturnValueOnce(makeInsertChain([{ id: "conv-1" }]))
        .mockReturnValueOnce(makeInsertChain([{ id: "msg-1", content: "hola" }]));

      const result = await inboxService.createConversationFromIncomingMessage({
        channel: "whatsapp",
        externalId: "msg-ext-1",
        senderExternalId: "5491112345678",
        content: "hola",
        rawPayload: {},
      });

      expect(result.conversationId).toBe("conv-1");
      expect(result.contactId).toBe("contact-1");
    });

    it("debería reusar contacto y conversación existentes", async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([{ id: "contact-existing" }]))
        .mockReturnValueOnce(makeSelectChain([{ id: "conv-existing" }]));

      mockDb.update.mockReturnValueOnce(makeUpdateChain());
      mockDb.insert.mockReturnValueOnce(makeInsertChain([{ id: "msg-2", content: "otro" }]));

      const result = await inboxService.createConversationFromIncomingMessage({
        channel: "whatsapp",
        externalId: "msg-ext-2",
        senderExternalId: "5491112345678",
        content: "otro",
        rawPayload: {},
      });

      expect(result.conversationId).toBe("conv-existing");
      expect(result.contactId).toBe("contact-existing");
      expect(mockDb.update).toHaveBeenCalledOnce();
    });
  });

  describe("getConversationsForAgent", () => {
    it("debería filtrar por tab 'unassigned' (sin assigned_agent_id)", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue([
            { id: "conv-1", assignedAgentId: null },
          ]),
        }),
      });

      const rows = await inboxService.getConversationsForAgent("agent-1", {
        tab: "unassigned",
        page: 1,
        limit: 10,
      });

      expect(Array.isArray(rows)).toBe(true);
    });

    it("debería filtrar por tab 'mine' (assignedAgentId = agentId)", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue([
            { id: "conv-mine", assignedAgentId: "agent-99" },
          ]),
        }),
      });

      const rows = await inboxService.getConversationsForAgent("agent-99", {
        tab: "mine",
        page: 1,
        limit: 10,
      });

      expect(Array.isArray(rows)).toBe(true);
    });
  });

  describe("assignConversationToAgent", () => {
    it("debería lanzar error si la conversación no existe", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      await expect(
        inboxService.assignConversationToAgent("conv-ghost", "agent-1")
      ).rejects.toThrow("CONVERSATION_NOT_FOUND");
    });

    it("debería asignar correctamente si la conversación existe", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: "conv-real" }]),
      });

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      });

      await expect(
        inboxService.assignConversationToAgent("conv-real", "agent-1")
      ).resolves.not.toThrow();
    });
  });
});
