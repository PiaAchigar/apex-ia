import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  content: text("content").notNull(),
  channel: varchar("channel", { length: 30 }).notNull(),
  metaTemplateId: varchar("meta_template_id", { length: 100 }),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
