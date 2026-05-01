import type { ErrorHandler } from "hono";
import { ZodError } from "zod";
import { Sentry } from "../utils/sentry.js";
import { logger } from "../utils/logger.js";

export const errorHandlerMiddleware: ErrorHandler = (err, c) => {
  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Datos inválidos",
          details: err.flatten().fieldErrors,
        },
      },
      400
    );
  }

  logger.error(
    {
      error: err.message,
      stack: err.stack,
      path: c.req.path,
      method: c.req.method,
    },
    "Unhandled error"
  );

  // Capture error in Sentry
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, {
      tags: {
        path: c.req.path,
        method: c.req.method,
      },
    });
  }

  return c.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message:
          process.env["NODE_ENV"] === "production"
            ? "Error interno del servidor"
            : err.message,
      },
    },
    500
  );
};
