import { eq, and, desc, asc } from "drizzle-orm";
import {
  conversations,
  messages,
  contacts,
} from "@apex-ia/database/schema/tenant";
import type { DrizzleDb } from "../db/drizzle.js";
import { logger } from "../utils/logger.js";

type PaginationInput = {
  page?: number;
  limit?: number;
  before?: string;
};

export class ConversationService {
  constructor(private readonly tenantDb: DrizzleDb) {}

  async sendOutgoingMessageToChannel(
    conversationId: string,
    content: string,
    agentId: string
  ) {
    const conversation = await this.tenantDb
      .select({
        id: conversations.id,
        channel: conversations.channel,
        contactId: conversations.contactId,
        status: conversations.status,
      })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conversation[0]) {
      throw new Error("CONVERSATION_NOT_FOUND");
    }

    if (conversation[0].status === "resolved") {
      throw new Error("CONVERSATION_RESOLVED: No se puede enviar a una conversación resuelta");
    }

    const [newMessage] = await this.tenantDb
      .insert(messages)
      .values({
        conversationId,
        senderType: "agent",
        content,
        isRead: true,
        metadataJson: { agentId },
      })
      .returning();

    if (!newMessage) throw new Error("Failed to insert message");

    await this.tenantDb
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));

    logger.info(
      { conversationId, agentId, channel: conversation[0].channel },
      "Outgoing message sent"
    );

    return {
      message: newMessage,
      channel: conversation[0].channel as "whatsapp" | "instagram" | "facebook" | "telegram" | "webchat",
      contactId: conversation[0].contactId,
    };
  }

  async getMessagesForConversation(
    conversationId: string,
    pagination: PaginationInput = {}
  ) {
    const { page = 1, limit = 50 } = pagination;
    const offset = (page - 1) * limit;

    const rows = await this.tenantDb
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    return rows;
  }

  async markMessagesAsRead(conversationId: string, _agentId: string) {
    await this.tenantDb
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.isRead, false)
        )
      );
  }

  async getConversationWithContact(conversationId: string) {
    const conversation = await this.tenantDb
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conversation[0]) return null;

    const contact = await this.tenantDb
      .select()
      .from(contacts)
      .where(eq(contacts.id, conversation[0].contactId))
      .limit(1);

    return {
      ...conversation[0],
      contact: contact[0] ?? null,
    };
  }
}
