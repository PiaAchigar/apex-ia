import type { MiddlewareHandler } from "hono";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "../utils/logger.js";

function createRedisClient() {
  const url = process.env["REDIS_URL"];
  const token = process.env["REDIS_TOKEN"];
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = createRedisClient();

const publicRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      prefix: "apex:rl:public",
    })
  : null;

const authRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1000, "1 m"),
      prefix: "apex:rl:auth",
    })
  : null;

const sensitiveRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "15 m"),
      prefix: "apex:rl:sensitive",
    })
  : null;

export const publicRateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  if (!publicRatelimit) return next();

  const ip = c.req.header("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await publicRatelimit.limit(ip);

  if (!success) {
    logger.warn({ ip }, "Rate limit exceeded: public");
    return c.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Demasiadas solicitudes" } },
      429
    );
  }

  return next();
};

export const authRateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  if (!authRatelimit) return next();

  const auth = c.get("auth");
  const key = auth?.organizationId ?? c.req.header("x-forwarded-for") ?? "anon";
  const { success } = await authRatelimit.limit(key);

  if (!success) {
    logger.warn({ key }, "Rate limit exceeded: auth");
    return c.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Demasiadas solicitudes" } },
      429
    );
  }

  return next();
};

export const sensitiveRateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  if (!sensitiveRatelimit) return next();

  const ip = c.req.header("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await sensitiveRatelimit.limit(ip);

  if (!success) {
    logger.warn({ ip }, "Rate limit exceeded: sensitive endpoint");
    return c.json(
      {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Demasiados intentos. Esperá 15 minutos.",
        },
      },
      429
    );
  }

  return next();
};
