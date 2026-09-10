export const AFC_DIVISOR = 1957.5;          // NHS AfC hours/year
export const SHIFT_HOURS = 8;
export const BANK_ONCOST = 0.20;            // affects duty counts only, not cash headline
/* Annual Smart Match (BankStaff+) licence fee, ex VAT, banded by the number of workers
   on the bank register. Supplied price list of September 2026, which supersedes the
   earlier G-Cloud band list: it is ~14.5% lower at every band the two share, and unlike
   the old list it is continuous, so no bank size has to round up through a gap any more.
   Each pair is [inclusive upper bound, annual fee], ascending. The published list ends at
   100,000 users; above that the top fee is held and the real figure is quoted manually,
   which is also where the bank-size slider stops, so the two agree exactly.
   Auto-linked to bank size, editable in the detailed build. */
export const LICENCE_BANDS = [
  [   600,   8108],   // 1-600
  [   700,   8423],   // 601-700
  [   800,   8733],   // 701-800
  [   900,   9155],   // 801-900
  [  1000,   9676],   // 901-1,000
  [  1100,  10098],   // 1,001-1,100
  [  1200,  10421],   // 1,101-1,200
  [  1300,  10725],   // 1,201-1,300
  [  1400,  11115],   // 1,301-1,400
  [  1500,  11351],   // 1,401-1,500
  [  1600,  11612],   // 1,501-1,600
  [  1700,  11937],   // 1,601-1,700
  [  1800,  12170],   // 1,701-1,800
  [  1900,  12374],   // 1,801-1,900
  [  2000,  12480],   // 1,901-2,000
  [  2200,  12964],   // 2,001-2,200
  [  2400,  13547],   // 2,201-2,400
  [  2600,  14353],   // 2,401-2,600
  [  2800,  14733],   // 2,601-2,800
  [  3000,  15265],   // 2,801-3,000
  [  3200,  15727],   // 3,001-3,200
  [  3400,  16102],   // 3,201-3,400
  [  3600,  16406],   // 3,401-3,600
  [  3800,  16932],   // 3,601-3,800
  [  4000,  17418],   // 3,801-4,000
  [  4200,  17864],   // 4,001-4,200
  [  4400,  18178],   // 4,201-4,400
  [  4600,  18444],   // 4,401-4,600
  [  4800,  18887],   // 4,601-4,800
  [  5000,  19301],   // 4,801-5,000
  [  5200,  19482],   // 5,001-5,200
  [  5400,  19695],   // 5,201-5,400
  [  5600,  20008],   // 5,401-5,600
  [  5800,  20362],   // 5,601-5,800
  [  6000,  20692],   // 5,801-6,000
  [  6500,  21610],   // 6,001-6,500
  [  7000,  22838],   // 6,501-7,000
  [  7500,  24124],   // 7,001-7,500
  [  8000,  24873],   // 7,501-8,000
  [  8500,  25745],   // 8,001-8,500
  [  9000,  26612],   // 8,501-9,000
  [  9500,  27349],   // 9,001-9,500
  [ 10000,  28082],   // 9,501-10,000
  [ 10500,  28878],   // 10,001-10,500
  [ 11000,  29374],   // 10,501-11,000
  [ 11500,  30061],   // 11,001-11,500
  [ 12000,  30788],   // 11,501-12,000
  [ 12500,  31466],   // 12,001-12,500
  [ 13000,  32179],   // 12,501-13,000
  [ 13500,  32850],   // 13,001-13,500
  [ 14000,  33551],   // 13,501-14,000
  [ 14500,  34214],   // 14,001-14,500
  [ 15000,  35026],   // 14,501-15,000
  [ 16000,  36968],   // 15,001-16,000
  [ 17000,  38544],   // 16,001-17,000
  [ 18000,  40122],   // 17,001-18,000
  [ 19000,  41703],   // 18,001-19,000
  [ 20000,  43286],   // 19,001-20,000
  [ 21000,  45450],   // 20,001-21,000
  [ 22000,  47614],   // 21,001-22,000
  [ 23000,  49779],   // 22,001-23,000
  [ 24000,  51943],   // 23,001-24,000
  [ 25000,  54107],   // 24,001-25,000
  [ 26000,  56271],   // 25,001-26,000
  [ 27000,  58436],   // 26,001-27,000
  [ 28000,  60600],   // 27,001-28,000
  [ 29000,  62764],   // 28,001-29,000
  [ 30000,  64929],   // 29,001-30,000
  [ 31000,  67093],   // 30,001-31,000
  [ 32000,  69257],   // 31,001-32,000
  [ 33000,  71421],   // 32,001-33,000
  [ 34000,  73586],   // 33,001-34,000
  [ 35000,  75750],   // 34,001-35,000
  [ 36000,  77914],   // 35,001-36,000
  [ 37000,  80079],   // 36,001-37,000
  [ 38000,  82243],   // 37,001-38,000
  [ 39000,  84407],   // 38,001-39,000
  [ 40000,  86571],   // 39,001-40,000
  [ 41000,  88736],   // 40,001-41,000
  [ 42000,  90900],   // 41,001-42,000
  [ 43000,  93064],   // 42,001-43,000
  [ 44000,  95229],   // 43,001-44,000
  [ 45000,  97393],   // 44,001-45,000
  [ 46000,  99557],   // 45,001-46,000
  [ 47000, 101721],   // 46,001-47,000
  [ 48000, 103886],   // 47,001-48,000
  [ 49000, 106050],   // 48,001-49,000
  [ 50000, 108214],   // 49,001-50,000
  [ 51000, 110379],   // 50,001-51,000
  [ 52000, 112543],   // 51,001-52,000
  [ 53000, 114707],   // 52,001-53,000
  [ 54000, 116872],   // 53,001-54,000
  [ 55000, 119036],   // 54,001-55,000
  [ 56000, 121200],   // 55,001-56,000
  [ 57000, 123364],   // 56,001-57,000
  [ 58000, 125529],   // 57,001-58,000
  [ 59000, 127693],   // 58,001-59,000
  [ 60000, 129857],   // 59,001-60,000
  [ 61000, 132021],   // 60,001-61,000
  [ 62000, 134186],   // 61,001-62,000
  [ 63000, 136350],   // 62,001-63,000
  [ 64000, 138514],   // 63,001-64,000
  [ 65000, 140679],   // 64,001-65,000
  [ 66000, 142843],   // 65,001-66,000
  [ 67000, 145007],   // 66,001-67,000
  [ 68000, 147172],   // 67,001-68,000
  [ 69000, 149336],   // 68,001-69,000
  [ 70000, 151500],   // 69,001-70,000
  [ 71000, 153664],   // 70,001-71,000
  [ 72000, 155829],   // 71,001-72,000
  [ 73000, 157993],   // 72,001-73,000
  [ 74000, 160157],   // 73,001-74,000
  [ 75000, 162322],   // 74,001-75,000
  [ 76000, 164486],   // 75,001-76,000
  [ 77000, 166650],   // 76,001-77,000
  [ 78000, 168814],   // 77,001-78,000
  [ 79000, 170979],   // 78,001-79,000
  [ 80000, 173143],   // 79,001-80,000
  [ 81000, 175307],   // 80,001-81,000
  [ 82000, 177472],   // 81,001-82,000
  [ 83000, 179636],   // 82,001-83,000
  [ 84000, 181800],   // 83,001-84,000
  [ 85000, 183964],   // 84,001-85,000
  [ 86000, 186129],   // 85,001-86,000
  [ 87000, 188293],   // 86,001-87,000
  [ 88000, 190457],   // 87,001-88,000
  [ 89000, 192622],   // 88,001-89,000
  [ 90000, 194786],   // 89,001-90,000
  [ 91000, 196950],   // 90,001-91,000
  [ 92000, 199114],   // 91,001-92,000
  [ 93000, 201279],   // 92,001-93,000
  [ 94000, 203443],   // 93,001-94,000
  [ 95000, 205607],   // 94,001-95,000
  [ 96000, 207772],   // 95,001-96,000
  [ 97000, 209936],   // 96,001-97,000
  [ 98000, 212100],   // 97,001-98,000
  [ 99000, 214264],   // 98,001-99,000
  [100000, 216429],   // 99,001-100,000
];
export function platformCostFor(totalBankHeadcount) {
  const h = Number(totalBankHeadcount) || 0;
  for (const [ceil, fee] of LICENCE_BANDS) if (h <= ceil) return fee;
  return LICENCE_BANDS[LICENCE_BANDS.length - 1][1];
}
/* ROI denominator fallback, used only when a licence fee is not supplied (the detailed
   build's default, and calc()'s default parameter). This calculator never reaches it:
   it always passes platformCostFor(bankPool). The old £17,000 stand-in, rescaled by the
   same ~14.5% the published bands moved, so the detailed model's default denominator
   tracks the new price list instead of quietly staying on the old one. */
export const PLATFORM_COST = 14530;
export const ADMIN_HRS_PER_DAY = 1.0;       // conservative (client suggested 2.5 = optimistic)
export const ADMIN_WORKING_DAYS = 225;
export const ADMIN_LOADED_HOURLY = 18;
export const SIMPLE_BLENDED_BANK_PAY = 34000;    // AfC band-mix weighted midpoint (2026/27, +3.3%)
/* Quick-mode agency-spend estimate, per REGISTERED bank worker (FY2025/26 basis).
   REGISTERED = everyone on the trust's bank register, INCLUDING substantive staff who
   also pick up bank shifts (~2/3 of registrants) — NOT bank-only headcount (per bank-only
   the figure would be ~£8k). The UI label must say so, or the denominator is wrong.
   Derivation: £1.2bn national NHS agency spend (NHS England M12 2025/26, unaudited)
   ÷ ~400–500k registered bank workers ≈ £2,400–£3,000 → midpoint £2,700.
   ⚠ REVIEW ANNUALLY — this decays fast: national policy mandates −30% agency in 2026/27,
   −25% in 2027/28, and zero agency spend by 2029/30. It is only the fallback used when a
   user gives bank size alone; a user-entered actual agency spend always takes precedence. */
export const AGENCY_SPEND_PER_REGISTERED_BANK_WORKER_GBP = 2700;   // FY2025-26 basis, review annually
export const DEFAULTS = { bankPool: 660, agencyFillRate: 8.3, numManagers: 12, premium: 20, displacement: 13 };  // agencyFillRate 8.3% = agreed national average (RLDatix internal data)
/* [Benchmark §4] Displaceable share of agency that can realistically move to bank (excludes break-glass /
   safety-critical cover and hard-to-fill specialist roles); displacement applies to this share only. */
export const DISPLACEABLE_SHARE_DEFAULT = 0.80;

/* Stance notes state the EFFECTIVE whole-book rate (stance % × 80% displaceable share),
   not just the nominal %, so the label matches what the engine actually applies (audit M2).
   'Moderate' is the customer-facing name (was internally 'Expected'). */
export function stance(d) {
  const eff = Math.round(d * DISPLACEABLE_SHARE_DEFAULT);   // effective share of ALL agency
  if (d <= 18) return { key: "Conservative", note: `Assumes ${d}% of the displaceable agency share moves to your own bank, about ${eff}% of all agency, well below the 26% relative fall seen in a pilot study.` };
  if (d <= 30) return { key: "Moderate", note: `Assumes ${d}% of the displaceable agency share moves to your own bank, about ${eff}% of all agency, near the 26% relative fall reached at a community trust (agency fill 8.1%→6.0%).` };
  return { key: "Optimistic", note: `Assumes ${d}% of the displaceable agency share moves to your own bank (about ${eff}% of all agency). This is at or beyond the result seen in the pilot study, so it is best backed by your own organisation's figures.` };
}

export function calc(inp) {
  const { bankPool = 0, agencyFillRate = 0, numManagers = 0,
          premium = 20, displacement = 13, shiftHours = SHIFT_HOURS,
          oncost = BANK_ONCOST * 100, platformCost = PLATFORM_COST, includeAdmin = false, displaceableShare = DISPLACEABLE_SHARE_DEFAULT } = inp;
  const p = premium / 100, d = displacement / 100, oc = oncost / 100;
  const bankShiftCost = (SIMPLE_BLENDED_BANK_PAY / AFC_DIVISOR) * shiftHours * (1 + oc);
  const agencyShiftCost = bankShiftCost * (1 + p);
  // Anchor on agency spend: the user's actual figure when given, else auto-estimated at
  // ~£2,700 per registered bank worker (FY2025/26). The fill rate feeds the reliance
  // narrative (fillAfter) only, not the cash.
  const agencySpend = inp.agencySpend != null ? Math.max(0, Number(inp.agencySpend) || 0) : Math.round(bankPool * AGENCY_SPEND_PER_REGISTERED_BANK_WORKER_GBP / 1000) * 1000;   // clean thousands - it's an estimate, and it keeps this product's quote identical to the commercial calculator's
  const baseline = agencyShiftCost > 0 ? agencySpend / agencyShiftCost : 0;
  const displaced = baseline * displaceableShare * d;           // duty counts (need a pay rate)
  const agencySaving = agencySpend * displaceableShare * d * (p / (1 + p));   // CASH: pay-independent identity
  const timeSavedWeek = numManagers * ADMIN_HRS_PER_DAY * 5;     // co-headline (hours/week), always shown
  const adminSaving = includeAdmin ? numManagers * ADMIN_HRS_PER_DAY * ADMIN_WORKING_DAYS * ADMIN_LOADED_HOURLY : 0;
  const grossBenefit = agencySaving + adminSaving;
  const netSaving = grossBenefit - platformCost;
  const roiPct = platformCost > 0 ? (netSaving / platformCost) * 100 : null;   // n/a (not 0%) when no platform cost
  const roiMultiple = platformCost > 0 ? netSaving / platformCost : null;   // net return on the licence fee (net saving ÷ cost)
  const paybackMonths = grossBenefit > 0 ? platformCost / (grossBenefit / 12) : null;
  const capacityValue = displaced * bankShiftCost;              // gross bank backfill cost (NON-cash)
  const fillAfter = agencyFillRate * (1 - displaceableShare * d);   // reduction on the displaceable share only, consistent with the modelled counts
  const exceedsSpend = agencySaving > agencySpend && agencySpend > 0;
  const adminOnly = agencySaving <= 0 && adminSaving > 0;       // reachable check: saving is admin time only
  const implausibleRoi = roiPct != null && roiPct > 4000;       // >40× flags genuinely extreme inputs; normal usage sits well below
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
    G("rn",  "Registered nurses",      "Band 5",     35558, 900, 6500000),
    G("sn",  "Senior nurses",          "Band 6",     44038, 350, 2500000),
    G("ahp", "AHPs (physio / OT)",     "Band 5/6",   39798, 300, 1500000),
    G("hca", "Healthcare assistants",  "Band 2/3",   25945, 550, 500000),
    G("doc", "Medics (locum / SAS)",   "SAS / ST3+", 60000, 100, 4000000),
  ]},
  community: { label: "Community / specialist", desc: "~700 bank · ~£7m agency", iconKey: "community", turnover: 235000000, groups: [
    G("cn",  "Community / district nurses", "Band 6",     44038, 200, 2500000),
    G("rn",  "Registered nurses",           "Band 5",     35558, 180, 1800000),
    G("ahp", "AHPs (physio / OT / SLT)",    "Band 5/6",   39798, 200, 2000000),
    G("hca", "Healthcare assistants",       "Band 2/3",   25945, 100, 400000),
    G("doc", "Medics (locum / SAS)",        "SAS / ST3+", 60000, 20,  300000),
  ]},
  mental: { label: "Mental health trust", desc: "~1,000 bank · ~£10m agency", iconKey: "behavioral", turnover: 235000000, groups: [
    G("rmn", "Mental health nurses (RMN)", "Band 5",     35558, 450, 4500000),
    G("sn",  "Senior nurses",              "Band 6",     44038, 150, 2000000),
    G("hca", "Healthcare assistants",      "Band 2/3",   25945, 300, 1500000),
    G("ahp", "AHPs (OT / psychology)",     "Band 5/6",   39798, 50,  500000),
    G("doc", "Medics (locum psych)",       "SAS / ST3+", 60000, 50,  1500000),
  ]},
  ambulance: { label: "Ambulance trust", desc: "~400 bank · ~£4m agency", iconKey: "physician", turnover: 220000000, groups: [
    G("para", "Paramedics",               "Band 6",     44038, 180, 2200000),
    G("emt",  "EMTs / care assistants",   "Band 3",     26618, 100, 700000),
    G("rn",   "Nurses (111 / UCC)",       "Band 5",     35558, 60,  600000),
    G("call", "Call handlers / dispatch", "Band 3",     26618, 50,  300000),
    G("doc",  "Medics (locum)",           "SAS / ST3+", 60000, 10,  200000),
  ]},
  ics: { label: "ICS / collaborative", desc: "~5,000 bank · ~£30m agency", iconKey: "network", turnover: 1000000000, groups: [
    G("rn",  "Registered nurses",     "Band 5",     35558, 1900, 12000000),
    G("sn",  "Senior nurses",         "Band 6",     44038, 900,  5000000),
    G("ahp", "AHPs",                  "Band 5/6",   39798, 800,  4000000),
    G("hca", "Healthcare assistants", "Band 2/3",   25945, 1200, 2000000),
    G("doc", "Medics (locum / SAS)",  "SAS / ST3+", 60000, 200,  7000000),
  ]},
};

export const AFC_BANDS = [["Band 2", 25272], ["Band 3", 26618], ["Band 5", 35558], ["Band 5/6", 39798], ["Band 6", 44038], ["Band 2/3", 25945], ["SAS / ST3+", 60000]];

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
    const displaced = baseline * displaceableShare * d;   // displaceable share only (benchmark §4); duty COUNTS need a real pay rate
    // Cash via the pay-independent identity (pay/hours/on-cost cancel out of the saving),
    // so a zero or missing pay rate cannot silently delete a group's cash (commercial parity).
    const saving = spend * displaceableShare * d * (gp / (1 + gp));
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
  const fillNow = num(fillRateNow), fillAfter = fillNow * (1 - displaceableShare * d);   // reduction on the displaceable share only, matching the simple variant and the modelled counts
  const reg = agencyRegime(totSpend, turnover);
  return {
    rows, totSpend, totSaving, totDisplaced, totHead, totCapacityValue,
    adminSaving, recruitSaving, timeSavedWeek, grossBenefit, netSaving, roiPct, roiMultiple, paybackMonths,
    exceedsSpend: totSaving > totSpend && totSpend > 0, adminOnly: totSaving <= 0 && (adminSaving > 0 || recruitSaving > 0),
    zeroPay: rows.some(x => x.spend > 0 && !(num(x.bankPay) > 0)),   // cash still counted; duty counts unavailable
    implausibleRoi: roiPct != null && roiPct > 4000,   // >40× (M3 parity: ICS preset ~32× is legitimate scale)
    fillNow, fillAfter, premium, displacement, perGroupPremium, platformCost: num(platformCost), bankShiftCost, agencyShiftCost, shiftHours,
    displaceableShare, turnover: num(turnover), agencyPctOfTurnover: reg.pct, regime: reg.key,
    // aliases so the shared ResultsPage can render either model unchanged:
    agencySaving: totSaving, displaced: totDisplaced, capacityValue: totCapacityValue,
  };
}
