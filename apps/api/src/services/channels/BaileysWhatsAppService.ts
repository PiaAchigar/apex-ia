import type { InboxService } from "../InboxService.js";
import { logger } from "../../utils/logger.js";

type BaileysSession = {
  sessionId: string;
  status: "connecting" | "qr" | "ready" | "disconnected";
  sock?: unknown;
};

export class BaileysWhatsAppService {
  private readonly sessions = new Map<string, BaileysSession>();

  constructor(private readonly inboxService: InboxService) {}

  async initializeWhatsAppQrSession(
    sessionId: string,
    onQrCode: (qr: string) => void,
    onReady: (sessionId: string) => void
  ): Promise<void> {
    if (this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      if (session.status === "ready") {
        onReady(sessionId);
        return;
      }
    }

    this.sessions.set(sessionId, { sessionId, status: "connecting" });

    try {
      const {
        default: makeWASocket,
        DisconnectReason,
        useMultiFileAuthState,
      } = await import("@whiskeysockets/baileys" as string);

      const { state, saveCreds } = await useMultiFileAuthState(
        `.baileys-sessions/${sessionId}`
      );

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: { level: "silent" } as never,
      });

      this.sessions.set(sessionId, { sessionId, status: "connecting", sock });

      sock.ev.on("connection.update", async (update: {
        connection?: string;
        lastDisconnect?: { error?: { output?: { statusCode?: number } } };
        qr?: string;
      }) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.sessions.set(sessionId, { sessionId, status: "qr", sock });
          onQrCode(qr);
        }

        if (connection === "open") {
          this.sessions.set(sessionId, { sessionId, status: "ready", sock });
          onReady(sessionId);
          logger.info({ sessionId }, "Baileys session ready");
        }

        if (connection === "close") {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          this.sessions.set(sessionId, { sessionId, status: "disconnected" });
          logger.warn({ sessionId, statusCode }, "Baileys session closed");

          if (shouldReconnect) {
            await this.initializeWhatsAppQrSession(sessionId, onQrCode, onReady);
          }
        }
      });

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("messages.upsert", async ({ messages: msgs, type }: {
        messages: { key: { remoteJid?: string; fromMe?: boolean; id?: string }; message?: unknown }[];
        type: string;
      }) => {
        if (type !== "notify") return;

        for (const msg of msgs) {
          if (msg.key.fromMe) continue;
          await this.handleIncomingBaileysMessage(sessionId, msg);
        }
      });
    } catch (err) {
      logger.error({ err, sessionId }, "Failed to initialize Baileys session");
      this.sessions.set(sessionId, { sessionId, status: "disconnected" });
      throw err;
    }
  }

  async sendBaileysTextMessage(
    sessionId: string,
    to: string,
    text: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "ready" || !session.sock) {
      throw new Error(`BAILEYS_SESSION_NOT_READY: ${sessionId}`);
    }

    const sock = session.sock as {
      sendMessage: (jid: string, content: unknown) => Promise<unknown>;
    };

    const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text });

    logger.info({ sessionId, to }, "Baileys message sent");
  }

  async handleIncomingBaileysMessage(
    sessionId: string,
    message: {
      key: { remoteJid?: string; fromMe?: boolean; id?: string };
      message?: unknown;
    }
  ): Promise<void> {
    try {
      const jid = message.key.remoteJid;
      if (!jid || jid.includes("@g.us")) return;

      const phoneNumber = jid.split("@")[0] ?? jid;
      const msgContent = message.message as Record<string, unknown> | undefined;
      const text =
        (msgContent?.["conversation"] as string | undefined) ??
        (msgContent?.["extendedTextMessage"] as { text?: string } | undefined)?.text;

      await this.inboxService.createConversationFromIncomingMessage({
        channel: "whatsapp_qr",
        externalId: message.key.id ?? Date.now().toString(),
        senderExternalId: phoneNumber,
        content: text,
        rawPayload: { message, sessionId },
      });
    } catch (err) {
      logger.error({ err, sessionId }, "Error handling Baileys incoming message");
    }
  }

  async disconnectWhatsAppQrSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session?.sock) return;

    const sock = session.sock as { logout?: () => Promise<void> };
    await sock.logout?.();
    this.sessions.delete(sessionId);

    logger.info({ sessionId }, "Baileys session disconnected");
  }

  getSessionStatus(sessionId: string): BaileysSession["status"] | "not_found" {
    return this.sessions.get(sessionId)?.status ?? "not_found";
  }
}
