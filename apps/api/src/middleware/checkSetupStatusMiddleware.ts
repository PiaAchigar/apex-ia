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
      trialEndsAt: organizations.trialEndsAt,
      plan: organizations.plan,
    })
    .from(organizations)
    .where(eq(organizations.id, auth.organizationId))
    .limit(1);

  // Tag context so frontend can show a "connect your DB" banner if needed
  c.set("setupCompleted", !!org?.setupCompletedAt);

  // Calculate trial status
  if (org) {
    const now = new Date();
    const trialEndsAt = org.trialEndsAt;
    const daysLeft = trialEndsAt
      ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000)
      : 0;

    c.set("trialStatus", {
      isActive: daysLeft > 0,
      daysLeft: Math.max(0, daysLeft),
      isExpired: !!trialEndsAt && now > trialEndsAt,
      endsAt: trialEndsAt,
      plan: org.plan,
    });
  }

  return next();
};
