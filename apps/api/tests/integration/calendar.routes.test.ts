import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createCalendarRoutes } from "../../src/routes/calendar.routes.js";

const mockCalendarMethods = {
  createCalendarEvent: vi.fn(),
  updateCalendarEvent: vi.fn(),
  deleteCalendarEvent: vi.fn(),
  getCalendarEventsForRange: vi.fn(),
  syncWithGoogleCalendar: vi.fn(),
};

vi.mock("../../src/services/CalendarService.js", () => ({
  CalendarService: vi.fn().mockImplementation(() => mockCalendarMethods),
}));

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("auth", {
      userId: "agent-1",
      organizationId: "org-1",
      organizationSlug: "test-org",
      roleName: "standard",
      permissions: {},
    });
    await next();
  }),
}));

vi.mock("../../src/middleware/tenantMiddleware.js", () => ({
  tenantMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("tenantDb", {});
    await next();
  }),
}));

function buildApp() {
  const app = new Hono();
  app.route("/calendar", createCalendarRoutes() as never);
  return app;
}

describe("GET /calendar/events", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con lista de eventos", async () => {
    mockCalendarMethods.getCalendarEventsForRange.mockResolvedValueOnce([
      {
        id: "event-1",
        title: "Meeting",
        startAt: new Date("2026-05-15T10:00:00Z"),
        endAt: new Date("2026-05-15T11:00:00Z"),
      },
    ]);

    const res = await app.request("/calendar/events?agentId=agent-1&start=2026-05-01&end=2026-05-31");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe("POST /calendar/events", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería crear un evento y retornar 201", async () => {
    const fakeEvent = {
      id: "event-1",
      title: "New Meeting",
      startAt: new Date("2026-05-15T10:00:00Z"),
      endAt: new Date("2026-05-15T11:00:00Z"),
      description: null,
      contactId: null,
      agentId: "agent-1",
      location: null,
      allDay: false,
      googleEventId: null,
      createdAt: new Date(),
    };

    mockCalendarMethods.createCalendarEvent.mockResolvedValueOnce(fakeEvent);

    const res = await app.request("/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New Meeting",
        startAt: "2026-05-15T10:00:00Z",
        endAt: "2026-05-15T11:00:00Z",
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { success: boolean; data: { id: string } };
    expect(body.data.id).toBe("event-1");
  });

  it("debería rechazar si falta el título con 400", async () => {
    const res = await app.request("/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startAt: "2026-05-15T10:00:00Z",
        endAt: "2026-05-15T11:00:00Z",
      }),
    });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /calendar/events/:id", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería actualizar un evento y retornar 200", async () => {
    const updatedEvent = {
      id: "event-1",
      title: "Updated Meeting",
      startAt: new Date("2026-05-15T14:00:00Z"),
      endAt: new Date("2026-05-15T15:00:00Z"),
      description: null,
      contactId: null,
      agentId: "agent-1",
      location: null,
      allDay: false,
      googleEventId: null,
      createdAt: new Date(),
    };

    mockCalendarMethods.updateCalendarEvent.mockResolvedValueOnce(updatedEvent);

    const res = await app.request("/calendar/events/event-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Updated Meeting",
        startAt: "2026-05-15T14:00:00Z",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: { title: string } };
    expect(body.data.title).toBe("Updated Meeting");
  });

  it("debería retornar 404 si el evento no existe", async () => {
    mockCalendarMethods.updateCalendarEvent.mockRejectedValueOnce(
      new Error("CALENDAR_EVENT_NOT_FOUND")
    );

    const res = await app.request("/calendar/events/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /calendar/events/:id", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería eliminar un evento y retornar 204", async () => {
    mockCalendarMethods.deleteCalendarEvent.mockResolvedValueOnce(undefined);

    const res = await app.request("/calendar/events/event-1", {
      method: "DELETE",
    });

    expect(res.status).toBe(204);
  });
});

describe("POST /calendar/sync-google", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería sincronizar con Google Calendar y retornar 200", async () => {
    mockCalendarMethods.syncWithGoogleCalendar.mockResolvedValueOnce({
      eventsCreated: 3,
      eventsUpdated: 1,
    });

    const res = await app.request("/calendar/sync-google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oauthToken: "fake-token" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });
});
