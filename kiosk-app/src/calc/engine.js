export const AFC_DIVISOR = 1957.5;          // NHS AfC hours/year
export const SHIFT_HOURS = 8;
export const BANK_ONCOST = 0.20;            // affects duty counts only, not cash headline
export const PLATFORM_COST = 17000;         // ROI denominator (confirm incl. implementation)
export const ADMIN_HRS_PER_DAY = 1.0;       // conservative (client suggested 2.5 = optimistic)
export const ADMIN_WORKING_DAYS = 225;
export const ADMIN_LOADED_HOURLY = 18;
export const SIMPLE_SHIFTS_PER_WORKER_YR = 60;   // bank work is ad-hoc, not full-time
export const SIMPLE_BLENDED_BANK_PAY = 34000;    // AfC band-mix weighted midpoint (2026/27, +3.3%)
export const DEFAULTS = { bankPool: 660, agencyFillRate: 8, numManagers: 12, premium: 20, displacement: 13 };

export function stance(d) {
  if (d <= 18) return { key: "Conservative", note: "≈13% — about half the pilot's measured effect. The recommended default for public / self-serve use: defensible without trust-specific evidence." };
  if (d <= 30) return { key: "Pilot / Expected", note: "≈26% — the effect measured at one community site (agency fill 8.1%→6.0%). Single-site and partly attributable, so best framed in a guided conversation." };
  return { key: "Optimistic", note: "≈35% — above the pilot result. Use only with strong, trust-specific evidence." };
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

/* Phased ramp + cumulative (3- and 5-year). Benefits build as bank utilisation
   improves; the platform cost recurs in full each year. (Matches the web version.) */
export const RAMP_PCTS = { 3: [0.45, 0.75, 1.00], 5: [0.30, 0.55, 0.75, 0.90, 1.00] };
export function project(grossAnnual, platformCost = PLATFORM_COST, years = 3) {
  const pcts = RAMP_PCTS[years] || RAMP_PCTS[3];
  const yrGross = pcts.map(p => grossAnnual * p);
  const yrNet = yrGross.map(g => g - platformCost);
  return { years, pcts, yrGross, yrNet,
           cumGross: yrGross.reduce((a, b) => a + b, 0), cumNet: yrNet.reduce((a, b) => a + b, 0) };
}
