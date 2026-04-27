import {
  pgTable,
  uuid,
  varchar,
  boolean,
  jsonb,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const flows = pgTable("flows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  triggerType: varchar("trigger_type", { length: 50 }),
  nodesJson: jsonb("nodes_json").notNull(),
  edgesJson: jsonb("edges_json").notNull(),
  isActive: boolean("is_active").default(false),
  version: integer("version").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Flow = typeof flows.$inferSelect;
export type NewFlow = typeof flows.$inferInsert;
