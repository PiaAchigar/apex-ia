import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const organizationsDb = pgTable(
  "organizations_db",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // AES-256-GCM encrypted postgres connection string
    encryptedDatabaseUrl: text("encrypted_database_url").notNull(),

    // Optional: store Supabase REST URL for display/identification
    supabaseProjectUrl: varchar("supabase_project_url", { length: 255 }),

    databaseName: varchar("database_name", { length: 100 }),
    isActive: boolean("is_active").default(true),
    lastConnectionTest: timestamp("last_connection_test"),
    lastConnectionSuccess: boolean("last_connection_success"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_organizations_db_org_id").on(table.organizationId)]
);

export type OrganizationDb = typeof organizationsDb.$inferSelect;
export type NewOrganizationDb = typeof organizationsDb.$inferInsert;
