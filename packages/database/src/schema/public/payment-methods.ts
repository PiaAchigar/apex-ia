import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  type: text("type").notNull(),
  // type values: card | mp_account

  cardBrand: text("card_brand"),
  // card_brand values: visa | mastercard | maestro | amex | cabal | naranja | mp | other

  lastFour: varchar("last_four", { length: 4 }),
  holderName: varchar("holder_name", { length: 100 }),
  expiryMonth: integer("expiry_month"),
  expiryYear: integer("expiry_year"),

  mpCardId: varchar("mp_card_id", { length: 100 }),
  mpCustomerId: varchar("mp_customer_id", { length: 100 }),

  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;
