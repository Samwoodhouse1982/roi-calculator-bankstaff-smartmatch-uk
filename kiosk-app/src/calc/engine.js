export const AFC_DIVISOR = 1957.5;          // NHS AfC hours/year
export const SHIFT_HOURS = 8;
export const BANK_ONCOST = 0.20;            // affects duty counts only, not cash headline
export const PLATFORM_COST = 17000;         // ROI denominator (confirm incl. implementation)
export const ADMIN_HRS_PER_DAY = 1.0;       // conservative (client suggested 2.5 = optimistic)
export const ADMIN_WORKING_DAYS = 225;
export const ADMIN_LOADED_HOURLY = 18;
export const SIMPLE_SHIFTS_PER_WORKER_YR = 60;   // bank work is ad-hoc, not full-time
export const SIMPLE_BLENDED_BANK_PAY = 33000;    // AfC band-mix weighted midpoint (2025/26)
export const DEFAULTS = { bankPool: 660, agencyFillRate: 8, numManagers: 12, premium: 20, displacement: 10 };

export function stance(d) {
  if (d <= 12) return { key: "Conservative", note: "Only a small share of agency duties is assumed to move to bank — the most defensible default." };
  if (d <= 22) return { key: "Moderate", note: "A meaningful share of agency duties moves to bank as utilisation improves." };
  return { key: "Optimistic", note: "Approaches the programme's observed upper end (one site). Use only with strong, trust-specific evidence." };
}

export function calc(inp) {
  const { bankPool = 0, agencyFillRate = 0, numManagers = 0,
          premium = 20, displacement = 10, shiftHours = SHIFT_HOURS,
          oncost = BANK_ONCOST * 100, platformCost = PLATFORM_COST } = inp;
  const p = premium / 100, d = displacement / 100, oc = oncost / 100, a = Math.min(0.99, agencyFillRate / 100);
  const bankShifts = bankPool * SIMPLE_SHIFTS_PER_WORKER_YR;
  const totalTemp = a < 1 ? bankShifts / (1 - a) : bankShifts;   // bank fills the non-agency share
  const agencyShifts = totalTemp * a;
  const bankShiftCost = (SIMPLE_BLENDED_BANK_PAY / AFC_DIVISOR) * shiftHours * (1 + oc);
  const agencyShiftCost = bankShiftCost * (1 + p);
  const agencySpend = agencyShifts * agencyShiftCost;
  const displaced = agencyShifts * d;                            // temp duties moved agency -> bank
  const agencySaving = displaced * bankShiftCost * p;            // = displaced × (agency-bank); CASH
  const timeSavedWeek = numManagers * ADMIN_HRS_PER_DAY * 5;     // co-headline (hours/week)
  const adminSaving = numManagers * ADMIN_HRS_PER_DAY * ADMIN_WORKING_DAYS * ADMIN_LOADED_HOURLY;
  const grossBenefit = agencySaving + adminSaving;
  const netSaving = grossBenefit - platformCost;
  const roiPct = platformCost > 0 ? (netSaving / platformCost) * 100 : 0;
  const paybackMonths = grossBenefit > 0 ? platformCost / (grossBenefit / 12) : null;
  const capacityValue = displaced * bankShiftCost;              // gross bank backfill cost (NON-cash)
  const fillAfter = agencyFillRate * (1 - d);
  const exceedsSpend = agencySaving > agencySpend && agencySpend > 0;
  const implausibleRoi = roiPct > 3000;
  return { agencySpend, agencySaving, adminSaving, timeSavedWeek, grossBenefit, netSaving, roiPct,
           paybackMonths, displaced, capacityValue, fillNow: agencyFillRate, fillAfter,
           exceedsSpend, implausibleRoi, premium, displacement };
}
