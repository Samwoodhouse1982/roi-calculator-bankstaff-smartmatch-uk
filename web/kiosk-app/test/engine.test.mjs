// Engine regression + cross-variant identity tests for the kiosk calc engine.
//
// Run: `npm test` (uses Node's built-in test runner, no extra deps).
//
// WHY THIS EXISTS (audit #9): the web build (roi-calculator.html on `main`) and
// this kiosk build carry SEPARATE copies of the same cash model, and they have
// drifted before. Both engines are pinned to the SAME golden numbers below, so
// neither can change behaviour without a test failing. The web repo has a
// mirror of these golden values (test/engine.web.test in roi-calculator.html's
// repo); keep the two in lockstep.
//
// If you INTENTIONALLY change a default or constant, update the expected value
// here in the same commit - that is the signal, not noise.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calc, calcDetailed, buildOrg, DEFAULTS, DETAILED_DEFAULTS, platformCostFor, agencyRegime, LICENCE_BANDS } from '../src/calc/engine.js';
import { BANK_MIN, BANK_MAX, bankScale } from '../src/theme.js';

// Core invariant: cash saved per £1 of agency spend, at the default
// premium (20%) + displacement (13%): d * p/(1+p) = 0.13 * 0.20/1.20.
const SAVING_PER_POUND = 0.13 * 0.8 * 0.20 / 1.20; // displaceable share applied (benchmark §4)

// Quick mode anchors on agency spend, auto-estimated at £2,700 per registered bank
// worker (FY2025/26: £1.2bn national agency spend ÷ ~400-500k registered bank workers).
// 660 × 2700 = £1.782m. Matches the web build's re-pinned quick goldens exactly.
test('Quick default matches the golden headline (spend-anchored)', () => {
  const q = calc({ ...DEFAULTS, includeAdmin: true });
  assert.equal(Math.round(q.agencySpend), 1782000);           // 660 × £2,700
  assert.equal(Math.round(q.agencySaving), 30888);            // 1.782m × 0.8 × 0.13 × 0.2/1.2
  assert.equal(Math.round(q.adminSaving), 48600);
  assert.equal(Math.round(q.grossBenefit), 79488);
  assert.equal(Math.round(q.netSaving), 64958);                // 79,488 gross - the £14,530 fallback fee
  assert.equal(Math.round(q.roiPct), 447);
  assert.equal(Math.round(q.roiMultiple * 100) / 100, 4.47);   // net return on the licence fee (net saving ÷ cost)
  assert.equal(q.timeSavedWeek, 60);
  assert.ok(Math.abs(q.paybackMonths - 14530 * 12 / 79488) < 1e-9);
});

test('Quick agency spend: auto-estimate is £2,700/registered bank worker; an explicit figure wins', () => {
  assert.equal(Math.round(calc({ ...DEFAULTS }).agencySpend), 1782000);
  const own = calc({ ...DEFAULTS, agencySpend: 15000000 });
  assert.equal(Math.round(own.agencySpend), 15000000);
  assert.equal(Math.round(own.agencySaving), 260000);         // same anchor as the acute preset → same saving
});

test('Quick default start (2,000 bank, Moderate 26%) sits well below the >40× warning', () => {
  const start = calc({ bankPool: 2000, displacement: 26, platformCost: platformCostFor(2000) });
  assert.ok(start.roiPct > 1250 && start.roiPct < 1550);     // ~14× at £2,700/worker: legitimate scale
  assert.equal(start.implausibleRoi, false);
});

/* Net and roi re-pinned to the September 2026 price list: the premium, spend and head
   counts are untouched, and every net moved by exactly the £2,470 the fallback fee fell. */
const DETAILED_GOLDEN = {
  acute:     { net: 294070, premium: 260000, totSpend: 15000000, totHead: 2200, roi: 2024 },
  community: { net: 155403, premium: 121333, totSpend: 7000000,  totHead: 700,  roi: 1070 },
  mental:    { net: 207403, premium: 173333, totSpend: 10000000, totHead: 1000, roi: 1427 },
  ambulance: { net: 103403, premium: 69333,  totSpend: 4000000,  totHead: 400,  roi: 712 },
  ics:       { net: 554070, premium: 520000, totSpend: 30000000, totHead: 5000, roi: 3813 },
};

for (const [type, g] of Object.entries(DETAILED_GOLDEN)) {
  test(`Detailed ${type} matches the golden headline`, () => {
    const d = calcDetailed({ ...DETAILED_DEFAULTS, admin: { ...DETAILED_DEFAULTS.admin, enabled: true }, groups: buildOrg(type) });
    assert.equal(Math.round(d.netSaving), g.net);
    assert.equal(Math.round(d.totSaving), g.premium);
    assert.equal(Math.round(d.totSpend), g.totSpend);
    assert.equal(d.totHead, g.totHead);
    assert.equal(Math.round(d.roiPct), g.roi);
  });
}

test('IDENTITY: both engines save the same fraction per £ of agency spend (audit #7/#9)', () => {
  const q = calc({ ...DEFAULTS });
  assert.ok(Math.abs(q.agencySaving / q.agencySpend - SAVING_PER_POUND) < 1e-9,
    `Quick: ${q.agencySaving / q.agencySpend} != ${SAVING_PER_POUND}`);
  for (const type of Object.keys(DETAILED_GOLDEN)) {
    const d = calcDetailed({ ...DETAILED_DEFAULTS, groups: buildOrg(type) });
    assert.ok(Math.abs(d.totSaving / d.totSpend - SAVING_PER_POUND) < 1e-9,
      `Detailed ${type}: ${d.totSaving / d.totSpend} != ${SAVING_PER_POUND}`);
  }
});

test('Displaceable share scales the agency saving (benchmark §4)', () => {
  const full = calcDetailed({ ...DETAILED_DEFAULTS, displaceableShare: 1, groups: buildOrg('acute') });
  const def = calcDetailed({ ...DETAILED_DEFAULTS, groups: buildOrg('acute') });
  assert.equal(Math.round(full.totSaving), 325000);   // 80% of this = 260000 (the default)
  assert.ok(Math.abs(def.totSaving - full.totSaving * 0.8) < 1);
});

test('ROI is n/a (null), not 0%, when platform cost is zero (audit #16)', () => {
  assert.equal(calc({ ...DEFAULTS, platformCost: 0 }).roiPct, null);
  assert.equal(calc({ ...DEFAULTS, platformCost: 0 }).roiMultiple, null);
  assert.equal(calcDetailed({ ...DETAILED_DEFAULTS, groups: buildOrg('acute'), platformCost: 0 }).roiPct, null);
});

test('adminOnly flags an agency-free saving, and is off by default (audit #14)', () => {
  assert.equal(calc({ ...DEFAULTS, includeAdmin: true }).adminOnly, false);
  assert.equal(Math.round(calc({ ...DEFAULTS }).adminSaving), 0); // admin OFF by default (Rev D)
  // Post-M3 the fill rate no longer drives spend, so an agency-free case is agencySpend: 0.
  const noAgency = calc({ ...DEFAULTS, agencySpend: 0, includeAdmin: true });
  assert.equal(noAgency.adminOnly, true);
  assert.equal(Math.round(noAgency.agencySaving), 0);
});

test('platformCostFor follows the supplied licence bands', () => {
  assert.equal(platformCostFor(300), 8108);
  assert.equal(platformCostFor(600), 8108);     // upper edge of band 1
  assert.equal(platformCostFor(660), 8423);
  assert.equal(platformCostFor(1000), 9676);
  assert.equal(platformCostFor(1500), 11351);
  assert.equal(platformCostFor(1501), 11612);   // one over -> the next band, which now exists
  assert.equal(platformCostFor(2000), 12480);   // default kiosk size
  assert.equal(platformCostFor(5000), 19301);
  assert.equal(platformCostFor(12000), 30788);
  assert.equal(platformCostFor(100000), 216429);  // top of the bank-size slider and of the price list
});

/* The old G-Cloud list had gaps (no 701-800, no 1,501-2,000), so a bank landing in one
   had to round up to the covering tier. This list is continuous, and these guard that:
   a gap would show up as a fee that does not move where a band boundary says it should. */
test('licence bands are contiguous and ascending, and cover the whole slider range', () => {
  for (let i = 1; i < LICENCE_BANDS.length; i++) {
    assert.ok(LICENCE_BANDS[i][0] > LICENCE_BANDS[i - 1][0], `band ${i} ceiling not ascending`);
    assert.ok(LICENCE_BANDS[i][1] > LICENCE_BANDS[i - 1][1], `band ${i} fee not ascending`);
  }
  let prev = 0;
  for (let b = BANK_MIN; b <= BANK_MAX; b += 10) {   // every size the slider can produce
    const fee = platformCostFor(b);
    assert.ok(fee > 0 && fee >= prev, `fee went backwards or vanished at ${b}`);
    prev = fee;
  }
  // The list must cover the whole slider: the top band ends exactly at BANK_MAX,
  // so no size the slider offers falls through to the held top fee.
  assert.equal(LICENCE_BANDS[LICENCE_BANDS.length - 1][0], BANK_MAX);
  // A boundary charges the lower band, one worker over moves to the next.
  assert.ok(platformCostFor(901) > platformCostFor(900));
  assert.ok(platformCostFor(2201) > platformCostFor(2200));
});

test('agencyRegime classifies by % of turnover (benchmark §5)', () => {
  assert.equal(agencyRegime(10000000, 235000000).key, 'high');    // 4.26%
  assert.equal(agencyRegime(15000000, 430000000).key, 'typical'); // 3.49%
  assert.equal(agencyRegime(5000000, 1000000000).key, 'low');     // 0.5%
  assert.equal(agencyRegime(10000000, 0).key, null);              // no turnover -> no regime
});

/* ===== Cross-product parity regressions (July 2026 review vs the commercial calculator) ===== */

test('PARITY: quick auto-estimate rounds to clean thousands, matching the commercial product', () => {
  assert.equal(calc({ bankPool: 333 }).agencySpend, 899000);    // 333 x 2700 = 899,100 -> 899,000
  assert.equal(calc({ bankPool: 1234 }).agencySpend, 3332000);  // 3,331,800 -> 3,332,000
  assert.equal(calc({ bankPool: 660 }).agencySpend, 1782000);   // already round: unchanged
});

test('PARITY: detailed fillAfter applies the displaceable share (was fill x (1-d), disagreeing with the simple variant)', () => {
  const d = calcDetailed({ ...DETAILED_DEFAULTS, groups: buildOrg('acute'), fillRateNow: 8.3 });
  assert.ok(Math.abs(d.fillAfter - 8.3 * (1 - 0.8 * 0.13)) < 1e-9);
  const q = calc({ ...DEFAULTS });   // and the two modes now agree with each other
  assert.ok(Math.abs(q.fillAfter - 8.3 * (1 - 0.8 * 0.13)) < 1e-9);
});

test('PARITY: zero bank pay cannot delete a group\'s cash saving (pay-independent identity)', () => {
  const gs = buildOrg('acute'); gs[0].bankPay = 0;   // RNs: GBP 6.5m agency spend, no pay rate
  const d = calcDetailed({ ...DETAILED_DEFAULTS, groups: gs });
  assert.equal(Math.round(d.totSaving), 260000);     // unchanged from the acute golden
  assert.equal(d.rows[0].displaced, 0);              // duty counts still need a real pay rate
  assert.equal(d.zeroPay, true);
  assert.equal(calcDetailed({ ...DETAILED_DEFAULTS, groups: buildOrg('acute') }).zeroPay, false);
});

/* ===== Bank-register slider scale ===== */

test('bank slider scale covers the full range and round-trips', () => {
  assert.equal(bankScale.fromPos(0), BANK_MIN);
  assert.equal(bankScale.fromPos(bankScale.steps), BANK_MAX);
  assert.equal(bankScale.toPos(BANK_MIN), 0);
  assert.equal(bankScale.toPos(BANK_MAX), bankScale.steps);

  // Every position gives a value in range, and the scale never goes backwards.
  let prev = -1;
  for (let p = 0; p <= bankScale.steps; p++) {
    const v = bankScale.fromPos(p);
    assert.ok(v >= BANK_MIN && v <= BANK_MAX, `position ${p} gave ${v}`);
    assert.ok(v >= prev, `value went backwards at position ${p}`);
    prev = v;
  }

  // A value set from a position maps back to that neighbourhood, so dragging
  // and releasing does not make the thumb jump.
  for (const v of [50, 100, 500, 2000, 5000, 12000, 25000, 60000, 100000]) {
    const round = bankScale.fromPos(bankScale.toPos(v));
    assert.ok(Math.abs(round - v) <= Math.max(10, v * 0.01), `${v} round-tripped to ${round}`);
  }
});

test('bank slider keeps the common range usable, which is why it is not linear', () => {
  // Half the track sits below ~2,000 workers, where nearly every bank register is.
  assert.ok(bankScale.toPos(2000) > 400 && bankScale.toPos(2000) < 600);
  // A linear track would put the old 12,000 maximum at 12% of the width; here it is past halfway.
  assert.ok(bankScale.toPos(12000) > 650);
});
