import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { subscriptions } from "./subscriptions.js";
import { paymentMethods } from "./payment-methods.js";

export const paymentHistory = pgTable("payment_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  subscriptionId: uuid("subscription_id")
    .references(() => subscriptions.id, { onDelete: "set null" }),

  paymentMethodId: uuid("payment_method_id")
    .references(() => paymentMethods.id, { onDelete: "set null" }),

  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),

  status: text("status").notNull(),
  // status values: paid | failed | refunded | pending | chargeback

  providerPaymentId: varchar("provider_payment_id", { length: 100 }),
  description: text("description"),

  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PaymentHistoryEntry = typeof paymentHistory.$inferSelect;
export type NewPaymentHistoryEntry = typeof paymentHistory.$inferInsert;
