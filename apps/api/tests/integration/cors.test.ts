import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { corsMiddleware } from "../../src/middleware/corsMiddleware.js";

function buildApp() {
  const app = new Hono();
  app.use(corsMiddleware);
  app.get("/test", (c) => c.json({ ok: true }));
  return app;
}

describe("CORS Middleware", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    // NODE_ENV es 'test' en vitest — se comporta como development para CORS
    app = buildApp();
  });

  it("debería permitir origen autorizado (localhost:3000)", async () => {
    const res = await app.request(
      new Request("http://localhost:3000/test", {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "GET" },
      })
    );

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
  });

  it("debería tener credentials permitidas", async () => {
    const res = await app.request(
      new Request("http://localhost:3000/test", {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "GET" },
      })
    );

    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("debería exponer los headers de rate limiting", async () => {
    const res = await app.request(
      new Request("http://localhost:3000/test", {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "GET" },
      })
    );

    const exposed = res.headers.get("Access-Control-Expose-Headers") ?? "";
    expect(exposed).toContain("X-RateLimit-Limit");
  });

  it("debería incluir los métodos permitidos", async () => {
    const res = await app.request(
      new Request("http://localhost:3000/test", {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "DELETE" },
      })
    );

    const methods = res.headers.get("Access-Control-Allow-Methods") ?? "";
    expect(methods).toContain("DELETE");
    expect(methods).toContain("POST");
  });
});
