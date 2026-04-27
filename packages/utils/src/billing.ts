export const PLAN_PRICES = {
  growth: { monthly: 49000, annual: 490000 },
  business: { monthly: 149000, annual: 1490000 },
} as const;

export const TRIAL_DAYS = 14;

export const PLAN_FEATURES = {
  starter: {
    flows: 3,
    channels: 2,
    conversations: 500,
    team_members: 1,
  },
  growth: {
    flows: "Ilimitados",
    channels: 8,
    conversations: "Ilimitadas",
    team_members: 5,
  },
  business: {
    flows: "Ilimitados",
    channels: "Ilimitados",
    conversations: "Ilimitadas",
    team_members: "Ilimitados",
  },
};
