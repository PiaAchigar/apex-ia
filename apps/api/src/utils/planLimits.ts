import type { PlanType, PlanResource } from "@apex-ia/types";
import { count, eq } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { databaseProvider } from "../db/database-provider.js";
import { organizations, users } from "@apex-ia/database/schema/public";
import { flows, channelCredentials, conversations } from "@apex-ia/database/schema/tenant";

type PlanLimits = {
  flows: number;
  channels: number;
  conversations: number;
  team_members: number;
};

const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  starter: {
    flows: 3,
    channels: 2,
    conversations: 500,
    team_members: 1,
  },
  growth: {
    flows: Infinity,
    channels: 10,
    conversations: Infinity,
    team_members: 5,
  },
  business: {
    flows: Infinity,
    channels: Infinity,
    conversations: Infinity,
    team_members: Infinity,
  },
};

export function getPlanLimit(plan: PlanType, resource: PlanResource): number {
  return PLAN_LIMITS[plan][resource];
}

export function isWithinPlanLimit(
  plan: PlanType,
  resource: PlanResource,
  currentCount: number
): boolean {
  const limit = getPlanLimit(plan, resource);
  return currentCount < limit;
}

export function getPlanLimitExceededMessage(
  resource: PlanResource
): string {
  const messages: Record<PlanResource, string> = {
    flows: "Alcanzaste el límite de flows de tu plan. Upgradea para crear más.",
    channels:
      "Alcanzaste el límite de canales de tu plan. Upgradea para conectar más.",
    conversations:
      "Alcanzaste el límite de conversaciones de tu plan este mes.",
    team_members:
      "Alcanzaste el límite de miembros de tu equipo. Upgradea para invitar más.",
  };
  return messages[resource];
}

export async function checkPlanLimitBeforeAction(
  orgId: string,
  resource: PlanResource
): Promise<{ allowed: boolean; limit: number; current: number }> {
  // 1. Get plan from organizations
  const orgResult = await db
    .select({ plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  const plan = orgResult[0]?.plan as PlanType;
  if (!plan) {
    throw new Error(`Organization ${orgId} not found`);
  }

  // 2. Get limit
  const limit = getPlanLimit(plan, resource);

  // 3. Count current resources
  let current = 0;

  if (resource === "team_members") {
    const countResult = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.organizationId, orgId));
    current = countResult[0]?.count || 0;
  } else {
    const tenantDb = await databaseProvider.getClientDrizzle(orgId);

    switch (resource) {
      case "flows": {
        const countResult = await tenantDb
          .select({ count: count() })
          .from(flows);
        current = countResult[0]?.count || 0;
        break;
      }

      case "channels": {
        const countResult = await tenantDb
          .select({ count: count() })
          .from(channelCredentials);
        current = countResult[0]?.count || 0;
        break;
      }

      case "conversations": {
        const countResult = await tenantDb
          .select({ count: count() })
          .from(conversations);
        current = countResult[0]?.count || 0;
        break;
      }
    }
  }

  // 4. Return result (convert Infinity to -1 for JSON serialization)
  return {
    allowed: limit === Infinity || current < limit,
    limit: limit === Infinity ? -1 : limit,
    current,
  };
}
