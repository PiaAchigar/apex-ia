import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const channelCredentials = pgTable("channel_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  channelType: varchar("channel_type", { length: 30 }).notNull(),
  encryptedCredentials: text("encrypted_credentials").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ChannelCredential = typeof channelCredentials.$inferSelect;
export type NewChannelCredential = typeof channelCredentials.$inferInsert;
