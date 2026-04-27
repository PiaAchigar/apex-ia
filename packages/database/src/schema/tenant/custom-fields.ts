import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const customFieldDefinitions = pgTable("custom_field_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 30 }).notNull(), // contact | deal
  fieldKey: varchar("field_key", { length: 50 }).notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  fieldType: varchar("field_type", { length: 20 }).notNull(), // text | number | date | boolean | select
  options: text("options").array(), // for select type
  isRequired: boolean("is_required").default(false),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;
export type NewCustomFieldDefinition = typeof customFieldDefinitions.$inferInsert;
