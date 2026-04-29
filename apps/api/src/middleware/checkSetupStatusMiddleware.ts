import type { MiddlewareHandler } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { organizations } from "@apex-ia/database/schema/public";

// Setup is optional — users can operate without connecting their DB.
// Reminder emails handle the nudging (see setup-reminder.job.ts).
export const checkSetupStatusMiddleware: MiddlewareHandler = async (c, next) => {
  const auth = c.get("auth");
  if (!auth?.organizationId) return next();

  const [org] = await db
    .select({
      setupCompletedAt: organizations.setupCompletedAt,
      plan: organizations.plan,
    })
    .from(organizations)
    .where(eq(organizations.id, auth.organizationId))
    .limit(1);

  // Tag context so frontend can show a "connect your DB" banner if needed
  c.set("setupCompleted", !!org?.setupCompletedAt);
  c.set("plan", org?.plan);

  return next();
};
