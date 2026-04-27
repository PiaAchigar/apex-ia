import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { authRoutes } from "../../src/routes/auth.routes.js";

const mockAuthMethods = vi.hoisted(() => ({
  registerUserAndOrganization: vi.fn(),
  loginWithEmailAndPassword: vi.fn().mockResolvedValue(null),
  refreshAccessToken: vi.fn(),
  logoutUser: vi.fn(),
}));

vi.mock("../../src/services/AuthService.js", () => ({
  AuthService: vi.fn().mockImplementation(() => mockAuthMethods),
}));

// Mockear rate limit para probar el comportamiento
let requestCount = 0;
const RATE_LIMIT = 5;

vi.mock("../../src/middleware/rateLimitMiddleware.js", () => ({
  sensitiveRateLimitMiddleware: vi.fn(async (c: { json: (body: unknown, status: number) => Response }, next: () => Promise<void>) => {
    requestCount++
    if (requestCount > RATE_LIMIT) {
      return c.json({ success: false, error: { code: "RATE_LIMITED", message: "Demasiadas solicitudes" } }, 429)
    }
    return next()
  }),
  publicRateLimitMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) => next()),
  authRateLimitMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) => next()),
}));

function buildApp() {
  const app = new Hono();
  app.route("/auth", authRoutes);
  return app;
}

describe("Rate Limiting", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    requestCount = 0;
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería permitir N requests dentro del límite", async () => {
    for (let i = 0; i < RATE_LIMIT; i++) {
      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@test.com", password: "wrong123" }),
      });

      // 400 por validación o 401 por auth incorrecta — ambos son ok
      expect([400, 401, 200]).toContain(res.status);
    }
  });

  it("debería retornar 429 después de superar el límite", async () => {
    // Consumir el límite
    for (let i = 0; i < RATE_LIMIT; i++) {
      await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@test.com", password: "wrong123" }),
      });
    }

    // La siguiente request debe ser 429
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com", password: "wrong123" }),
    });

    expect(res.status).toBe(429);
  });
});
