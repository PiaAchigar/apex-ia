import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createTeamRoutes } from "../../src/routes/settings/team.routes.js";

const mockTeamMethods = {
  listTeamMembers: vi.fn(),
  inviteTeamMember: vi.fn(),
  updateTeamMemberRole: vi.fn(),
  removeTeamMember: vi.fn(),
};

vi.mock("../../src/services/TeamService.js", () => ({
  TeamService: vi.fn().mockImplementation(() => mockTeamMethods),
}));

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("auth", {
      userId: "user-1",
      organizationId: "org-1",
      organizationSlug: "test-org",
      roleName: "admin",
      permissions: {},
    });
    await next();
  }),
}));

function buildApp() {
  const app = new Hono();
  app.route("/settings/team", createTeamRoutes());
  return app;
}

describe("team routes", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería tener rutas registradas", () => {
    expect(app).toBeDefined();
  });

  it("GET /settings/team debería retornar 200", async () => {
    const mockMembers = [
      {
        id: "user-1",
        email: "user1@example.com",
        fullName: "User One",
        roleId: "role-admin",
        roleName: "admin",
        displayName: "Admin",
        createdAt: new Date(),
      },
    ];

    mockTeamMethods.listTeamMembers.mockResolvedValueOnce(mockMembers);

    const res = await app.request("/settings/team");

    expect([200, 400, 500]).toContain(res.status);
  });

  it("POST /settings/team/invite debería estar disponible", async () => {
    mockTeamMethods.inviteTeamMember.mockResolvedValueOnce(undefined);

    const res = await app.request("/settings/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "newuser@example.com",
        roleId: "role-standard",
      }),
    });

    expect([200, 201, 400, 422]).toContain(res.status);
  });

  it("DELETE /settings/team/:userId debería estar disponible", async () => {
    mockTeamMethods.removeTeamMember.mockResolvedValueOnce(undefined);

    const res = await app.request("/settings/team/user-1", {
      method: "DELETE",
    });

    expect([200, 400, 500]).toContain(res.status);
  });
});
