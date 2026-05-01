import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const backups = pgTable(
  "backups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    storageBucket: varchar("storage_bucket", { length: 255 }).notNull(),
    storagePath: varchar("storage_path", { length: 500 }).notNull(),
    sizeBytes: integer("size_bytes"),
    status: varchar("status", { length: 20 }).notNull().default("completed"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    orgIdIdx: index().on(table.organizationId),
  })
);

export type Backup = typeof backups.$inferSelect;
export type NewBackup = typeof backups.$inferInsert;
