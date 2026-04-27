### FASE 3 — CRM Core 
**Objetivo:** Contacts, Pipeline Kanban, Tasks y Custom Fields.

**Tareas:**
> **⚠️ Arquitectura Dual-Database:** Todos los servicios de esta fase reciben `organizationId`
> y usan `DatabaseProvider.getClientDrizzle(organizationId)` en vez de `this.db`.
> Ver `docs/ARCHITECTURE-CHANGES.md` → "Impacto en Cada Servicio".


1. Schema en CLIENTE Supabase: `contacts`, `deals`, `pipelines`, `pipeline_stages`, `tasks`, `custom_field_definitions`

2. `ContactsService.ts`
   - `createContact(input)`, `updateContact(id, input)`, `archiveContact(id)`
   - `fetchContactWithFullConversationHistory(contactId)`
   - `importContactsFromCsvFile(file, orgId)` → parsear CSV, validar, insertar en batch
   - `exportContactsToCsv(filters)` → generar CSV descargable
   - `searchContacts(query, filters)`

3. `PipelineService.ts`
   - `createPipeline(name)`, `updatePipelineStages(pipelineId, stages)`
   - `createDeal(input)`, `updateDeal(id, input)`, `deleteDeal(id)`
   - `moveDealToStage(dealId, targetStageId)`
   - `getDealsGroupedByStage(pipelineId, filters)` → para el Kanban

4. `TasksService.ts`
   - `createTask(input)`, `updateTask(id, input)`, `completeTask(id)`
   - `getTasksForAgent(agentId, filters)`

5. Frontend:
   - `ContactDataTable.tsx` → lista con búsqueda, filtros, paginación
   - `ContactDetailSidebar.tsx` → info + historial de conversaciones + deals + tasks
   - `ContactImportCsvModal.tsx` → drag-drop CSV, preview, confirmar importación
   - `PipelineBoardKanban.tsx` → columnas arrastrables (DnD)
   - `PipelineDealCard.tsx` → card con nombre, monto, agente, probabilidad
   - `PipelineStageColumn.tsx` → columna con suma de deals
   - `TaskList.tsx` → lista y grid, filtros

**Tests requeridos:**
```
tests/unit/ContactsService.test.ts
tests/unit/PipelineService.test.ts
tests/unit/TasksService.test.ts
tests/integration/contacts.routes.test.ts
tests/integration/pipeline.routes.test.ts
tests/integration/tasks.routes.test.ts
```

**STOP ✋ — Al terminar:**
> "✅ Fase 3 completada. Implementé: Contacts (CRUD + CSV), Pipeline Kanban, Tasks, Custom Fields. ¿Confirmas que avanzo a la Fase 4 (Automatización)?"
