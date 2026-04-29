import { pgTable, uuid, text, timestamp, boolean, varchar } from "drizzle-orm/pg-core";

export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  allDay: boolean("all_day").default(false),
  contactId: uuid("contact_id"),
  agentId: uuid("agent_id"),
  googleEventId: varchar("google_event_id", { length: 255 }),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;
