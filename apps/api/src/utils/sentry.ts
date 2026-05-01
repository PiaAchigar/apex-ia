import * as Sentry from "@sentry/node";
import { httpIntegration, onUncaughtExceptionIntegration, onUnhandledRejectionIntegration } from "@sentry/node";

export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    return; // Sentry not configured
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    integrations: [
      httpIntegration({ tracing: true }),
      onUncaughtExceptionIntegration(),
      onUnhandledRejectionIntegration(),
    ],
  });
}

export { Sentry };
