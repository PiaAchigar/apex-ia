import { describe, it, expect, vi, beforeEach } from "vitest";
import { CalendarService } from "../../src/services/CalendarService.js";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

function makeInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
}

function makeUpdateChain(result: unknown[]) {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
}

function makeDeleteChain(result: { rowCount: number }) {
  return {
    where: vi.fn().mockResolvedValue(result),
  };
}

describe("CalendarService", () => {
  let service: CalendarService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new CalendarService(mockDb as never);
  });

  describe("createCalendarEvent", () => {
    it("debería crear un evento correctamente y retornarlo", async () => {
      const fakeEvent = {
        id: "event-1",
        title: "Reunión con cliente",
        startAt: new Date("2026-05-15T10:00:00Z"),
        endAt: new Date("2026-05-15T11:00:00Z"),
        description: "Discutir propuesta",
        contactId: "contact-1",
        agentId: "agent-1",
        location: "Zoom",
        allDay: false,
        googleEventId: null,
        createdAt: new Date(),
      };

      mockDb.insert.mockReturnValue(makeInsertChain([fakeEvent]));

      const result = await service.createCalendarEvent({
        title: "Reunión con cliente",
        startAt: new Date("2026-05-15T10:00:00Z"),
        endAt: new Date("2026-05-15T11:00:00Z"),
        description: "Discutir propuesta",
        contactId: "contact-1",
        agentId: "agent-1",
        location: "Zoom",
        allDay: false,
      });

      expect(result).toEqual(fakeEvent);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("updateCalendarEvent", () => {
    it("debería actualizar un evento y retornarlo", async () => {
      const updatedEvent = {
        id: "event-1",
        title: "Reunión actualizada",
        startAt: new Date("2026-05-15T14:00:00Z"),
        endAt: new Date("2026-05-15T15:00:00Z"),
        description: "Descripción actualizada",
        contactId: "contact-1",
        agentId: "agent-1",
        location: "Office",
        allDay: false,
        googleEventId: null,
        createdAt: new Date(),
      };

      mockDb.update.mockReturnValue(makeUpdateChain([updatedEvent]));

      const result = await service.updateCalendarEvent("event-1", {
        title: "Reunión actualizada",
        startAt: new Date("2026-05-15T14:00:00Z"),
      });

      expect(result).toEqual(updatedEvent);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("debería lanzar error si el evento no existe", async () => {
      mockDb.update.mockReturnValue(makeUpdateChain([]));

      await expect(
        service.updateCalendarEvent("nonexistent", { title: "Updated" })
      ).rejects.toThrow("CALENDAR_EVENT_NOT_FOUND");
    });
  });

  describe("deleteCalendarEvent", () => {
    it("debería eliminar un evento correctamente", async () => {
      mockDb.delete.mockReturnValue(makeDeleteChain({ rowCount: 1 }));

      await expect(service.deleteCalendarEvent("event-1")).resolves.not.toThrow();
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("debería lanzar error si el evento no existe", async () => {
      mockDb.delete.mockReturnValue(makeDeleteChain({ rowCount: 0 }));

      await expect(service.deleteCalendarEvent("nonexistent")).rejects.toThrow(
        "CALENDAR_EVENT_NOT_FOUND"
      );
    });
  });

  describe("getCalendarEventsForRange", () => {
    it("debería retornar eventos dentro del rango de fechas", async () => {
      const events = [
        {
          id: "event-1",
          title: "Evento 1",
          startAt: new Date("2026-05-15T10:00:00Z"),
          endAt: new Date("2026-05-15T11:00:00Z"),
          description: null,
          contactId: null,
          agentId: "agent-1",
          location: null,
          allDay: false,
          googleEventId: null,
          createdAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValue(makeSelectChain(events));

      const result = await service.getCalendarEventsForRange(
        "agent-1",
        new Date("2026-05-01"),
        new Date("2026-05-31")
      );

      expect(result).toEqual(events);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe("syncWithGoogleCalendar", () => {
    it("debería sincronizar eventos desde Google Calendar", async () => {
      const googleEvents = [
        {
          id: "google-event-1",
          summary: "Google Meeting",
          start: { dateTime: "2026-05-20T14:00:00Z" },
          end: { dateTime: "2026-05-20T15:00:00Z" },
        },
      ];

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({ items: googleEvents }),
        })
      );

      mockDb.insert.mockReturnValue(
        makeInsertChain([
          {
            id: "event-synced",
            title: "Google Meeting",
            startAt: new Date("2026-05-20T14:00:00Z"),
            endAt: new Date("2026-05-20T15:00:00Z"),
            googleEventId: "google-event-1",
            description: null,
            contactId: null,
            agentId: "agent-1",
            location: null,
            allDay: false,
            createdAt: new Date(),
          },
        ])
      );

      await service.syncWithGoogleCalendar("agent-1", "fake-oauth-token");

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });
});
