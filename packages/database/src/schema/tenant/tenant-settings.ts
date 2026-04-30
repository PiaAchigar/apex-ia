import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const tenantSettings = pgTable(
  "tenant_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    key: varchar("key", { length: 50 }).notNull(),
    value: text("value"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgKeyUnique: uniqueIndex().on(table.organizationId, table.key),
  })
);

export type TenantSetting = typeof tenantSettings.$inferSelect;
export type NewTenantSetting = typeof tenantSettings.$inferInsert;
