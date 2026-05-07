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
  assignedAgentId?: string | undefined;
};

export type UpdateContactInput = {
  name?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  tags?: string[] | undefined;
  customFieldsJson?: Record<string, unknown> | undefined;
};

export type InboxFiltersType = {
  tab: "all" | "unassigned" | "mine" | "assigned";
  channel?: ChannelType | undefined;
  status?: ConversationStatus | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
};

export type OutgoingMessage = {
  conversationId: string;
  content: string;
  mediaUrl?: string | undefined;
  mediaType?: "image" | "audio" | "video" | "document" | undefined;
};

export type IncomingMessagePayload = {
  channel: ChannelType;
  externalId: string;
  senderExternalId: string;
  content?: string | undefined;
  mediaUrl?: string | undefined;
  mediaType?: "image" | "audio" | "video" | "document" | undefined;
  rawPayload: Record<string, unknown>;
};

export type AiProviderConfig = {
  provider: AiProvider;
  model: string;
  apiKey: string;
  fallbackProvider?: AiProvider | undefined;
  fallbackModel?: string | undefined;
  fallbackApiKey?: string | undefined;
  maxTokens?: number | undefined;
  temperature?: number | undefined;
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
    details?: unknown | undefined;
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
