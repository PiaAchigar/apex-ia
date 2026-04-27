import type { PlanType, PlanResource } from "@apex-ia/types";

type PlanLimits = {
  flows: number;
  channels: number;
  conversations: number;
  team_members: number;
};

const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
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
