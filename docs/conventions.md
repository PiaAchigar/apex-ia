## Convenciones de Nombres — OBLIGATORIO SEGUIR

### Archivos
```
kebab-case       → archivos generales: inbox.service.ts, flow-builder.routes.ts
PascalCase       → clases de servicio: InboxService.ts, WhatsAppCloudApiService.ts
PascalCase       → componentes React: InboxConversationList.tsx, ContactDetailSidebar.tsx
camelCase        → hooks: useInboxConversations.ts, useContactDetails.ts
camelCase        → stores Zustand: inboxStore.ts, authStore.ts
SCREAMING_SNAKE  → variables de entorno: SUPABASE_URL, STRIPE_SECRET_KEY
```

### Funciones y Métodos de Servicio
Los nombres deben describir exactamente qué hace la función. Formato: `verbo + sustantivo descriptivo`.
```typescript
// ✅ CORRECTO — nombre descriptivo
async function createConversationFromIncomingMessage(payload: IncomingMessagePayload): Promise<Conversation>
async function assignConversationToAgent(conversationId: UUID, agentId: UUID): Promise<void>
async function sendOutgoingMessageToChannel(channelType: ChannelType, message: OutgoingMessage): Promise<void>
async function fetchContactWithFullConversationHistory(contactId: UUID): Promise<ContactWithHistory>
async function moveDealToStage(dealId: UUID, targetStageId: UUID): Promise<Deal>
async function executeFlowForConversation(flowId: UUID, conversationId: UUID): Promise<FlowExecutionResult>
async function checkPlanLimitBeforeAction(orgId: UUID, resource: PlanResource): Promise<boolean>
async function generateAiResponseWithFallback(prompt: string, config: AiProviderConfig): Promise<string>
async function transcribeAudioMessage(audioBuffer: Buffer): Promise<TranscriptionResult>
async function importContactsFromCsvFile(file: File, orgId: UUID): Promise<ImportResult>

// ❌ INCORRECTO — demasiado vago
async function create(payload: any)
async function send(msg: any)
async function process(data: any)
```

### Clases de Servicio
```typescript
class InboxService { }               // lógica del inbox
class ConversationService { }        // lógica de conversaciones individuales
class ContactsService { }            // CRUD de contactos
class PipelineService { }            // deals y etapas Kanban
class TasksService { }               // gestión de tareas
class FlowBuilderService { }         // construcción y ejecución de flows
class CampaignService { }            // campañas masivas
class AiResponseService { }          // routing y fallback de AI
class AnalyticsService { }           // métricas y reportes
class BillingService { }             // Stripe y enforcement de planes
// Canales — un archivo por canal:
class WhatsAppCloudApiService { }    // Meta Cloud API
class BaileysWhatsAppService { }     // WhatsApp QR con Baileys
class InstagramService { }
class FacebookMessengerService { }
class TelegramService { }
class EmailService { }
class WebChatService { }
class TikTokService { }
```

### Componentes React
```tsx
// Formato: NombreMóduloDescripción
function InboxConversationList({ conversations }: InboxConversationListProps) {}
function InboxMessageBubble({ message, senderType }: MessageBubbleProps) {}
function InboxConversationDetailPanel({ conversationId }: Props) {}
function PipelineBoardKanban({ pipelineId }: Props) {}
function PipelineDealCard({ deal, onMoveDeal }: Props) {}
function ContactDataTable({ contacts, onSelectContact }: Props) {}
function ContactDetailSidebar({ contactId }: Props) {}
function FlowBuilderCanvas({ flowId }: Props) {}
function FlowBuilderNodePanel() {}
function CampaignMetricsDashboard({ campaignId }: Props) {}
function AnalyticsKpiCard({ title, value, trend }: Props) {}
function SettingsChannelConnectionModal({ channelType, onClose }: Props) {}
```

### Hooks
```typescript
function useInboxConversations(filters: InboxFiltersType) {}
function useConversationMessages(conversationId: string) {}
function useContactDetails(contactId: string) {}
function usePipelineDealsGroupedByStage(pipelineId: string) {}
function useFlowBuilderState(flowId: string) {}
function useCampaignMetrics(campaignId: string) {}
function useCurrentUserPermissions() {}
function useOrganizationPlanLimits() {}
```

### Tipos e Interfaces
```typescript
// Siempre PascalCase con sufijo que describe el uso
type CreateConversationInput = { ... }
type UpdateContactInput = { ... }
type InboxFiltersType = { ... }
type OutgoingMessage = { ... }
type IncomingMessagePayload = { ... }
type AiProviderConfig = { ... }
type PlanResource = "flows" | "channels" | "conversations" | "team_members"
interface ConversationWithMessages extends Conversation { messages: Message[] }
interface ContactWithHistory extends Contact { conversations: Conversation[] }
```
