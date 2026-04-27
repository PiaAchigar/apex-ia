import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  plan: text("plan").notNull(),
  status: text("status").notNull().default("active"),
  // status values: active | paused | cancelled | past_due | trialing

  billingPeriod: text("billing_period").notNull().default("monthly"),
  // billing_period values: monthly | annual

  amount: integer("amount").notNull(),
  // stored in cents (e.g. 4900 = $49.00)
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),

  mpSubscriptionId: varchar("mp_subscription_id", { length: 100 }),
  mpCustomerId: varchar("mp_customer_id", { length: 100 }),

  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
