import { DrizzleDb } from "../db/drizzle.js";
import { calendarEvents, CalendarEvent, NewCalendarEvent } from "@apex-ia/database/schema/tenant";
import { eq, and, gte, lte } from "drizzle-orm";
import { logger } from "../utils/logger.js";

export class CalendarService {
  constructor(private readonly tenantDb: DrizzleDb) {}

  async createCalendarEvent(input: NewCalendarEvent): Promise<CalendarEvent> {
    try {
      const [result] = await this.tenantDb
        .insert(calendarEvents)
        .values(input)
        .returning();

      if (!result) {
        throw new Error("CALENDAR_EVENT_NOT_CREATED");
      }

      return result;
    } catch (error) {
      logger.error({ error }, "Error creating calendar event");
      throw error;
    }
  }

  async updateCalendarEvent(
    id: string,
    input: Partial<NewCalendarEvent>
  ): Promise<CalendarEvent> {
    try {
      const [result] = await this.tenantDb
        .update(calendarEvents)
        .set(input)
        .where(eq(calendarEvents.id, id))
        .returning();

      if (!result) {
        throw new Error("CALENDAR_EVENT_NOT_FOUND");
      }

      return result;
    } catch (error) {
      logger.error({ error, id }, "Error updating calendar event");
      throw error;
    }
  }

  async deleteCalendarEvent(id: string): Promise<void> {
    try {
      const result = await this.tenantDb
        .delete(calendarEvents)
        .where(eq(calendarEvents.id, id))
        .returning();

      if (!result.length) {
        throw new Error("CALENDAR_EVENT_NOT_FOUND");
      }
    } catch (error) {
      logger.error({ error, id }, "Error deleting calendar event");
      throw error;
    }
  }

  async getCalendarEventById(id: string): Promise<CalendarEvent | null> {
    try {
      const result = await this.tenantDb
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.id, id))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      logger.error({ error, id }, "Error getting calendar event");
      throw error;
    }
  }

  async getCalendarEventsForRange(
    agentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    try {
      const result = await this.tenantDb
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.agentId, agentId),
            gte(calendarEvents.startAt, startDate),
            lte(calendarEvents.endAt, endDate)
          )
        );

      return result;
    } catch (error) {
      logger.error({ error, agentId, startDate, endDate }, "Error getting calendar events for range");
      throw error;
    }
  }

  async syncWithGoogleCalendar(
    agentId: string,
    oauthToken: string
  ): Promise<{ synced: number; error?: string }> {
    try {
      // Fetch events from Google Calendar API (next 30 days)
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${in30Days.toISOString()}&maxResults=100`,
        {
          headers: {
            Authorization: `Bearer ${oauthToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const googleData = (await response.json()) as {
        items?: Array<{
          id: string;
          summary: string;
          description?: string;
          start: { dateTime?: string; date?: string };
          end: { dateTime?: string; date?: string };
          location?: string;
        }>;
      };

      let synced = 0;

      // Upsert each event by googleEventId
      for (const gEvent of googleData.items || []) {
        const startAt = new Date(gEvent.start.dateTime || gEvent.start.date || "");
        const endAt = new Date(gEvent.end.dateTime || gEvent.end.date || "");

        // Check if event already exists
        const existing = await this.tenantDb
          .select()
          .from(calendarEvents)
          .where(eq(calendarEvents.googleEventId, gEvent.id))
          .limit(1);

        if (existing.length) {
          // Update existing
          await this.tenantDb
            .update(calendarEvents)
            .set({
              title: gEvent.summary,
              description: gEvent.description,
              startAt,
              endAt,
              location: gEvent.location,
            })
            .where(eq(calendarEvents.googleEventId, gEvent.id));
        } else {
          // Create new
          await this.tenantDb.insert(calendarEvents).values({
            title: gEvent.summary,
            description: gEvent.description,
            startAt,
            endAt,
            agentId,
            googleEventId: gEvent.id,
            location: gEvent.location,
          });
        }

        synced++;
      }

      return { synced };
    } catch (error) {
      logger.error({ error, agentId }, "Error syncing with Google Calendar");
      return {
        synced: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
