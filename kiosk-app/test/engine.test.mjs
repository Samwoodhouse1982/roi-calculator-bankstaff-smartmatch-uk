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
import { calc, calcDetailed, buildOrg, DEFAULTS, DETAILED_DEFAULTS, platformCostFor, agencyRegime } from '../src/calc/engine.js';

// Core invariant: cash saved per £1 of agency spend, at the default
// premium (20%) + displacement (13%): d * p/(1+p) = 0.13 * 0.20/1.20.
const SAVING_PER_POUND = 0.13 * 0.8 * 0.20 / 1.20; // displaceable share applied (benchmark §4)

test('Quick default matches the golden headline', () => {
  const q = calc({ ...DEFAULTS, includeAdmin: true });
  assert.equal(Math.round(q.netSaving), 55837);
  assert.equal(Math.round(q.agencySaving), 24237);
  assert.equal(Math.round(q.adminSaving), 48600);
  assert.equal(Math.round(q.grossBenefit), 72837);
  assert.equal(Math.round(q.roiPct), 328);
  assert.equal(q.timeSavedWeek, 60);
  assert.equal(Math.round(q.agencySpend), 1398290);
  assert.ok(Math.abs(q.paybackMonths - 2.80) < 0.01);
});

const DETAILED_GOLDEN = {
  acute:     { net: 291600, premium: 260000, totSpend: 15000000, totHead: 2200, roi: 1715 },
  community: { net: 152933, premium: 121333, totSpend: 7000000,  totHead: 700,  roi: 900 },
  mental:    { net: 204933, premium: 173333, totSpend: 10000000, totHead: 1000, roi: 1205 },
  ambulance: { net: 100933, premium: 69333,  totSpend: 4000000,  totHead: 400,  roi: 594 },
  ics:       { net: 551600, premium: 520000, totSpend: 30000000, totHead: 5000, roi: 3245 },
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
  assert.equal(calcDetailed({ ...DETAILED_DEFAULTS, groups: buildOrg('acute'), platformCost: 0 }).roiPct, null);
});

test('adminOnly flags an agency-free saving, and is off by default (audit #14)', () => {
  assert.equal(calc({ ...DEFAULTS, includeAdmin: true }).adminOnly, false);
  assert.equal(Math.round(calc({ ...DEFAULTS }).adminSaving), 0); // admin OFF by default (Rev D)
  const noAgency = calc({ ...DEFAULTS, agencyFillRate: 0, includeAdmin: true });
  assert.equal(noAgency.adminOnly, true);
  assert.equal(Math.round(noAgency.agencySaving), 0);
});

test('platformCostFor scales with bank headcount (Rev D)', () => {
  assert.equal(platformCostFor(300), 10000);
  assert.equal(platformCostFor(660), 14000);
  assert.equal(platformCostFor(2000), 17000);
  assert.equal(platformCostFor(5000), 20000);
});

test('agencyRegime classifies by % of turnover (benchmark §5)', () => {
  assert.equal(agencyRegime(10000000, 235000000).key, 'high');    // 4.26%
  assert.equal(agencyRegime(15000000, 430000000).key, 'typical'); // 3.49%
  assert.equal(agencyRegime(5000000, 1000000000).key, 'low');     // 0.5%
  assert.equal(agencyRegime(10000000, 0).key, null);              // no turnover -> no regime
});
