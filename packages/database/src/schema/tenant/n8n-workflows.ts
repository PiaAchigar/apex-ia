import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const automations = pgTable("automations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'python' | 'json'
  filePath: text("file_path").notNull(), // Path in Supabase Storage
  storageBucket: varchar("storage_bucket", { length: 100 }).notNull(), // e.g., "automations-{orgId}"
  isActive: boolean("is_active").default(true),
  lastExecutedAt: timestamp("last_executed_at"),
  executedCount: integer("executed_count").default(0),
  lastError: text("last_error"), // Error message from last execution
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Automation = typeof automations.$inferSelect;
export type NewAutomation = typeof automations.$inferInsert;
