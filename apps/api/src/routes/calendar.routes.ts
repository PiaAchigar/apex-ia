import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { CalendarService } from "../services/CalendarService.js";
import type { NewCalendarEvent } from "@apex-ia/database/schema/tenant";
import { logger } from "../utils/logger.js";

const createCalendarEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  allDay: z.boolean().default(false),
  contactId: z.string().uuid().optional(),
  agentId: z.string().uuid(),
  location: z.string().optional(),
});

const updateCalendarEventSchema = createCalendarEventSchema.partial().extend({
  title: z.string().min(1, "Title is required").optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
});

const syncGoogleSchema = z.object({
  oauthToken: z.string().min(1, "OAuth token is required"),
});

export function createCalendarRoutes() {
  const routes = new Hono();

  // GET /calendar/events?agentId=&start=&end=
  routes.get("/events", async (c) => {
    try {
      const tenantDb = c.get("tenantDb");
      const agentId = c.req.query("agentId");
      const start = c.req.query("start");
      const end = c.req.query("end");

      if (!agentId || !start || !end) {
        return c.json(
          {
            success: false,
            error: "Missing required query parameters: agentId, start, end",
          },
          400
        );
      }

      const service = new CalendarService(tenantDb);
      const events = await service.getCalendarEventsForRange(
        agentId,
        new Date(start),
        new Date(end)
      );

      return c.json({ success: true, data: events }, 200);
    } catch (error) {
      logger.error({ error }, "Error fetching calendar events");
      return c.json(
        { success: false, error: "Internal server error" },
        500
      );
    }
  });

  // POST /calendar/events
  routes.post(
    "/events",
    zValidator("json", createCalendarEventSchema),
    async (c) => {
      try {
        const tenantDb = c.get("tenantDb");
        const input = c.req.valid("json");

        const service = new CalendarService(tenantDb);
        const event = await service.createCalendarEvent({
          ...input,
          startAt: new Date(input.startAt),
          endAt: new Date(input.endAt),
        });

        return c.json({ success: true, data: event }, 201);
      } catch (error) {
        logger.error({ error }, "Error creating calendar event");
        return c.json(
          { success: false, error: "Internal server error" },
          500
        );
      }
    }
  );

  // PATCH /calendar/events/:id
  routes.patch(
    "/events/:id",
    zValidator("json", updateCalendarEventSchema),
    async (c) => {
      try {
        const tenantDb = c.get("tenantDb");
        const id = c.req.param("id");
        const input = c.req.valid("json");

        const service = new CalendarService(tenantDb);

        // Build update object, only including defined fields
        const updateData: Record<string, unknown> = {};
        if (input.title !== undefined) updateData.title = input.title;
        if (input.startAt !== undefined) updateData.startAt = new Date(input.startAt);
        if (input.endAt !== undefined) updateData.endAt = new Date(input.endAt);
        if (input.description !== undefined) updateData.description = input.description;
        if (input.contactId !== undefined) updateData.contactId = input.contactId;
        if (input.allDay !== undefined) updateData.allDay = input.allDay;
        if (input.agentId !== undefined) updateData.agentId = input.agentId;
        if (input.location !== undefined) updateData.location = input.location;

        const updated = await service.updateCalendarEvent(id, updateData as Partial<NewCalendarEvent>);

        return c.json({ success: true, data: updated }, 200);
      } catch (error) {
        if (error instanceof Error && error.message === "CALENDAR_EVENT_NOT_FOUND") {
          return c.json({ success: false, error: "Calendar event not found" }, 404);
        }
        logger.error({ error }, "Error updating calendar event");
        return c.json(
          { success: false, error: "Internal server error" },
          500
        );
      }
    }
  );

  // DELETE /calendar/events/:id
  routes.delete("/events/:id", async (c) => {
    try {
      const tenantDb = c.get("tenantDb");
      const id = c.req.param("id");

      const service = new CalendarService(tenantDb);
      await service.deleteCalendarEvent(id);

      return c.body(null, 204);
    } catch (error) {
      if (error instanceof Error && error.message === "CALENDAR_EVENT_NOT_FOUND") {
        return c.json({ success: false, error: "Calendar event not found" }, 404);
      }
      logger.error({ error }, "Error deleting calendar event");
      return c.json(
        { success: false, error: "Internal server error" },
        500
      );
    }
  });

  // POST /calendar/sync-google
  routes.post(
    "/sync-google",
    zValidator("json", syncGoogleSchema),
    async (c) => {
      try {
        const tenantDb = c.get("tenantDb");
        const auth = c.get("auth");
        const { oauthToken } = c.req.valid("json");

        // API keys cannot sync Google Calendar
        if (!auth.userId) {
          return c.json(
            { success: false, error: "API keys cannot sync Google Calendar" },
            401
          );
        }

        const service = new CalendarService(tenantDb);
        const result = await service.syncWithGoogleCalendar(auth.userId, oauthToken);

        if (result.error) {
          return c.json({ success: false, error: result.error }, 400);
        }

        return c.json({ success: true, data: result }, 200);
      } catch (error) {
        logger.error({ error }, "Error syncing with Google Calendar");
        return c.json(
          { success: false, error: "Internal server error" },
          500
        );
      }
    }
  );

  return routes;
}
