import {
  pgTable,
  uuid,
  varchar,
  boolean,
  jsonb,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  whatsappId: varchar("whatsapp_id", { length: 50 }),
  instagramId: varchar("instagram_id", { length: 50 }),
  facebookId: varchar("facebook_id", { length: 50 }),
  telegramId: varchar("telegram_id", { length: 50 }),
  customFieldsJson: jsonb("custom_fields_json"),
  tags: text("tags").array(),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
