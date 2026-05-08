import type { MiddlewareHandler } from "hono";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "../utils/logger.js";

function createRedisClient() {
  // Upstash REST client requires the REST URL (https://...) and REST token.
  // This is a different variable from REDIS_URL (which is the TCP rediss:// URL used by BullMQ).
  const url = process.env["UPSTASH_REDIS_REST_URL"];
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"];
  if (!url || !token) {
    logger.warn(
      "UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set — rate limiting disabled"
    );
    return null;
  }
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

function isHealthPath(path: string): boolean {
  return path === "/health" || path === "/api/health";
}

export const publicRateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  // Healthcheck must always pass through, even if Redis is unreachable.
  if (isHealthPath(c.req.path)) return next();
  if (!publicRatelimit) return next();

  const ip = c.req.header("x-forwarded-for") ?? "127.0.0.1";

  try {
    const { success } = await publicRatelimit.limit(ip);
    if (!success) {
      logger.warn({ ip }, "Rate limit exceeded: public");
      return c.json(
        { success: false, error: { code: "RATE_LIMITED", message: "Demasiadas solicitudes" } },
        429
      );
    }
  } catch (err) {
    // Fail-open: a Redis outage must not break the API.
    logger.warn({ err }, "Rate limit check failed — failing open");
  }

  return next();
};

export const authRateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  if (isHealthPath(c.req.path)) return next();
  if (!authRatelimit) return next();

  const auth = c.get("auth");
  const key = auth?.organizationId ?? c.req.header("x-forwarded-for") ?? "anon";

  try {
    const { success } = await authRatelimit.limit(key);
    if (!success) {
      logger.warn({ key }, "Rate limit exceeded: auth");
      return c.json(
        { success: false, error: { code: "RATE_LIMITED", message: "Demasiadas solicitudes" } },
        429
      );
    }
  } catch (err) {
    logger.warn({ err }, "Auth rate limit check failed — failing open");
  }

  return next();
};

export const sensitiveRateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  if (isHealthPath(c.req.path)) return next();
  if (!sensitiveRatelimit) return next();

  const ip = c.req.header("x-forwarded-for") ?? "127.0.0.1";

  try {
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
  } catch (err) {
    logger.warn({ err }, "Sensitive rate limit check failed — failing open");
  }

  return next();
};
