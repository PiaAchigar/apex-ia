### FASE 2 — Core Inbox
**Objetivo:** Inbox real-time con al menos 4 canales funcionando.

**Tareas (en orden):**
> **⚠️ Arquitectura Dual-Database:** Todos los servicios de esta fase reciben `organizationId`
> y usan `DatabaseProvider.getClientDrizzle(organizationId)` en vez de `this.db`.
> Ver `docs/ARCHITECTURE-CHANGES.md` → "Impacto en Cada Servicio".


1. Schema en CLIENTE Supabase: `conversations`, `messages`, `contacts`, `channel_credentials`

2. `InboxService.ts`
   - `createConversationFromIncomingMessage(payload)`
   - `getConversationsForAgent(agentId, filters)` → soporta tabs: all / unassigned / mine / assigned
   - `assignConversationToAgent(conversationId, agentId)`
   - `markConversationAsResolved(conversationId)`
   - `markConversationAsPending(conversationId)`

3. `ConversationService.ts`
   - `sendOutgoingMessageToChannel(conversationId, content, agentId)`
   - `getMessagesForConversation(conversationId, pagination)`
   - `markMessagesAsRead(conversationId, agentId)`

4. WebSocket con Socket.io (sobre Hono):
   - Auth: verificar JWT en handshake
   - Rooms: `conv_{id}` (por conversación), `org_{slug}` (por empresa)
   - Eventos emitidos: `new_message`, `conversation_assigned`, `conversation_resolved`, `agent_typing`
   - Eventos recibidos: `join_conversation`, `send_message`, `start_typing`

5. `WhatsAppCloudApiService.ts`
   - `handleIncomingWhatsAppWebhook(payload)` → llama a `InboxService.createConversationFromIncomingMessage`
   - `verifyWhatsAppWebhookChallenge(token, challenge)` → Meta verification
   - `sendWhatsAppTextMessage(to, text, phoneNumberId)`
   - `sendWhatsAppMediaMessage(to, mediaUrl, mediaType, phoneNumberId)`
   - `sendWhatsAppTemplateMessage(to, templateName, params, phoneNumberId)`

6. `BaileysWhatsAppService.ts` (WhatsApp QR)
   - `initializeWhatsAppQrSession(sessionId, onQrCode, onReady)`
   - `sendBaileysTextMessage(sessionId, to, text)`
   - `handleIncomingBaileysMessage(sessionId, message)`
   - `disconnectWhatsAppQrSession(sessionId)`

7. `InstagramService.ts`
   - `handleIncomingInstagramWebhook(payload)`
   - `sendInstagramDirectMessage(recipientId, text, pageToken)`

8. `FacebookMessengerService.ts`
   - `handleIncomingMessengerWebhook(payload)`
   - `sendMessengerTextMessage(recipientId, text, pageToken)`

9. `TelegramService.ts` (Telegraf)
   - `initializeTelegramBot(token)`
   - `handleIncomingTelegramUpdate(update)`
   - `sendTelegramMessage(chatId, text)`

10. `WebChatService.ts`
    - Widget embebible (`<script>` + iframe)
    - `handleIncomingWebChatMessage(sessionId, message)`
    - `sendWebChatMessage(sessionId, text)`

11. Frontend:
    - `InboxConversationList.tsx` → lista con filtros, real-time updates
    - `InboxMessageBubble.tsx` → diferencia contact / agent / bot, soporta media
    - `InboxConversationDetailPanel.tsx` → historial + input para responder
    - `InboxFilterTabs.tsx` → All / Unassigned / My Chats / Assigned
    - `InboxChannelBadge.tsx` → ícono por canal

**Tests requeridos:**
```
tests/unit/InboxService.test.ts
tests/unit/ConversationService.test.ts
tests/unit/WhatsAppCloudApiService.test.ts       → mockear Meta API
tests/unit/BaileysWhatsAppService.test.ts        → mockear Baileys
tests/integration/inbox.routes.test.ts
tests/integration/conversations.routes.test.ts
tests/integration/whatsapp-cloud-webhook.routes.test.ts
tests/integration/instagram-webhook.routes.test.ts
```

**STOP ✋ — Al terminar:**
> "✅ Fase 2 completada. Implementé: Inbox real-time, WebSockets, WhatsApp Oficial, WhatsApp QR, Instagram, Messenger, Telegram, WebChat. ¿Confirmas que avanzo a la Fase 3 (CRM Core)?"
