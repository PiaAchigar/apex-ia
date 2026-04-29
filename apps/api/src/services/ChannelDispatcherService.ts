import { eq, and } from "drizzle-orm";
import type { DrizzleDb } from "@apex-ia/database";
import { contacts, channelCredentials } from "@apex-ia/database/schema/tenant";
import type { SocketIOInstance } from "../socket/socketServer.js";
import { decryptCredentials } from "../utils/encryption.js";
import { logger } from "../utils/logger.js";
import { WhatsAppCloudApiService } from "./channels/WhatsAppCloudApiService.js";
import { BaileysWhatsAppService } from "./channels/BaileysWhatsAppService.js";
import { InstagramService } from "./channels/InstagramService.js";
import { FacebookMessengerService } from "./channels/FacebookMessengerService.js";
import { TelegramService } from "./channels/TelegramService.js";
import { WebChatService } from "./channels/WebChatService.js";
import { EmailService } from "./channels/EmailService.js";
import { InboxService } from "./InboxService.js";

type ChannelType = "whatsapp" | "whatsapp_qr" | "instagram" | "facebook" | "telegram" | "webchat" | "email";

type ChannelCredentialsPayload = Record<string, unknown> & {
  phoneNumberId?: string;
  pageAccessToken?: string;
  botToken?: string;
};

export class ChannelDispatcherService {
  constructor(
    private readonly tenantDb: DrizzleDb,
    private readonly io: SocketIOInstance
  ) {}

  async dispatch(
    channel: ChannelType,
    contactId: string,
    content: string
  ): Promise<void> {
    try {
      // Get contact to obtain externalId for the channel
      const contact = await this.tenantDb
        .select({
          id: contacts.id,
          externalId: contacts.externalId,
          name: contacts.name,
        })
        .from(contacts)
        .where(eq(contacts.id, contactId))
        .limit(1);

      if (!contact[0]) {
        logger.error({ contactId }, "Contact not found for dispatch");
        throw new Error("CONTACT_NOT_FOUND");
      }

      const externalId = contact[0].externalId;

      // Special case: WebChat uses Socket.IO, not external API
      if (channel === "webchat") {
        const webchatService = new WebChatService({} as never);
        await webchatService.sendWebChatMessage(externalId, content, this.io);
        logger.info({ contactId, externalId }, "WebChat message sent");
        return;
      }

      // Get channel credentials
      const cred = await this.tenantDb
        .select({
          id: channelCredentials.id,
          encryptedCredentials: channelCredentials.encryptedCredentials,
        })
        .from(channelCredentials)
        .where(
          and(
            eq(channelCredentials.channelType, channel),
            eq(channelCredentials.isActive, true)
          )
        )
        .limit(1);

      if (!cred[0]) {
        logger.error(
          { channel, contactId },
          `No active credentials found for channel ${channel}`
        );
        throw new Error(`NO_CREDENTIALS_FOR_CHANNEL_${channel.toUpperCase()}`);
      }

      // Decrypt credentials
      let credentials: ChannelCredentialsPayload;
      try {
        credentials = JSON.parse(decryptCredentials(cred[0].encryptedCredentials));
      } catch (err) {
        logger.error({ err, channel }, "Failed to decrypt channel credentials");
        throw new Error("CREDENTIALS_DECRYPTION_FAILED");
      }

      // Dispatch based on channel type
      switch (channel) {
        case "whatsapp":
          await this.dispatchWhatsApp(externalId, content, credentials);
          break;
        case "whatsapp_qr":
          await this.dispatchWhatsAppQR(externalId, content, credentials);
          break;
        case "instagram":
          await this.dispatchInstagram(externalId, content, credentials);
          break;
        case "facebook":
          await this.dispatchFacebook(externalId, content, credentials);
          break;
        case "telegram":
          await this.dispatchTelegram(externalId, content, credentials);
          break;
        case "email":
          await this.dispatchEmail(externalId, content);
          break;
        default:
          throw new Error(`UNSUPPORTED_CHANNEL: ${channel}`);
      }

      logger.info(
        { channel, contactId, externalId },
        `Message dispatched to ${channel}`
      );
    } catch (err) {
      logger.error(
        { err, channel, contactId },
        `Failed to dispatch message to ${channel}`
      );
      throw err;
    }
  }

  private async dispatchWhatsApp(
    externalId: string,
    content: string,
    credentials: ChannelCredentialsPayload
  ): Promise<void> {
    const { phoneNumberId } = credentials as {
      phoneNumberId: string;
    };

    if (!phoneNumberId) {
      throw new Error("Missing phoneNumberId in WhatsApp credentials");
    }

    const waService = new WhatsAppCloudApiService(
      new InboxService(this.tenantDb),
      { sendOutgoingMessageToChannel: async () => {} } as never
    );

    await waService.sendWhatsAppTextMessage({
      to: externalId,
      text: content,
      phoneNumberId,
    });
  }

  private async dispatchInstagram(
    externalId: string,
    content: string,
    credentials: ChannelCredentialsPayload
  ): Promise<void> {
    const { pageAccessToken } = credentials as {
      pageAccessToken: string;
    };

    if (!pageAccessToken) {
      throw new Error("Missing pageAccessToken in Instagram credentials");
    }

    const igService = new InstagramService(new InboxService(this.tenantDb));
    await igService.sendInstagramMessage(externalId, content, pageAccessToken);
  }

  private async dispatchFacebook(
    externalId: string,
    content: string,
    credentials: ChannelCredentialsPayload
  ): Promise<void> {
    const { pageAccessToken } = credentials as {
      pageAccessToken: string;
    };

    if (!pageAccessToken) {
      throw new Error("Missing pageAccessToken in Facebook credentials");
    }

    const fbService = new FacebookMessengerService(new InboxService(this.tenantDb));
    await fbService.sendMessengerMessage(externalId, content, pageAccessToken);
  }

  private async dispatchWhatsAppQR(
    externalId: string,
    content: string,
    credentials: ChannelCredentialsPayload
  ): Promise<void> {
    const { sessionId } = credentials as {
      sessionId: string;
    };

    if (!sessionId) {
      throw new Error("Missing sessionId in WhatsApp QR credentials");
    }

    const baileysService = new BaileysWhatsAppService(new InboxService(this.tenantDb));
    await baileysService.sendBaileysTextMessage(sessionId, externalId, content);
  }

  private async dispatchEmail(externalId: string, content: string): Promise<void> {
    const emailService = new EmailService();
    // Convert HTML content to plain text for email body
    const plainTextContent = content.replace(/<[^>]*>/g, "").trim();
    await emailService.sendEmail(
      externalId,
      "Mensaje de Apex IA",
      `<p>${plainTextContent}</p>`
    );
  }

  private async dispatchTelegram(
    externalId: string,
    content: string,
    credentials: ChannelCredentialsPayload
  ): Promise<void> {
    const { botToken } = credentials as {
      botToken: string;
    };

    if (!botToken) {
      throw new Error("Missing botToken in Telegram credentials");
    }

    const tgService = new TelegramService(new InboxService(this.tenantDb));
    await tgService.initializeTelegramBot(botToken);
    await tgService.sendTelegramMessage(externalId, content);
  }
}
