import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { authRoutes } from "../../src/routes/auth.routes.js";

const mockAuthMethods = vi.hoisted(() => ({
  registerUserAndOrganization: vi.fn(),
  loginWithEmailAndPassword: vi.fn(),
  refreshAccessToken: vi.fn(),
  logoutUser: vi.fn(),
}));

vi.mock("../../src/services/AuthService.js", () => ({
  AuthService: vi.fn().mockImplementation(() => mockAuthMethods),
}));

vi.mock("../../src/middleware/rateLimitMiddleware.js", () => ({
  sensitiveRateLimitMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) => next()),
  publicRateLimitMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) => next()),
  authRateLimitMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) => next()),
}));

function buildApp() {
  const app = new Hono();
  app.route("/auth", authRoutes);
  return app;
}

describe("POST /auth/register", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 201 con datos del usuario registrado", async () => {
    mockAuthMethods.registerUserAndOrganization.mockResolvedValueOnce({
      userId: "user-123",
      organizationId: "org-123",
      organizationSlug: "acme",
    });

    const res = await app.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
        organizationName: "Acme Corp",
        organizationSlug: "acme",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.organizationSlug).toBe("acme");
  });

  it("debería retornar 400 con datos inválidos (email malformado)", async () => {
    const res = await app.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "not-an-email",
        password: "password123",
        fullName: "Test User",
        organizationName: "Acme",
        organizationSlug: "acme",
      }),
    });

    expect(res.status).toBe(400);
  });

  it("debería retornar 400 con slug inválido (mayúsculas)", async () => {
    const res = await app.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
        organizationName: "Acme",
        organizationSlug: "INVALID-SLUG",
      }),
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con tokens de sesión", async () => {
    mockAuthMethods.loginWithEmailAndPassword.mockResolvedValueOnce({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: 9999999999,
      userId: "user-123",
      organizationId: "org-123",
      organizationSlug: "acme",
      roleId: "admin-role-uuid",
      roleName: "admin",
      permissions: {},
    });

    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "correct-password",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBe("access-token");
    expect(body.data.organizationSlug).toBe("acme");
  });

  it("debería retornar 400 sin contraseña", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/logout", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
    mockAuthMethods.logoutUser.mockResolvedValue(undefined);
  });

  it("debería retornar 200 al cerrar sesión", async () => {
    const res = await app.request("/auth/logout", {
      method: "POST",
      headers: { Authorization: "Bearer some-token" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
