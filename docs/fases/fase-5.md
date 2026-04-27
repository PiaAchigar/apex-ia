### FASE 5 — Productividad
**Objetivo:** Calendar, Email, TikTok, Call Logs, WhatsApp Behavior.

**Tareas:**
> **⚠️ Arquitectura Dual-Database:** Todos los servicios de esta fase reciben `organizationId`
> y usan `DatabaseProvider.getClientDrizzle(organizationId)` en vez de `this.db`.
> Ver `docs/ARCHITECTURE-CHANGES.md` → "Impacto en Cada Servicio".


1. Schema en CLIENTE Supabase: `calendar_events`, `call_logs`

2. `CalendarService.ts`
   - `createCalendarEvent(input)`, `updateCalendarEvent(id, input)`, `deleteCalendarEvent(id)`
   - `syncWithGoogleCalendar(agentId, oauthToken)` → OAuth 2.0 Google
   - `getCalendarEventsForRange(agentId, startDate, endDate)`

3. `EmailService.ts`
   - `sendTransactionalEmail(to, subject, html)` → Resend SDK
   - `configureSmtpForOrganization(orgId, smtpConfig)` → Nodemailer
   - `handleIncomingEmail(rawEmail)` → parsear y crear conversación en inbox

4. `TikTokService.ts`
   - `handleIncomingTikTokWebhook(payload)`
   - `sendTikTokDirectMessage(recipientId, text, accessToken)`

5. Transcripción de audio en inbox:
   - En `ConversationService.ts`: cuando llega un mensaje de audio, llamar a `AiResponseService.transcribeAudioMessage(audioBuffer)`
   - Guardar transcript en `messages.metadataJson`

6. Frontend: `CalendarView.tsx`, `CallLogTable.tsx`, settings de Email SMTP, WhatsApp Behavior toggles

**Tests requeridos:**
```
tests/unit/CalendarService.test.ts
tests/unit/EmailService.test.ts
tests/integration/calendar.routes.test.ts
tests/integration/settings.routes.test.ts
```

**STOP ✋ — Al terminar:**
> "✅ Fase 5 completada. Implementé: Calendar + Google sync, Email SMTP, TikTok, Call Logs, transcripción de audio. ¿Confirmas que avanzo a la Fase 6 (Inteligencia AI)?"
