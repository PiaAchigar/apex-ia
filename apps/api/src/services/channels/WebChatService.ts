import type { InboxService } from "../InboxService.js";
import type { SocketIOInstance } from "../../socket/socketServer.js";
import { logger } from "../../utils/logger.js";

type WebChatSession = {
  sessionId: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
};

export class WebChatService {
  private readonly activeSessions = new Map<string, WebChatSession>();

  constructor(private readonly inboxService: InboxService) {}

  createSession(sessionId: string, metadata?: Record<string, unknown>): WebChatSession {
    const session: WebChatSession = {
      sessionId,
      createdAt: new Date(),
      metadata,
    };
    this.activeSessions.set(sessionId, session);
    return session;
  }

  async handleIncomingWebChatMessage(
    sessionId: string,
    message: { content: string; mediaUrl?: string }
  ): Promise<void> {
    if (!this.activeSessions.has(sessionId)) {
      this.createSession(sessionId);
    }

    try {
      await this.inboxService.createConversationFromIncomingMessage({
        channel: "webchat",
        externalId: `${sessionId}_${Date.now()}`,
        senderExternalId: sessionId,
        content: message.content,
        mediaUrl: message.mediaUrl,
        rawPayload: { sessionId, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      logger.error({ err, sessionId }, "Error processing WebChat message");
      throw err;
    }
  }

  async sendWebChatMessage(
    sessionId: string,
    text: string,
    io: SocketIOInstance
  ): Promise<void> {
    io.to(`webchat:${sessionId}`).emit("agent_message", {
      content: text,
      timestamp: new Date(),
      type: "agent",
    });
    logger.debug({ sessionId }, "WebChat agent message emitted");
  }

  getEmbedScript(orgSlug: string, apiUrl: string): string {
    return `
<!-- Apex IA WebChat Widget -->
<script>
(function() {
  var w = window;
  var ic = w.ApexIA;
  if (typeof ic === "function") { ic("reattach_activator"); return; }
  w.ApexIA = function() { (w.ApexIA.q = w.ApexIA.q || []).push(arguments); };
  w.ApexIA.q = [];
  var d = document;
  var s = d.createElement("script");
  s.type = "text/javascript";
  s.async = true;
  s.src = "${apiUrl}/webchat/widget.js?org=${orgSlug}";
  var x = d.getElementsByTagName("script")[0];
  x.parentNode.insertBefore(s, x);
})();
ApexIA("init", { orgSlug: "${orgSlug}" });
</script>
<!-- End Apex IA WebChat Widget -->`.trim();
  }
}
