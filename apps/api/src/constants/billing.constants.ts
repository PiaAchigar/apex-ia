export const PLAN_PRICES = {
  growth: { monthly: 49000, annual: 490000 },
  business: { monthly: 149000, annual: 1490000 },
} as const;

export const TRIAL_DAYS = 14;

export const MP_CURRENCY = process.env["MP_CURRENCY"] ?? "ARS";
