export const PLAN_PRICES = {
  growth: { monthly: 59000, annual: 590000 },
  business: { monthly: 120000, annual: 120000 },
} as const;

export const TRIAL_DAYS = 14;

export const MP_CURRENCY = process.env["MP_CURRENCY"] ?? "ARS";
