import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { roles } from "./roles.js";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  email: varchar("email", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 100 }),
  roleId: uuid("role_id").references(() => roles.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
