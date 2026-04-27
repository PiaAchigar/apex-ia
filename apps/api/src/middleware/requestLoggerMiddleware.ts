import type { MiddlewareHandler } from "hono";
import { logger } from "../utils/logger.js";

export const requestLoggerMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info(
    {
      method,
      path,
      status,
      duration,
      orgSlug: c.get("orgSlug"),
    },
    `${method} ${path} ${status} ${duration}ms`
  );
};
