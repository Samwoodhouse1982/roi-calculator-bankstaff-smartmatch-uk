// Engine regression + parity test for the WEB build (roi-calculator.html).
//
// Run from the repo root: `node --test` (Node 18+ built-in runner, no deps,
// no package.json needed — this stays a static, build-less site).
//
// WHY THIS EXISTS (audit #9): the web build carries its calc engine inline in
// roi-calculator.html, and the kiosk build has a separate copy in
// kiosk-app/src/calc/engine.js. They have drifted before. This test extracts the
// inline engine and pins it to the SAME golden numbers as the kiosk's
// test/engine.test.mjs, so the two cannot diverge without a test failing.
//
// It evaluates only the pure-JS engine region (constants .. simpleToInput, i.e.
// everything before the "HOOKS + SMALL COMPONENTS" marker), so no DOM/React is
// needed. If you INTENTIONALLY change a default/constant, update both test files.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../roi-calculator.html', import.meta.url), 'utf8');
const body = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const marker = body.indexOf('/* ===== HOOKS + SMALL COMPONENTS');
assert.ok(marker > 0, 'could not locate the engine/components boundary in roi-calculator.html');
const engineJS = body.slice(0, marker).replace(/const\s*\{\s*useState[^;]*\}\s*=\s*React;/, '');
// eslint-disable-next-line no-new-func
const E = new Function(engineJS + '\nreturn { calc, simpleToInput, buildOrg };')();

const SHARED = { premium: 20, displacement: 13, platformCost: 17000, shiftHours: 8, oncost: 20 };
const ADMIN = { enabled: true, managers: 12, hoursPerDay: 1.0, workingDays: 225, loadedHourly: 18 };
const SAVING_PER_POUND = 0.13 * 0.20 / 1.20;

const quick = () => E.calc(E.simpleToInput({ bankPool: 660, agencyFillRate: 15, numManagers: 12, includeAdmin: true }, SHARED));
const detailed = (type, over = {}) => E.calc({ groups: E.buildOrg(type), ...SHARED, admin: ADMIN, recruit: { enabled: false }, fillRateNow: 8, perGroupPremium: false, ...over });

test('Quick default matches the golden headline (parity with kiosk)', () => {
  const q = quick();
  assert.equal(Math.round(q.netSaving), 61896);
  assert.equal(Math.round(q.adminSaving), 48600);
  assert.equal(Math.round(q.grossBenefit), 78896);
  assert.equal(Math.round(q.roiPct), 364);
  assert.equal(q.timeSavedWeek, 60);
  assert.equal(Math.round(q.totSpend), 1398290);   // derived agency spend
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
  test(`Detailed ${type} matches the golden headline (parity with kiosk)`, () => {
    const d = detailed(type);
    assert.equal(Math.round(d.netSaving), g.net);
    assert.equal(Math.round(d.totSaving), g.premium);
    assert.equal(Math.round(d.totSpend), g.totSpend);
    assert.equal(d.totHead, g.totHead);
    assert.equal(Math.round(d.roiPct), g.roi);
  });
}

test('IDENTITY: saving per £ of agency spend = 0.13 x 0.20/1.20 (audit #7/#9)', () => {
  const q = quick();
  assert.ok(Math.abs(q.totSaving / q.totSpend - SAVING_PER_POUND) < 1e-9);
  for (const type of Object.keys(DETAILED_GOLDEN)) {
    const d = detailed(type);
    assert.ok(Math.abs(d.totSaving / d.totSpend - SAVING_PER_POUND) < 1e-9, `Detailed ${type}`);
  }
});

test('Acute preset converges on the Quick default (audit #7)', () => {
  assert.ok(Math.abs(detailed('acute').netSaving - quick().netSaving) / quick().netSaving < 0.005);
});

test('ROI is n/a (null), not 0%, when platform cost is zero (audit #16)', () => {
  assert.equal(E.calc(E.simpleToInput({ bankPool: 660, agencyFillRate: 15, numManagers: 12, includeAdmin: true }, { ...SHARED, platformCost: 0 })).roiPct, null);
  assert.equal(detailed('acute', { platformCost: 0 }).roiPct, null);
});

test('adminOnly flags an agency-free saving, and is off by default (audit #14)', () => {
  assert.equal(quick().adminOnly, false);
  const noAgency = E.calc(E.simpleToInput({ bankPool: 660, agencyFillRate: 0, numManagers: 12, includeAdmin: true }, SHARED));
  assert.equal(noAgency.adminOnly, true);
});
