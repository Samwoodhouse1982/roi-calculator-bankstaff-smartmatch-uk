export const AFC_DIVISOR = 1957.5;          // NHS AfC hours/year
export const SHIFT_HOURS = 8;
export const BANK_ONCOST = 0.20;            // affects duty counts only, not cash headline
export const PLATFORM_COST = 17000;         // ROI denominator (confirm incl. implementation)
export const ADMIN_HRS_PER_DAY = 1.0;       // conservative (client suggested 2.5 = optimistic)
export const ADMIN_WORKING_DAYS = 225;
export const ADMIN_LOADED_HOURLY = 18;
export const SIMPLE_SHIFTS_PER_WORKER_YR = 60;   // bank work is ad-hoc, not full-time
export const SIMPLE_BLENDED_BANK_PAY = 34000;    // AfC band-mix weighted midpoint (2026/27, +3.3%)
export const DEFAULTS = { bankPool: 660, agencyFillRate: 15, numManagers: 12, premium: 20, displacement: 13 };

export function stance(d) {
  if (d <= 18) return { key: "Conservative", note: "≈13%, about half the pilot's measured effect. The recommended default for public / self-serve use: defensible without trust-specific evidence." };
  if (d <= 30) return { key: "Pilot / Expected", note: "≈26%, the effect measured at one community site (agency fill 8.1%→6.0%). Single-site and partly attributable, so best framed in a guided conversation." };
  return { key: "Optimistic", note: "≈35%, above the pilot result. Use only with strong, trust-specific evidence." };
}

export function calc(inp) {
  const { bankPool = 0, agencyFillRate = 0, numManagers = 0,
          premium = 20, displacement = 10, shiftHours = SHIFT_HOURS,
          oncost = BANK_ONCOST * 100, platformCost = PLATFORM_COST, includeAdmin = true } = inp;
  const p = premium / 100, d = displacement / 100, oc = oncost / 100, a = Math.min(0.99, agencyFillRate / 100);
  const bankShifts = bankPool * SIMPLE_SHIFTS_PER_WORKER_YR;
  const totalTemp = a < 1 ? bankShifts / (1 - a) : bankShifts;   // bank fills the non-agency share
  const agencyShifts = totalTemp * a;
  const bankShiftCost = (SIMPLE_BLENDED_BANK_PAY / AFC_DIVISOR) * shiftHours * (1 + oc);
  const agencyShiftCost = bankShiftCost * (1 + p);
  const agencySpend = agencyShifts * agencyShiftCost;
  const displaced = agencyShifts * d;                            // temp duties moved agency -> bank
  const agencySaving = displaced * bankShiftCost * p;            // = displaced × (agency-bank); CASH
  const timeSavedWeek = numManagers * ADMIN_HRS_PER_DAY * 5;     // co-headline (hours/week), always shown
  const adminSaving = includeAdmin ? numManagers * ADMIN_HRS_PER_DAY * ADMIN_WORKING_DAYS * ADMIN_LOADED_HOURLY : 0;
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

/* ============================================================================
   DETAILED / COMMERCIAL MODEL. Per staff group, ported from the web calculator.
   Same value logic as the simple variant (cash = agency premium displaced), but
   anchored to each group's own agency spend and bank pay. Premium is a single
   official mechanic (20%) by default; an optional per-group override is supported.
   ========================================================================== */
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

export const PRESETS = {
  acute:     { label: "Acute trust",            desc: "~660 bank · ~£10m agency",  scale: 1.0, iconKey: "hospital" },
  community: { label: "Community / specialist", desc: "~260 bank · lower agency",  scale: 0.4, iconKey: "community" },
  mental:    { label: "Mental health trust",    desc: "~400 bank · nursing & HCA", scale: 0.6, iconKey: "behavioral" },
  ambulance: { label: "Ambulance trust",        desc: "~350 bank · paramedic",     scale: 0.5, iconKey: "physician" },
  ics:       { label: "ICS / collaborative",    desc: "~2,300 bank · multi-org",   scale: 3.5, iconKey: "network" },
};

export const STAFF_GROUPS = [
  { id: "rn",  role: "Registered nurses",     band: "Band 5",     bankPay: 34592, headcount: 240, agencySpend: 4000000 },
  { id: "sn",  role: "Senior nurses",         band: "Band 6",     bankPay: 42170, headcount: 120, agencySpend: 1500000 },
  { id: "ahp", role: "AHPs (physio / OT)",    band: "Band 5/6",   bankPay: 38400, headcount: 100, agencySpend: 800000  },
  { id: "hca", role: "Healthcare assistants", band: "Band 2/3",   bankPay: 25900, headcount: 160, agencySpend: 700000  },
  { id: "doc", role: "Medics (locum / SAS)",  band: "SAS / ST3+", bankPay: 60000, headcount: 40,  agencySpend: 3000000 },
];

export const AFC_BANDS = [["Band 2", 25272], ["Band 3", 26618], ["Band 5", 34592], ["Band 5/6", 38400], ["Band 6", 42170], ["Band 2/3", 25900], ["SAS / ST3+", 60000]];

export const applyPreset = scale => STAFF_GROUPS.map(g => ({ ...g, headcount: Math.round(g.headcount * scale), agencySpend: Math.round(g.agencySpend * scale / 1000) * 1000 }));

export const DETAILED_DEFAULTS = {
  premium: 20, displacement: 13, perGroupPremium: false, platformCost: PLATFORM_COST, fillRateNow: 8,
  admin:   { enabled: true, managers: 12, hoursPerDay: ADMIN_HRS_PER_DAY, workingDays: ADMIN_WORKING_DAYS, loadedHourly: ADMIN_LOADED_HOURLY },
  recruit: { enabled: false, workers: 50, costPerWorker: 1000, recoveryRate: 0.10 },
};

export function calcDetailed(input) {
  const { groups = [], premium = 20, displacement = 13, shiftHours = SHIFT_HOURS, oncost = BANK_ONCOST * 100,
          platformCost = PLATFORM_COST, admin = {}, recruit = {}, fillRateNow = 8, perGroupPremium = false } = input;
  const d = displacement / 100, oc = oncost / 100;
  let totSpend = 0, totSaving = 0, totDisplaced = 0, totHead = 0, totCapacityValue = 0;
  const rows = groups.map(g => {
    const head = num(g.headcount), spend = num(g.agencySpend), pay = num(g.bankPay);
    const gp = ((perGroupPremium && g.premium != null) ? num(g.premium) : premium) / 100;
    const bankShiftCost = (pay / AFC_DIVISOR) * shiftHours * (1 + oc);
    const agencyShiftCost = bankShiftCost * (1 + gp);
    const baseline = agencyShiftCost > 0 ? spend / agencyShiftCost : 0;
    const displaced = baseline * d;
    const saving = displaced * (agencyShiftCost - bankShiftCost); // = displaced × bankShiftCost × premium
    const capacityValue = displaced * bankShiftCost;              // gross bank backfill (NON-cash)
    totSpend += spend; totSaving += saving; totDisplaced += displaced; totHead += head; totCapacityValue += capacityValue;
    return { ...g, head, spend, pay, premiumPct: Math.round(gp * 100), bankShiftCost, agencyShiftCost, baseline, displaced, saving, capacityValue };
  });
  const mgrs = num(admin.managers), hpd = num(admin.hoursPerDay);
  const timeSavedWeek = mgrs * hpd * 5;
  const adminSaving = admin.enabled ? mgrs * hpd * num(admin.workingDays) * num(admin.loadedHourly) : 0;
  const recruitSaving = (recruit && recruit.enabled) ? num(recruit.workers) * num(recruit.costPerWorker) * num(recruit.recoveryRate) : 0;
  const grossBenefit = totSaving + adminSaving + recruitSaving;
  const netSaving = grossBenefit - num(platformCost);
  const roiPct = platformCost > 0 ? (netSaving / platformCost) * 100 : 0;
  const paybackMonths = grossBenefit > 0 ? platformCost / (grossBenefit / 12) : null;
  const fillNow = num(fillRateNow), fillAfter = fillNow * (1 - d);
  return {
    rows, totSpend, totSaving, totDisplaced, totHead, totCapacityValue,
    adminSaving, recruitSaving, timeSavedWeek, grossBenefit, netSaving, roiPct, paybackMonths,
    exceedsSpend: totSaving > totSpend && totSpend > 0, implausibleRoi: roiPct > 3000,
    fillNow, fillAfter, premium, displacement, perGroupPremium,
    // aliases so the shared ResultsPage can render either model unchanged:
    agencySaving: totSaving, displaced: totDisplaced, capacityValue: totCapacityValue,
  };
}
