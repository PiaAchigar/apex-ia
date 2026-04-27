### FASE 4 — Automatización
**Objetivo:** Flow Builder visual, Templates WhatsApp, Campaigns masivas.

**Tareas:**
> **⚠️ Arquitectura Dual-Database:** Todos los servicios de esta fase reciben `organizationId`
> y usan `DatabaseProvider.getClientDrizzle(organizationId)` en vez de `this.db`.
> Ver `docs/ARCHITECTURE-CHANGES.md` → "Impacto en Cada Servicio".


1. Schema en CLIENTE Supabase: `flows`, `campaigns`, `campaign_recipients`, `templates`

2. `FlowBuilderService.ts`
   - `createFlow(name, triggerType)`, `updateFlowStructure(flowId, nodes, edges)`
   - `activateFlow(flowId)`, `deactivateFlow(flowId)`
   - `executeFlowForConversation(flowId, conversationId)` → motor de ejecución nodo por nodo
   - Nodos soportados: `TriggerNode`, `ConditionNode`, `SendMessageNode`, `DelayNode`, `AiResponseNode`, `SubFlowNode`

3. `CampaignService.ts`
   - `createCampaign(input)`, `scheduleCampaign(id, scheduledAt)`, `pauseCampaign(id)`, `resumeCampaign(id)`
   - `processCampaignBatch(campaignId)` → worker BullMQ, envía en lotes de 50
   - `getCampaignMetrics(campaignId)` → sent, failed, open rate

4. `campaignQueue.ts` → BullMQ worker con retry y backoff exponencial

5. Frontend:
   - `FlowBuilderCanvas.tsx` → React Flow, drag-drop, conexión de nodos
   - `FlowBuilderNodePanel.tsx` → panel lateral con tipos de nodo
   - Nodos visuales: `TriggerNode`, `ConditionNode`, `SendMessageNode`, `DelayNode`, `AiResponseNode`, `SubFlowNode`
   - `CampaignList.tsx` → lista con estado y métricas
   - `CampaignMetricsDashboard.tsx` → gráficos de campaña

**Tests requeridos:**
```
tests/unit/FlowBuilderService.test.ts     → ejecución de cada tipo de nodo
tests/unit/CampaignService.test.ts        → scheduling, batch processing
tests/integration/flow-builder.routes.test.ts
tests/integration/campaigns.routes.test.ts
```

**STOP ✋ — Al terminar:**
> "✅ Fase 4 completada. Implementé: Flow Builder visual (6 tipos de nodo), Campaigns con BullMQ, Templates. ¿Confirmas que avanzo a la Fase 5 (Productividad)?"
