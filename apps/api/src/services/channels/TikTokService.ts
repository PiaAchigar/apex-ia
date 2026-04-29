import type { InboxService } from "../InboxService.js";
import { logger } from "../../utils/logger.js";

export interface TikTokWebhookPayload {
  from_user_id?: string;
  from_display_name?: string;
  msg_id?: string;
  create_time?: number;
  content?: string;
  video_id?: string;
  image_id?: string;
}

export class TikTokService {
  constructor(private readonly inboxService: InboxService) {}

  async handleIncomingTikTokWebhook(
    payload: TikTokWebhookPayload
  ): Promise<{ conversationId: string; message: unknown } | null> {
    try {
      const {
        from_user_id,
        from_display_name,
        msg_id,
        create_time,
        content,
        video_id,
        image_id,
      } = payload;

      if (!from_user_id || !msg_id) {
        logger.warn(
          { payload },
          "TikTok webhook missing required fields: from_user_id or msg_id"
        );
        return null;
      }

      let mediaType: "image" | "video" | "audio" | "document" | undefined;
      let messageText = content || "";

      if (video_id) {
        mediaType = "video";
        if (!messageText) messageText = `[Video: ${video_id}]`;
      } else if (image_id) {
        mediaType = "image";
        if (!messageText) messageText = `[Image: ${image_id}]`;
      }

      if (!messageText) messageText = "[Media message]";

      const messagePayload: {
        channel: "tiktok";
        externalId: string;
        senderExternalId: string;
        content: string;
        mediaUrl?: string;
        mediaType?: "image" | "video" | "audio" | "document";
        rawPayload: Record<string, unknown>;
      } = {
        channel: "tiktok",
        externalId: msg_id,
        senderExternalId: from_user_id,
        content: messageText,
        rawPayload: {
          senderName: from_display_name,
          tiktokUserId: from_user_id,
          videoId: video_id,
          imageId: image_id,
          timestamp: create_time,
        },
      };

      if (mediaType) messagePayload.mediaType = mediaType;

      const result = await this.inboxService.createConversationFromIncomingMessage(
        messagePayload as any
      );

      return result;
    } catch (error) {
      logger.error(
        { error, payload },
        "Error processing TikTok message in TikTokService"
      );
      return null;
    }
  }

  async sendTikTokDirectMessage(
    recipientId: string,
    text: string,
    accessToken: string
  ): Promise<void> {
    try {
      const response = await fetch(
        "https://business-api.tiktok.com/open_api/v1.3/customer_service/message/send/",
        {
          method: "POST",
          headers: {
            "Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient_id: recipientId,
            message_type: "text",
            text: { content: text },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `TikTok API error: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      logger.info(
        { recipientId },
        "TikTok direct message sent successfully"
      );
    } catch (error) {
      logger.error(
        { error, recipientId },
        "Error sending TikTok direct message"
      );
      throw error;
    }
  }
}
