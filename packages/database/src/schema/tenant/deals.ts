import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const pipelines = pgTable("pipelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pipelineStages = pgTable("pipeline_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipelineId: uuid("pipeline_id").notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  order: integer("order").notNull(),
  color: varchar("color", { length: 7 }),
});

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id"),
  pipelineId: uuid("pipeline_id").notNull(),
  stageId: uuid("stage_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  probability: integer("probability").default(0),
  closedDate: timestamp("closed_date"),
  assignedAgentId: uuid("assigned_agent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Pipeline = typeof pipelines.$inferSelect;
export type NewPipeline = typeof pipelines.$inferInsert;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type NewPipelineStage = typeof pipelineStages.$inferInsert;
export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
