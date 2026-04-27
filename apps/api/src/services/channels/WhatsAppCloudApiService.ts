import { createHmac } from "crypto";
import type { InboxService } from "../InboxService.js";
import type { ConversationService } from "../ConversationService.js";
import { logger } from "../../utils/logger.js";

type WhatsAppTextMessage = {
  to: string;
  text: string;
  phoneNumberId: string;
};

type WhatsAppMediaMessage = {
  to: string;
  mediaUrl: string;
  mediaType: "image" | "audio" | "video" | "document";
  phoneNumberId: string;
  caption?: string;
};

type WhatsAppTemplateMessage = {
  to: string;
  templateName: string;
  languageCode: string;
  params: { type: "text"; text: string }[];
  phoneNumberId: string;
};

type WebhookEntry = {
  id: string;
  changes: {
    value: {
      messaging_product: string;
      metadata: { phone_number_id: string };
      contacts?: { profile: { name: string }; wa_id: string }[];
      messages?: {
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: { body: string };
        image?: { id: string; mime_type: string };
        audio?: { id: string; mime_type: string };
        video?: { id: string; mime_type: string };
        document?: { id: string; filename: string; mime_type: string };
      }[];
    };
    field: string;
  }[];
};

const META_API_BASE = "https://graph.facebook.com/v21.0";

export class WhatsAppCloudApiService {
  constructor(
    private readonly inboxService: InboxService,
    private readonly conversationService: ConversationService
  ) {}

  verifyWhatsAppWebhookChallenge(
    mode: string,
    token: string,
    challenge: string
  ): string | null {
    const verifyToken = process.env["WHATSAPP_VERIFY_TOKEN"];
    if (mode === "subscribe" && token === verifyToken) {
      return challenge;
    }
    return null;
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const appSecret = process.env["META_APP_SECRET"];
    if (!appSecret) return false;

    const expected = createHmac("sha256", appSecret)
      .update(payload)
      .digest("hex");

    return `sha256=${expected}` === signature;
  }

  async handleIncomingWhatsAppWebhook(
    body: { object: string; entry: WebhookEntry[] }
  ): Promise<{ conversationId: string; contactId: string; message: unknown } | null> {
    if (body.object !== "whatsapp_business_account") return null;

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field !== "messages") continue;

        const value = change.value;
        const incomingMessages = value.messages ?? [];

        for (const msg of incomingMessages) {
          try {
            const senderName =
              value.contacts?.find((c) => c.wa_id === msg.from)?.profile.name;

            let content: string | undefined;
            let mediaUrl: string | undefined;
            let mediaType: "image" | "audio" | "video" | "document" | undefined;

            if (msg.type === "text") {
              content = msg.text?.body;
            } else if (msg.type === "image" && msg.image) {
              mediaType = "image";
              mediaUrl = await this.getMediaUrl(msg.image.id);
            } else if (msg.type === "audio" && msg.audio) {
              mediaType = "audio";
              mediaUrl = await this.getMediaUrl(msg.audio.id);
            } else if (msg.type === "video" && msg.video) {
              mediaType = "video";
              mediaUrl = await this.getMediaUrl(msg.video.id);
            } else if (msg.type === "document" && msg.document) {
              mediaType = "document";
              mediaUrl = await this.getMediaUrl(msg.document.id);
            }

            const result = await this.inboxService.createConversationFromIncomingMessage({
              channel: "whatsapp",
              externalId: msg.id,
              senderExternalId: msg.from,
              content,
              mediaUrl,
              mediaType,
              rawPayload: { msg, senderName, phoneNumberId: value.metadata.phone_number_id },
            });
            return result;
          } catch (err) {
            logger.error({ err, msgId: msg.id }, "Error processing WhatsApp message");
          }
        }
      }
    }
    return null;
  }

  async sendWhatsAppTextMessage({ to, text, phoneNumberId }: WhatsAppTextMessage) {
    const token = process.env["WHATSAPP_CLOUD_API_TOKEN"];
    if (!token) throw new Error("WHATSAPP_CLOUD_API_TOKEN not configured");

    const response = await fetch(
      `${META_API_BASE}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { preview_url: false, body: text },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  async sendWhatsAppMediaMessage({
    to,
    mediaUrl,
    mediaType,
    phoneNumberId,
    caption,
  }: WhatsAppMediaMessage) {
    const token = process.env["WHATSAPP_CLOUD_API_TOKEN"];
    if (!token) throw new Error("WHATSAPP_CLOUD_API_TOKEN not configured");

    const response = await fetch(
      `${META_API_BASE}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: mediaType,
          [mediaType]: { link: mediaUrl, ...(caption ? { caption } : {}) },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp media API error: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  async sendWhatsAppTemplateMessage({
    to,
    templateName,
    languageCode,
    params,
    phoneNumberId,
  }: WhatsAppTemplateMessage) {
    const token = process.env["WHATSAPP_CLOUD_API_TOKEN"];
    if (!token) throw new Error("WHATSAPP_CLOUD_API_TOKEN not configured");

    const response = await fetch(
      `${META_API_BASE}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            components: params.length > 0
              ? [{ type: "body", parameters: params }]
              : [],
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp template API error: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  private async getMediaUrl(mediaId: string): Promise<string> {
    const token = process.env["WHATSAPP_CLOUD_API_TOKEN"];
    if (!token) throw new Error("WHATSAPP_CLOUD_API_TOKEN not configured");

    const response = await fetch(`${META_API_BASE}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return "";

    const data = await response.json() as { url?: string };
    return data.url ?? "";
  }
}
