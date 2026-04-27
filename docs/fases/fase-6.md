### FASE 6 — Inteligencia AI (Semanas 12-13)
**Objetivo:** AI multi-proveedor, analytics de uso, reports completos.

**Tareas:**
> **⚠️ Arquitectura Dual-Database:** Todos los servicios de esta fase reciben `organizationId`
> y usan `DatabaseProvider.getClientDrizzle(organizationId)` en vez de `this.db`.
> Ver `docs/ARCHITECTURE-CHANGES.md` → "Impacto en Cada Servicio".


1. Schema en CLIENTE Supabase: `ai_credentials` (encriptadas), `ai_usage_logs`

2. `AiResponseService.ts`
   - `generateAiResponseWithFallback(prompt, providerConfig)` → soporta Anthropic, OpenAI, Gemini, OpenRouter
   - `routeToFallbackProvider(failedProvider, prompt)` → fallback automático si falla
   - `transcribeAudioMessage(audioBuffer)` → Whisper API
   - `logAiUsage(orgId, model, tokensUsed, costUsd)`

3. Settings de AI Credentials: formulario para guardar API keys por proveedor (encriptadas con AES-256-GCM)

4. `AnalyticsService.ts`
   - `getConversationMetrics(orgId, filters)` → total, por canal, por agente
   - `getAgentPerformanceReport(orgId, dateRange)`
   - `getChannelSlaReport(orgId, dateRange)` → tiempo de primera respuesta
   - `getVolumeHeatmap(orgId, dateRange)` → mensajes por hora/día
   - `getCsatReport(orgId, dateRange)`

5. Frontend: `AnalyticsDashboard.tsx` con KPIs, `AiUsageChart.tsx`, `ReportsPage` con export CSV, settings de AI Credentials

**Tests requeridos:**
```
tests/unit/AiResponseService.test.ts      → mockear APIs externas, testear fallback
tests/unit/AnalyticsService.test.ts
tests/integration/analytics.routes.test.ts
```

**STOP ✋ — Al terminar:**
> "✅ Fase 6 completada. Implementé: AI multi-proveedor con fallback, Whisper, Analytics completo, Reports. ¿Confirmas que avanzo a la Fase 7 (Settings Avanzados)?"
