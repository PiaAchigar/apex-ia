import { eq, and, isNull, desc, sql } from "drizzle-orm";
import {
  conversations,
  contacts,
  messages,
} from "@apex-ia/database/schema/tenant";
import type { DrizzleDb } from "../db/drizzle.js";
import type {
  IncomingMessagePayload,
  InboxFiltersType,
  ChannelType,
} from "@apex-ia/types";
import { logger } from "../utils/logger.js";
import { AiResponseService } from "./AiResponseService.js";
import { FlowBuilderService } from "./FlowBuilderService.js";

export class InboxService {
  private aiService: AiResponseService;

  constructor(private readonly tenantDb: DrizzleDb, private readonly organizationId?: string) {
    this.aiService = new AiResponseService(tenantDb, organizationId);
  }

  async createConversationFromIncomingMessage(
    payload: IncomingMessagePayload
  ) {
    const { channel, senderExternalId, content, mediaUrl, mediaType, rawPayload } = payload;

    const channelIdField = this.getChannelIdField(channel);
    const existingContact = await this.tenantDb
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts[channelIdField] as never, senderExternalId))
      .limit(1);

    let contactId: string;

    if (existingContact.length > 0 && existingContact[0]) {
      contactId = existingContact[0].id;
    } else {
      const [newContact] = await this.tenantDb
        .insert(contacts)
        .values({ [channelIdField]: senderExternalId })
        .returning({ id: contacts.id });

      if (!newContact) throw new Error("Failed to create contact");
      contactId = newContact.id;
    }

    const openConversation = await this.tenantDb
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.contactId, contactId),
          eq(conversations.channel, channel),
          eq(conversations.status, "open")
        )
      )
      .limit(1);

    let conversationId: string;

    if (openConversation.length > 0 && openConversation[0]) {
      conversationId = openConversation[0].id;

      await this.tenantDb
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          messageCount: sql`${conversations.messageCount} + 1`,
        })
        .where(eq(conversations.id, conversationId));
    } else {
      const [newConversation] = await this.tenantDb
        .insert(conversations)
        .values({
          contactId,
          channel,
          status: "open",
          messageCount: 1,
          lastMessageAt: new Date(),
        })
        .returning({ id: conversations.id });

      if (!newConversation) throw new Error("Failed to create conversation");
      conversationId = newConversation.id;
    }

    let messageMetadata = rawPayload ?? {};
    let finalContent = content ?? "";

    if (mediaType === "audio" && mediaUrl) {
      try {
        const audioBuffer = await this.fetchAudioBuffer(mediaUrl);
        const transcript = await this.aiService.transcribeAudioMessage(
          audioBuffer,
          "audio/webm"
        );
        messageMetadata = { ...messageMetadata, transcript };
        if (!finalContent) {
          finalContent = `[Audio message: ${transcript}]`;
        }
      } catch (error) {
        logger.warn({ error, mediaUrl }, "Failed to transcribe audio, continuing without transcript");
      }
    }

    const [newMessage] = await this.tenantDb
      .insert(messages)
      .values({
        conversationId,
        senderType: "contact",
        content: finalContent || null,
        mediaUrl: mediaUrl ?? null,
        mediaType: mediaType ?? null,
        metadataJson: messageMetadata,
        isRead: false,
      })
      .returning();

    logger.info({ conversationId, channel }, "Incoming message processed");

    if (this.organizationId) {
      const flowService = new FlowBuilderService(this.tenantDb, this.organizationId);
      const activeFlows = await flowService.getActiveFlowsByTriggerType("incoming_message");
      for (const flow of activeFlows) {
        const nodes = (flow.nodesJson as never[]) ?? [];
        const edges = (flow.edgesJson as never[]) ?? [];
        try {
          const result = await flowService.executeFlow(nodes, edges, {
            messageText: finalContent,
            channel,
            conversationId,
          });
          for (const step of result.steps) {
            if (step.type === "ai_response" && step.status === "executed" && step.output?.["aiResponse"]) {
              await this.tenantDb.insert(messages).values({
                conversationId,
                senderType: "bot",
                content: String(step.output["aiResponse"]),
                isRead: false,
              });
            }
          }
        } catch (error) {
          logger.warn({ error, flowId: flow.id }, "Error executing incoming_message flow");
        }
      }
    }

    return { conversationId, contactId, message: newMessage };
  }

  private async fetchAudioBuffer(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      logger.error({ error, url }, "Error fetching audio buffer");
      throw error;
    }
  }

  async getConversationsForAgent(
    agentId: string,
    filters: InboxFiltersType
  ) {
    const { tab, channel, status, page = 1, limit = 30 } = filters;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (tab === "unassigned") {
      conditions.push(isNull(conversations.assignedAgentId));
    } else if (tab === "mine") {
      conditions.push(eq(conversations.assignedAgentId, agentId));
    } else if (tab === "assigned") {
      conditions.push(
        and(
          sql`${conversations.assignedAgentId} IS NOT NULL`,
          sql`${conversations.assignedAgentId} != ${agentId}`
        )
      );
    }

    if (channel) conditions.push(eq(conversations.channel, channel));
    if (status) conditions.push(eq(conversations.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.tenantDb
      .select()
      .from(conversations)
      .where(whereClause)
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit)
      .offset(offset);

    return rows;
  }

  async assignConversationToAgent(
    conversationId: string,
    agentId: string
  ) {
    const existing = await this.tenantDb
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!existing[0]) {
      throw new Error("CONVERSATION_NOT_FOUND");
    }

    await this.tenantDb
      .update(conversations)
      .set({ assignedAgentId: agentId })
      .where(eq(conversations.id, conversationId));
  }

  async markConversationAsResolved(conversationId: string) {
    await this.tenantDb
      .update(conversations)
      .set({ status: "resolved" })
      .where(eq(conversations.id, conversationId));
  }

  async markConversationAsPending(conversationId: string) {
    await this.tenantDb
      .update(conversations)
      .set({ status: "pending" })
      .where(eq(conversations.id, conversationId));
  }

  private getChannelIdField(channel: ChannelType) {
    const fieldMap: Partial<Record<ChannelType, keyof typeof contacts.$inferSelect>> = {
      whatsapp: "whatsappId",
      whatsapp_qr: "whatsappId",
      instagram: "instagramId",
      facebook: "facebookId",
      telegram: "telegramId",
      webchat: "email",
    };
    return fieldMap[channel] ?? "phone";
  }
}
