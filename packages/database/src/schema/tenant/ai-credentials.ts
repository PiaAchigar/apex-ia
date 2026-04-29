import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const aiCredentials = pgTable("ai_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  provider: varchar("provider", {
    length: 30,
    enum: ["anthropic", "openai", "gemini", "openrouter"],
  }).notNull(),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  isPrimary: boolean("is_primary").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AiCredential = typeof aiCredentials.$inferSelect;
export type NewAiCredential = typeof aiCredentials.$inferInsert;
