import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { organizations } from "@apex-ia/database/schema/public";
import { WebChatService } from "../services/channels/WebChatService.js";
import { db } from "../db/drizzle.js";
import type { ChannelLookupService } from "../services/ChannelLookupService.js";
import type { SocketIOInstance } from "../socket/socketServer.js";
import { emitNewMessage } from "../socket/socketServer.js";
import { logger } from "../utils/logger.js";

const incomingMessageSchema = z.object({
  sessionId: z.string().min(1).max(256),
  orgSlug: z.string().min(1).max(64),
  content: z.string().min(1).max(4096),
  mediaUrl: z.string().url().optional(),
});

export function createWebChatRoutes(
  channelLookup: ChannelLookupService,
  io: SocketIOInstance
) {
  const webchatRoutes = new Hono();

  webchatRoutes.post(
    "/messages",
    zValidator("json", incomingMessageSchema),
    async (c) => {
      const { sessionId, orgSlug, content, mediaUrl } = c.req.valid("json");

      const org = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, orgSlug))
        .limit(1);

      if (!org[0]) {
        logger.warn({ orgSlug }, "Organization not found");
        return c.json({ success: false, error: "Organization not found" }, 404);
      }

      const { inboxService } = await channelLookup.createServicesForTenant(org[0].id);
      const webchatService = new WebChatService(inboxService);

      try {
        await webchatService.handleIncomingWebChatMessage(sessionId, { content, mediaUrl });
        emitNewMessage(io, sessionId, orgSlug, { sessionId, content });
      } catch (err) {
        logger.error({ err, sessionId, orgSlug }, "Error handling WebChat message");
        return c.json({ success: false, error: "Failed to process message" }, 500);
      }

      return c.json({ success: true }, 200);
    }
  );

  webchatRoutes.get("/embed/:orgSlug", (c) => {
    const { orgSlug } = c.req.param();
    const apiUrl = process.env["API_URL"] ?? "http://localhost:3001";
    const webchatService = new WebChatService({} as never);
    const script = webchatService.getEmbedScript(orgSlug, apiUrl);
    return c.text(script, 200, { "Content-Type": "text/javascript" });
  });

  webchatRoutes.get("/widget.js", (c) => {
    const orgSlug = c.req.query("org");
    const apiUrl = process.env["API_URL"] ?? "http://localhost:3001";

    if (!orgSlug) {
      return c.text("console.error('Missing org parameter');", 400, {
        "Content-Type": "text/javascript",
      });
    }

    const widgetScript = `
(function() {
  "use strict";

  const API_URL = "${apiUrl}";
  const ORG_SLUG = "${orgSlug}";
  let sessionId = null;
  let socket = null;
  let isOpen = false;

  // Generate or retrieve session ID
  function getOrCreateSessionId() {
    let sid = sessionStorage.getItem("apex_webchat_session_id");
    if (!sid) {
      sid = "session_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
      sessionStorage.setItem("apex_webchat_session_id", sid);
    }
    return sid;
  }

  // Initialize Socket.IO connection
  function initializeSocket() {
    if (socket && socket.connected) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.socket.io/4.5.4/socket.io.min.js";
    script.onload = function() {
      socket = window.io(API_URL, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socket.on("connect", function() {
        socket.emit("join_webchat", { sessionId: sessionId, org: ORG_SLUG });
        console.log("[Apex WebChat] Connected to server", sessionId);
      });

      socket.on("agent_message", function(data) {
        displayMessage(data.content, "agent");
      });

      socket.on("disconnect", function() {
        console.log("[Apex WebChat] Disconnected from server");
      });

      socket.on("error", function(error) {
        console.error("[Apex WebChat] Socket error:", error);
      });
    };
    document.head.appendChild(script);
  }

  // Create and inject widget HTML
  function createWidget() {
    // Create button container
    const buttonContainer = document.createElement("div");
    buttonContainer.id = "apex-webchat-button";
    buttonContainer.style.cssText = \`
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #10b981;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      z-index: 999;
      transition: all 0.3s ease;
      border: none;
      color: white;
      font-weight: bold;
    \`;
    buttonContainer.innerHTML = "💬";
    buttonContainer.onmouseover = function() {
      this.style.transform = "scale(1.1)";
    };
    buttonContainer.onmouseout = function() {
      this.style.transform = "scale(1)";
    };
    buttonContainer.onclick = toggleChat;

    // Create chat overlay container
    const overlayContainer = document.createElement("div");
    overlayContainer.id = "apex-webchat-overlay";
    overlayContainer.style.cssText = \`
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 400px;
      height: 600px;
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
      display: none;
      flex-direction: column;
      z-index: 999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    \`;

    // Header
    const header = document.createElement("div");
    header.style.cssText = \`
      background-color: #10b981;
      color: white;
      padding: 16px;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    \`;
    header.innerHTML = \`
      <span style="font-weight: 600; font-size: 16px;">Apex IA Chat</span>
      <button id="apex-webchat-close" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0;">×</button>
    \`;
    document.getElementById("apex-webchat-close") && document.getElementById("apex-webchat-close").remove();
    header.appendChild(createCloseButton());

    // Messages container
    const messagesContainer = document.createElement("div");
    messagesContainer.id = "apex-webchat-messages";
    messagesContainer.style.cssText = \`
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background-color: #f5f5f5;
    \`;

    // Input area
    const inputContainer = document.createElement("div");
    inputContainer.style.cssText = \`
      padding: 12px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    \`;
    const input = document.createElement("input");
    input.id = "apex-webchat-input";
    input.type = "text";
    input.placeholder = "Escribe tu mensaje...";
    input.style.cssText = \`
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
    \`;
    input.onkeypress = function(e) {
      if (e.key === "Enter") {
        sendMessage();
      }
    };

    const sendBtn = document.createElement("button");
    sendBtn.innerHTML = "📤";
    sendBtn.style.cssText = \`
      padding: 10px 16px;
      background-color: #10b981;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s;
    \`;
    sendBtn.onmouseover = function() {
      this.style.backgroundColor = "#059669";
    };
    sendBtn.onmouseout = function() {
      this.style.backgroundColor = "#10b981";
    };
    sendBtn.onclick = sendMessage;

    inputContainer.appendChild(input);
    inputContainer.appendChild(sendBtn);

    overlayContainer.appendChild(header);
    overlayContainer.appendChild(messagesContainer);
    overlayContainer.appendChild(inputContainer);

    document.body.appendChild(buttonContainer);
    document.body.appendChild(overlayContainer);
  }

  function createCloseButton() {
    const btn = document.createElement("button");
    btn.id = "apex-webchat-close";
    btn.style.cssText = \`
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
    \`;
    btn.textContent = "×";
    btn.onclick = toggleChat;
    return btn;
  }

  function toggleChat() {
    const overlay = document.getElementById("apex-webchat-overlay");
    isOpen = !isOpen;
    overlay.style.display = isOpen ? "flex" : "none";
    if (isOpen && !socket) {
      initializeSocket();
      const input = document.getElementById("apex-webchat-input");
      if (input) {
        setTimeout(() => input.focus(), 100);
      }
    }
  }

  function displayMessage(text, type) {
    const messagesContainer = document.getElementById("apex-webchat-messages");
    const messageDiv = document.createElement("div");
    messageDiv.style.cssText = \`
      margin-bottom: 12px;
      display: flex;
      justify-content: \${type === "agent" ? "flex-start" : "flex-end"};
    \`;

    const bubble = document.createElement("div");
    bubble.style.cssText = \`
      max-width: 75%;
      padding: 10px 14px;
      border-radius: 12px;
      background-color: \${type === "agent" ? "#e5e7eb" : "#10b981"};
      color: \${type === "agent" ? "#1f2937" : "white"};
      font-size: 14px;
      word-wrap: break-word;
    \`;
    bubble.textContent = text;
    messageDiv.appendChild(bubble);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function sendMessage() {
    const input = document.getElementById("apex-webchat-input");
    const text = input.value.trim();
    if (!text) return;

    displayMessage(text, "user");
    input.value = "";

    try {
      const response = await fetch(API_URL + "/webchat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId,
          orgSlug: ORG_SLUG,
          content: text,
        }),
      });

      if (!response.ok) {
        console.error("[Apex WebChat] Failed to send message", response.status);
      }
    } catch (err) {
      console.error("[Apex WebChat] Error sending message:", err);
    }
  }

  // Initialize on page load
  sessionId = getOrCreateSessionId();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createWidget);
  } else {
    createWidget();
  }
})();
    `;

    return c.text(widgetScript.trim(), 200, { "Content-Type": "text/javascript" });
  });

  return webchatRoutes;
}
