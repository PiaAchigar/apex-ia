import { createHmac } from "crypto";
import type { InboxService } from "../InboxService.js";
import { logger } from "../../utils/logger.js";

const META_API_BASE = "https://graph.facebook.com/v21.0";

type MessengerEntry = {
  id: string;
  time: number;
  messaging?: {
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: {
      mid: string;
      text?: string;
      attachments?: { type: string; payload: { url?: string } }[];
    };
    postback?: { title: string; payload: string };
  }[];
};

export class FacebookMessengerService {
  constructor(private readonly inboxService: InboxService) {}

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const appSecret = process.env["META_APP_SECRET"];
    if (!appSecret) return false;

    const expected = createHmac("sha256", appSecret)
      .update(payload)
      .digest("hex");

    return `sha256=${expected}` === signature;
  }

  async handleIncomingMessengerWebhook(body: {
    object: string;
    entry: MessengerEntry[];
  }) {
    if (body.object !== "page") return;

    for (const entry of body.entry) {
      const messaging = entry.messaging ?? [];

      for (const event of messaging) {
        if (!event.message) continue;

        try {
          const msg = event.message;
          let content: string | undefined = msg.text;
          let mediaUrl: string | undefined;
          let mediaType: "image" | "audio" | "video" | "document" | undefined;

          if (msg.attachments?.length) {
            const att = msg.attachments[0];
            if (att) {
              if (att.type === "image") { mediaType = "image"; mediaUrl = att.payload.url; }
              else if (att.type === "audio") { mediaType = "audio"; mediaUrl = att.payload.url; }
              else if (att.type === "video") { mediaType = "video"; mediaUrl = att.payload.url; }
            }
          }

          await this.inboxService.createConversationFromIncomingMessage({
            channel: "facebook",
            externalId: msg.mid,
            senderExternalId: event.sender.id,
            content,
            mediaUrl,
            mediaType,
            rawPayload: { event, pageId: entry.id },
          });
        } catch (err) {
          logger.error({ err }, "Error processing Messenger message");
        }
      }
    }
  }

  async sendMessengerTextMessage(
    recipientId: string,
    text: string,
    pageToken: string
  ) {
    const response = await fetch(`${META_API_BASE}/me/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pageToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        messaging_type: "RESPONSE",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Messenger API error: ${JSON.stringify(error)}`);
    }

    return response.json();
  }
}
