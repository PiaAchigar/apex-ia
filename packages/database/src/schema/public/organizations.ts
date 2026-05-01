import { pgTable, uuid, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  plan: text("plan").default("starter"),
  paidAt: timestamp("paid_at"),
  setupCompletedAt: timestamp("setup_completed_at"),
  customDomain: varchar("custom_domain", { length: 255 }),
  whitelabelEnabled: boolean("whitelabel_enabled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
