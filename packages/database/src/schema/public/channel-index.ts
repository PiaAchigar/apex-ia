import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

// Mapeo global: identifier externo (phoneNumberId, pageId, botToken hash) → org
export const channelIndex = pgTable("channel_index", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  organizationSlug: varchar("organization_slug", { length: 50 }).notNull(),
  channelType: varchar("channel_type", { length: 30 }).notNull(),
  externalIdentifier: varchar("external_identifier", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ChannelIndex = typeof channelIndex.$inferSelect;
export type NewChannelIndex = typeof channelIndex.$inferInsert;
