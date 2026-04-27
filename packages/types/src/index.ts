// ---- Domain enums ----

export type ChannelType =
  | "whatsapp"
  | "whatsapp_qr"
  | "instagram"
  | "facebook"
  | "telegram"
  | "webchat"
  | "email"
  | "tiktok"
  | "voice";

export type ConversationStatus = "open" | "resolved" | "pending";
export type MessageSenderType = "contact" | "agent" | "bot";
export type UserRole = "administrator" | "agent";
export type PlanType = "starter" | "growth" | "business";
export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in_progress" | "done";
export type CampaignStatus = "draft" | "scheduled" | "running" | "paused" | "completed";
export type TemplateStatus = "pending" | "approved" | "rejected";
export type FlowTriggerType = "incoming_message" | "keyword" | "scheduled";
export type PlanResource = "flows" | "channels" | "conversations" | "team_members";
export type AiProvider = "anthropic" | "openai" | "gemini" | "openrouter";

// ---- Input types ----

export type CreateConversationInput = {
  contactId: string;
  channel: ChannelType;
  assignedAgentId?: string;
};

export type UpdateContactInput = {
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  customFieldsJson?: Record<string, unknown>;
};

export type InboxFiltersType = {
  tab: "all" | "unassigned" | "mine" | "assigned";
  channel?: ChannelType;
  status?: ConversationStatus;
  search?: string;
  page?: number;
  limit?: number;
};

export type OutgoingMessage = {
  conversationId: string;
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "audio" | "video" | "document";
};

export type IncomingMessagePayload = {
  channel: ChannelType;
  externalId: string;
  senderExternalId: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: "image" | "audio" | "video" | "document";
  rawPayload: Record<string, unknown>;
};

export type AiProviderConfig = {
  provider: AiProvider;
  model: string;
  apiKey: string;
  fallbackProvider?: AiProvider;
  fallbackModel?: string;
  fallbackApiKey?: string;
  maxTokens?: number;
  temperature?: number;
};

// ---- Response types ----

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

// ---- Auth types ----

export type RegisterInput = {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
  organizationSlug: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthSession = {
  userId: string;
  organizationId: string;
  organizationSlug: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
};
