export const AFC_DIVISOR = 1957.5;          // NHS AfC hours/year
export const SHIFT_HOURS = 8;
export const BANK_ONCOST = 0.20;            // affects duty counts only, not cash headline
export const PLATFORM_COST = 17000;         // ROI denominator fallback (see platformCostFor for the live figure)
/* [G-Cloud] Annual Smart Match licence fee (ex VAT), stepped by number of Licensed
   Users (≈ bank-staff size). Published G-Cloud price points; a given size takes the
   fee of the highest band whose lower bound it reaches. Auto-linked to bank size,
   still editable in the detailed model. */
export const GCLOUD_LICENCE = [
  [7501, 29101.79],
  [6001, 25284.06],
  [5001, 22793.38],
  [4001, 20900.78],
  [3001, 18400.20],
  [2001, 15167.54],
  [1401, 13280.66],
  [901,  11321.21],
  [601,   9855.27],
  [0,     9486.54],
];
export function platformCostFor(totalBankHeadcount) {
  const h = Number(totalBankHeadcount) || 0;
  for (const [floor, fee] of GCLOUD_LICENCE) if (h >= floor) return fee;
  return GCLOUD_LICENCE[GCLOUD_LICENCE.length - 1][1];
}
export const ADMIN_HRS_PER_DAY = 1.0;       // conservative (client suggested 2.5 = optimistic)
export const ADMIN_WORKING_DAYS = 225;
export const ADMIN_LOADED_HOURLY = 18;
export const SIMPLE_SHIFTS_PER_WORKER_YR = 60;   // bank work is ad-hoc, not full-time
export const SIMPLE_BLENDED_BANK_PAY = 34000;    // AfC band-mix weighted midpoint (2026/27, +3.3%)
export const DEFAULTS = { bankPool: 660, agencyFillRate: 8.3, numManagers: 12, premium: 20, displacement: 13 };  // agencyFillRate 8.3% = agreed national average (RLDatix internal data)
/* [Benchmark §4] Displaceable share of agency that can realistically move to bank (excludes break-glass /
   safety-critical cover and hard-to-fill specialist roles); displacement applies to this share only. */
export const DISPLACEABLE_SHARE_DEFAULT = 0.80;

export function stance(d) {
  if (d <= 18) return { key: "Conservative", note: "Assumes about 13% of today's agency shifts move to your own bank, roughly half of what the pilot achieved. A cautious starting point that holds up without your own trust's data." };
  if (d <= 30) return { key: "Expected", note: "Assumes about 26% moves to your own bank, the level a community trust reached in the pilot (agency fill fell 8.1%→6.0%). That is a single site, so treat it as a guide, not a promise." };
  return { key: "Optimistic", note: "Assumes more shifts move than the pilot achieved. The higher you set it, the bolder the assumption, so it is best backed by your own trust's figures." };
}

export function calc(inp) {
  const { bankPool = 0, agencyFillRate = 0, numManagers = 0,
          premium = 20, displacement = 13, shiftHours = SHIFT_HOURS,
          oncost = BANK_ONCOST * 100, platformCost = PLATFORM_COST, includeAdmin = false, displaceableShare = DISPLACEABLE_SHARE_DEFAULT } = inp;
  const p = premium / 100, d = displacement / 100, oc = oncost / 100, a = Math.min(0.99, agencyFillRate / 100);
  const bankShifts = bankPool * SIMPLE_SHIFTS_PER_WORKER_YR;
  const totalTemp = a < 1 ? bankShifts / (1 - a) : bankShifts;   // bank fills the non-agency share
  const agencyShifts = totalTemp * a;
  const bankShiftCost = (SIMPLE_BLENDED_BANK_PAY / AFC_DIVISOR) * shiftHours * (1 + oc);
  const agencyShiftCost = bankShiftCost * (1 + p);
  const agencySpend = agencyShifts * agencyShiftCost;
  const displaced = agencyShifts * displaceableShare * d;        // displaceable share only (benchmark §4)
  const agencySaving = displaced * bankShiftCost * p;            // = displaced × (agency-bank); CASH
  const timeSavedWeek = numManagers * ADMIN_HRS_PER_DAY * 5;     // co-headline (hours/week), always shown
  const adminSaving = includeAdmin ? numManagers * ADMIN_HRS_PER_DAY * ADMIN_WORKING_DAYS * ADMIN_LOADED_HOURLY : 0;
  const grossBenefit = agencySaving + adminSaving;
  const netSaving = grossBenefit - platformCost;
  const roiPct = platformCost > 0 ? (netSaving / platformCost) * 100 : null;   // n/a (not 0%) when no platform cost
  const roiMultiple = platformCost > 0 ? netSaving / platformCost : null;   // net return on the licence fee (net saving ÷ cost)
  const paybackMonths = grossBenefit > 0 ? platformCost / (grossBenefit / 12) : null;
  const capacityValue = displaced * bankShiftCost;              // gross bank backfill cost (NON-cash)
  const fillAfter = agencyFillRate * (1 - d);
  const exceedsSpend = agencySaving > agencySpend && agencySpend > 0;
  const adminOnly = agencySaving <= 0 && adminSaving > 0;       // reachable check: saving is admin time only
  const implausibleRoi = roiPct != null && roiPct > 3000;
  return { agencySpend, agencySaving, adminSaving, timeSavedWeek, grossBenefit, netSaving, roiPct, roiMultiple,
           paybackMonths, displaced, capacityValue, fillNow: agencyFillRate, fillAfter,
           exceedsSpend, adminOnly, implausibleRoi, premium, displacement, platformCost,
           bankShiftCost, agencyShiftCost, shiftHours };
}

/* ============================================================================
   DETAILED / COMMERCIAL MODEL. Per staff group, ported from the web calculator.
   Same value logic as the simple variant (cash = agency premium displaced), but
   anchored to each group's own agency spend and bank pay. Premium is a single
   official mechanic (20%) by default; an optional per-group override is supported.
   ========================================================================== */
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
/* [Benchmark §1] Agency spend as a share of turnover, by type — estimate spend when only turnover is known. */
export const AGENCY_PCT_OF_TURNOVER = { acute: 0.035, "acute-large": 0.01, mental: 0.042, community: 0.03, ambulance: 0.018, ics: 0.03 };
export function agencySpendFromTurnover(turnover, type) { return num(turnover) * (AGENCY_PCT_OF_TURNOVER[type] != null ? AGENCY_PCT_OF_TURNOVER[type] : 0.03); }
/* [Benchmark §5] Agency-intensity regime from agency % of turnover: <1% mature/low, 1-4% typical, >4% high. */
export function agencyRegime(totSpend, turnover) { const t = num(turnover); if (!(t > 0)) return { pct: null, key: null }; const pct = (totSpend / t) * 100; return { pct, key: pct < 1 ? "low" : (pct <= 4 ? "typical" : "high") }; }

/* Per-type organisation templates. Each carries a realistic staff-group profile
   (role, band, bank pay, headcount, agency spend) that sums to that type's
   totals. Pay = 2026/27 AfC midpoints. Every value is a starting point and is
   fully editable; the two size headlines (total headcount + total agency spend)
   rescale the mix proportionally via scaleGroupsTo(). */
const G = (id, role, band, bankPay, headcount, agencySpend) => ({ id, role, band, bankPay, headcount, agencySpend });

export const ORG_TYPES = {
  acute: { label: "Acute trust (district general)", desc: "~2,200 bank · ~£15m agency", iconKey: "hospital", turnover: 430000000, groups: [
    G("rn",  "Registered nurses",      "Band 5",     34592, 900, 6500000),
    G("sn",  "Senior nurses",          "Band 6",     42170, 350, 2500000),
    G("ahp", "AHPs (physio / OT)",     "Band 5/6",   38400, 300, 1500000),
    G("hca", "Healthcare assistants",  "Band 2/3",   25900, 550, 500000),
    G("doc", "Medics (locum / SAS)",   "SAS / ST3+", 60000, 100, 4000000),
  ]},
  community: { label: "Community / specialist", desc: "~700 bank · ~£7m agency", iconKey: "community", turnover: 235000000, groups: [
    G("cn",  "Community / district nurses", "Band 6",     42170, 200, 2500000),
    G("rn",  "Registered nurses",           "Band 5",     34592, 180, 1800000),
    G("ahp", "AHPs (physio / OT / SLT)",    "Band 5/6",   38400, 200, 2000000),
    G("hca", "Healthcare assistants",       "Band 2/3",   25900, 100, 400000),
    G("doc", "Medics (locum / SAS)",        "SAS / ST3+", 60000, 20,  300000),
  ]},
  mental: { label: "Mental health trust", desc: "~1,000 bank · ~£10m agency", iconKey: "behavioral", turnover: 235000000, groups: [
    G("rmn", "Mental health nurses (RMN)", "Band 5",     34592, 450, 4500000),
    G("sn",  "Senior nurses",              "Band 6",     42170, 150, 2000000),
    G("hca", "Healthcare assistants",      "Band 2/3",   25900, 300, 1500000),
    G("ahp", "AHPs (OT / psychology)",     "Band 5/6",   38400, 50,  500000),
    G("doc", "Medics (locum psych)",       "SAS / ST3+", 60000, 50,  1500000),
  ]},
  ambulance: { label: "Ambulance trust", desc: "~400 bank · ~£4m agency", iconKey: "physician", turnover: 220000000, groups: [
    G("para", "Paramedics",               "Band 6",     42170, 180, 2200000),
    G("emt",  "EMTs / care assistants",   "Band 3",     26618, 100, 700000),
    G("rn",   "Nurses (111 / UCC)",       "Band 5",     34592, 60,  600000),
    G("call", "Call handlers / dispatch", "Band 3",     26618, 50,  300000),
    G("doc",  "Medics (locum)",           "SAS / ST3+", 60000, 10,  200000),
  ]},
  ics: { label: "ICS / collaborative", desc: "~5,000 bank · ~£30m agency", iconKey: "network", turnover: 1000000000, groups: [
    G("rn",  "Registered nurses",     "Band 5",     34592, 1900, 12000000),
    G("sn",  "Senior nurses",         "Band 6",     42170, 900,  5000000),
    G("ahp", "AHPs",                  "Band 5/6",   38400, 800,  4000000),
    G("hca", "Healthcare assistants", "Band 2/3",   25900, 1200, 2000000),
    G("doc", "Medics (locum / SAS)",  "SAS / ST3+", 60000, 200,  7000000),
  ]},
};

export const AFC_BANDS = [["Band 2", 25272], ["Band 3", 26618], ["Band 5", 34592], ["Band 5/6", 38400], ["Band 6", 42170], ["Band 2/3", 25900], ["SAS / ST3+", 60000]];

// Fresh editable copy of a type's staff-group profile.
export const buildOrg = key => (ORG_TYPES[key] || ORG_TYPES.acute).groups.map(g => ({ ...g }));

// Scale every group's `key` (headcount | agencySpend) so the column sums exactly
// to `target`, preserving the mix. Largest-remainder rounding + a per-positive-group
// floor mean a group never collapses to 0 (so the size control stays reversible)
// and the parts always sum to the headline. No-op for target <= 0.
export function scaleGroupsTo(groups, key, target) {
  const vals = groups.map(g => num(g[key]));
  const cur = vals.reduce((a, b) => a + b, 0);
  if (cur <= 0 || !(target > 0)) return groups;
  const unit = key === "agencySpend" ? 1000 : 1;        // round headcount to 1, spend to £1,000
  const tU = Math.round(target / unit);
  if (tU <= 0) return groups;
  const pos = vals.map(v => v > 0);
  const nPos = pos.filter(Boolean).length;
  if (tU < nPos) {                                       // absurdly small target: keep the largest groups at 1 unit, never all-zero
    const order = vals.map((v, i) => ({ i, v })).sort((a, b) => b.v - a.v);
    const out = vals.map(() => 0);
    for (let j = 0; j < tU; j++) out[order[j].i] = 1;
    return groups.map((g, i) => ({ ...g, [key]: out[i] * unit }));
  }
  const raw = vals.map(v => (v / cur) * tU);
  const fl = raw.map((x, i) => pos[i] ? Math.max(1, Math.floor(x)) : 0);
  let rem = tU - fl.reduce((a, b) => a + b, 0);
  const order = raw.map((x, i) => ({ i, f: x - Math.floor(x), pos: pos[i] })).filter(o => o.pos).sort((a, b) => b.f - a.f);
  let k = 0;
  while (rem > 0 && order.length) { fl[order[k % order.length].i]++; rem--; k++; }
  while (rem < 0) { let bi = -1, bv = 1; for (let i = 0; i < fl.length; i++) if (fl[i] > bv) { bv = fl[i]; bi = i; } if (bi < 0) break; fl[bi]--; rem++; }
  return groups.map((g, i) => ({ ...g, [key]: fl[i] * unit }));
}

export const DETAILED_DEFAULTS = {
  premium: 20, displacement: 13, perGroupPremium: false, platformCost: PLATFORM_COST, fillRateNow: 8.3, displaceableShare: 0.80, turnover: 430000000,
  admin:   { enabled: false, managers: 12, hoursPerDay: ADMIN_HRS_PER_DAY, workingDays: ADMIN_WORKING_DAYS, loadedHourly: ADMIN_LOADED_HOURLY },
  recruit: { enabled: false, workers: 50, costPerWorker: 1000, recoveryRate: 0.10 },
};

export function calcDetailed(input) {
  const { groups = [], premium = 20, displacement = 13, shiftHours = SHIFT_HOURS, oncost = BANK_ONCOST * 100,
          platformCost = PLATFORM_COST, admin = {}, recruit = {}, fillRateNow = 8, perGroupPremium = false, displaceableShare = DISPLACEABLE_SHARE_DEFAULT, turnover } = input;
  const d = displacement / 100, oc = oncost / 100;
  let totSpend = 0, totSaving = 0, totDisplaced = 0, totHead = 0, totCapacityValue = 0;
  const rows = groups.map(g => {
    const head = num(g.headcount), spend = num(g.agencySpend), pay = num(g.bankPay);
    const gp = ((perGroupPremium && g.premium != null) ? num(g.premium) : premium) / 100;
    const bankShiftCost = (pay / AFC_DIVISOR) * shiftHours * (1 + oc);
    const agencyShiftCost = bankShiftCost * (1 + gp);
    const baseline = agencyShiftCost > 0 ? spend / agencyShiftCost : 0;
    const displaced = baseline * displaceableShare * d;   // displaceable share only (benchmark §4)
    const saving = displaced * (agencyShiftCost - bankShiftCost); // = displaced × bankShiftCost × premium
    const capacityValue = displaced * bankShiftCost;              // gross bank backfill (NON-cash)
    totSpend += spend; totSaving += saving; totDisplaced += displaced; totHead += head; totCapacityValue += capacityValue;
    return { ...g, head, spend, pay, premiumPct: Math.round(gp * 100), bankShiftCost, agencyShiftCost, baseline, displaced, saving, capacityValue };
  });
  const dW = totDisplaced || 1;   // duties-weighted average shift rates for the "how the premium is worked out" panel
  const bankShiftCost = rows.reduce((a, x) => a + x.bankShiftCost * x.displaced, 0) / dW;
  const agencyShiftCost = rows.reduce((a, x) => a + x.agencyShiftCost * x.displaced, 0) / dW;
  const mgrs = num(admin.managers), hpd = num(admin.hoursPerDay);
  const timeSavedWeek = mgrs * hpd * 5;
  const adminSaving = admin.enabled ? mgrs * hpd * num(admin.workingDays) * num(admin.loadedHourly) : 0;
  const recruitSaving = (recruit && recruit.enabled) ? num(recruit.workers) * num(recruit.costPerWorker) * num(recruit.recoveryRate) : 0;
  const grossBenefit = totSaving + adminSaving + recruitSaving;
  const netSaving = grossBenefit - num(platformCost);
  const roiPct = platformCost > 0 ? (netSaving / platformCost) * 100 : null;   // n/a (not 0%) when no platform cost
  const roiMultiple = num(platformCost) > 0 ? netSaving / num(platformCost) : null;   // net return on the licence fee (net saving ÷ cost)
  const paybackMonths = grossBenefit > 0 ? platformCost / (grossBenefit / 12) : null;
  const fillNow = num(fillRateNow), fillAfter = fillNow * (1 - d);
  const reg = agencyRegime(totSpend, turnover);
  return {
    rows, totSpend, totSaving, totDisplaced, totHead, totCapacityValue,
    adminSaving, recruitSaving, timeSavedWeek, grossBenefit, netSaving, roiPct, roiMultiple, paybackMonths,
    exceedsSpend: totSaving > totSpend && totSpend > 0, adminOnly: totSaving <= 0 && (adminSaving > 0 || recruitSaving > 0),
    implausibleRoi: roiPct != null && roiPct > 3000,
    fillNow, fillAfter, premium, displacement, perGroupPremium, platformCost: num(platformCost), bankShiftCost, agencyShiftCost, shiftHours,
    displaceableShare, turnover: num(turnover), agencyPctOfTurnover: reg.pct, regime: reg.key,
    // aliases so the shared ResultsPage can render either model unchanged:
    agencySaving: totSaving, displaced: totDisplaced, capacityValue: totCapacityValue,
  };
}
