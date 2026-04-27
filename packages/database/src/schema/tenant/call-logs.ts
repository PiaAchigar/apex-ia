import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const callLogs = pgTable("call_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id"),
  duration: integer("duration"),
  transcript: text("transcript"),
  isSuccess: boolean("is_success"),
  aiModel: varchar("ai_model", { length: 50 }),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CallLog = typeof callLogs.$inferSelect;
export type NewCallLog = typeof callLogs.$inferInsert;
