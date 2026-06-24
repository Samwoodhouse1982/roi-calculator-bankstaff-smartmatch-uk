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
import { calc, calcDetailed, buildOrg, DEFAULTS, DETAILED_DEFAULTS } from '../src/calc/engine.js';

// Core invariant: cash saved per £1 of agency spend, at the default
// premium (20%) + displacement (13%): d * p/(1+p) = 0.13 * 0.20/1.20.
const SAVING_PER_POUND = 0.13 * 0.20 / 1.20; // = 0.0216666...

test('Quick default matches the golden headline', () => {
  const q = calc({ ...DEFAULTS });
  assert.equal(Math.round(q.netSaving), 61896);
  assert.equal(Math.round(q.agencySaving), 30296);
  assert.equal(Math.round(q.adminSaving), 48600);
  assert.equal(Math.round(q.grossBenefit), 78896);
  assert.equal(Math.round(q.roiPct), 364);
  assert.equal(q.timeSavedWeek, 60);
  assert.equal(Math.round(q.agencySpend), 1398290);
  assert.ok(Math.abs(q.paybackMonths - 2.59) < 0.01);
});

const DETAILED_GOLDEN = {
  acute:     { net: 61933,  premium: 30333,  totSpend: 1400000,  totHead: 660,  roi: 364 },
  community: { net: 96600,  premium: 65000,  totSpend: 3000000,  totHead: 260,  roi: 568 },
  mental:    { net: 161600, premium: 130000, totSpend: 6000000,  totHead: 400,  roi: 951 },
  ambulance: { net: 118267, premium: 86667,  totSpend: 4000000,  totHead: 350,  roi: 696 },
  ics:       { net: 789933, premium: 758333, totSpend: 35000000, totHead: 2300, roi: 4647 },
};

for (const [type, g] of Object.entries(DETAILED_GOLDEN)) {
  test(`Detailed ${type} matches the golden headline`, () => {
    const d = calcDetailed({ ...DETAILED_DEFAULTS, groups: buildOrg(type) });
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

test('Acute preset converges on the Quick default (audit #7)', () => {
  const q = calc({ ...DEFAULTS });
  const d = calcDetailed({ ...DETAILED_DEFAULTS, groups: buildOrg('acute') });
  // Same model, near-identical inputs (£1.40m preset vs £1.398m derived): within 0.5%.
  assert.ok(Math.abs(d.netSaving - q.netSaving) / q.netSaving < 0.005,
    `acute net ${d.netSaving} vs quick net ${q.netSaving}`);
});

test('ROI is n/a (null), not 0%, when platform cost is zero (audit #16)', () => {
  assert.equal(calc({ ...DEFAULTS, platformCost: 0 }).roiPct, null);
  assert.equal(calcDetailed({ ...DETAILED_DEFAULTS, groups: buildOrg('acute'), platformCost: 0 }).roiPct, null);
});

test('adminOnly flags an agency-free saving, and is off by default (audit #14)', () => {
  assert.equal(calc({ ...DEFAULTS }).adminOnly, false);
  const noAgency = calc({ ...DEFAULTS, agencyFillRate: 0 });
  assert.equal(noAgency.adminOnly, true);
  assert.equal(Math.round(noAgency.agencySaving), 0);
});
