import type { InboxService } from "../InboxService.js";
import { logger } from "../../utils/logger.js";

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name: string; last_name?: string; username?: string };
    chat: { id: number; type: string };
    date: number;
    text?: string;
    photo?: { file_id: string; file_size?: number }[];
    audio?: { file_id: string; duration: number };
    voice?: { file_id: string; duration: number };
    video?: { file_id: string; duration: number };
    document?: { file_id: string; file_name?: string };
    caption?: string;
  };
};

type TelegramBotInstance = {
  telegram: {
    sendMessage: (chatId: number | string, text: string, opts?: object) => Promise<unknown>;
    setWebhook: (url: string) => Promise<boolean>;
    deleteWebhook: () => Promise<boolean>;
  };
  launch: (opts?: object) => Promise<void>;
  stop: (reason?: string) => void;
};

export class TelegramService {
  private bot: TelegramBotInstance | null = null;
  private botToken: string | null = null;

  constructor(private readonly inboxService: InboxService) {}

  async initializeTelegramBot(token: string): Promise<void> {
    this.botToken = token;

    const { Telegraf } = await import("telegraf");
    this.bot = new Telegraf(token) as unknown as TelegramBotInstance;

    logger.info("Telegram bot initialized");
  }

  async handleIncomingTelegramUpdate(
    update: TelegramUpdate
  ): Promise<{ conversationId: string; message: unknown } | null> {
    if (!update.message) return null;

    const msg = update.message;
    const chatId = msg.chat.id.toString();
    const senderId = msg.from?.id.toString() ?? chatId;

    let content: string | undefined = msg.text;
    let mediaType: "image" | "audio" | "video" | "document" | undefined;
    let mediaUrl: string | undefined;

    if (msg.photo?.length) {
      mediaType = "image";
      const largestPhoto = msg.photo.at(-1);
      if (largestPhoto) {
        mediaUrl = await this.getFileUrl(largestPhoto.file_id);
        content = msg.caption;
      }
    } else if (msg.audio) {
      mediaType = "audio";
      mediaUrl = await this.getFileUrl(msg.audio.file_id);
    } else if (msg.voice) {
      mediaType = "audio";
      mediaUrl = await this.getFileUrl(msg.voice.file_id);
    } else if (msg.video) {
      mediaType = "video";
      mediaUrl = await this.getFileUrl(msg.video.file_id);
    } else if (msg.document) {
      mediaType = "document";
      mediaUrl = await this.getFileUrl(msg.document.file_id);
    }

    try {
      const result = await this.inboxService.createConversationFromIncomingMessage({
        channel: "telegram",
        externalId: `${chatId}_${msg.message_id}`,
        senderExternalId: senderId,
        content,
        mediaUrl,
        mediaType,
        rawPayload: { update, senderName: msg.from?.first_name },
      });

      return result
        ? {
            conversationId: result.conversationId,
            message: result.message,
          }
        : null;
    } catch (err) {
      logger.error({ err, chatId }, "Error processing Telegram message");
      return null;
    }
  }

  async sendTelegramMessage(chatId: string, text: string): Promise<void> {
    if (!this.bot) {
      if (!this.botToken) throw new Error("Telegram bot not initialized");
      await this.initializeTelegramBot(this.botToken);
    }

    await this.bot!.telegram.sendMessage(parseInt(chatId), text, {
      parse_mode: "HTML",
    });

    logger.info({ chatId }, "Telegram message sent");
  }

  private async getFileUrl(fileId: string): Promise<string> {
    if (!this.botToken) return "";

    const response = await fetch(
      `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${fileId}`
    );

    if (!response.ok) return "";

    const data = await response.json() as { result?: { file_path?: string } };
    const filePath = data.result?.file_path;
    if (!filePath) return "";

    return `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
  }
}
