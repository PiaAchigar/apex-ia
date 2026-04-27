import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "../utils/validators.js";
import { AuthService } from "../services/AuthService.js";
import { sensitiveRateLimitMiddleware } from "../middleware/rateLimitMiddleware.js";

const authRoutes = new Hono();
const authService = new AuthService();

authRoutes.post(
  "/register",
  sensitiveRateLimitMiddleware,
  zValidator("json", registerSchema),
  async (c) => {
    const input = c.req.valid("json");
    const ipAddress = c.req.header("x-forwarded-for") ?? "unknown";

    const result = await authService.registerUserAndOrganization(
      input,
      ipAddress
    );

    return c.json({ success: true, data: result }, 201);
  }
);

authRoutes.post(
  "/login",
  sensitiveRateLimitMiddleware,
  zValidator("json", loginSchema),
  async (c) => {
    const input = c.req.valid("json");

    const result = await authService.loginWithEmailAndPassword(input);

    return c.json({ success: true, data: result }, 200);
  }
);

authRoutes.post(
  "/refresh",
  zValidator("json", refreshTokenSchema),
  async (c) => {
    const { refreshToken } = c.req.valid("json");

    const result = await authService.refreshAccessToken(refreshToken);

    return c.json({ success: true, data: result }, 200);
  }
);

authRoutes.post("/logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    await authService.logoutUser(authHeader.slice(7));
  }

  return c.json({ success: true, data: { message: "Sesión cerrada" } }, 200);
});

export { authRoutes };
