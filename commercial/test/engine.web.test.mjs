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
const E = new Function(engineJS + '\nreturn { calc, simpleToInput, buildOrg, platformCostFor, num };')();

const SHARED = { premium: 20, displacement: 13, platformCost: 17000, shiftHours: 8, oncost: 20, displaceableShare: 0.80 };
const ADMIN = { enabled: true, managers: 12, hoursPerDay: 1.0, workingDays: 225, loadedHourly: 18 };
const SAVING_PER_POUND = 0.13 * 0.80 * 0.20 / 1.20;   // displaceable share applied (benchmark §4)

const quick = () => E.calc(E.simpleToInput({ bankPool: 660, agencyFillRate: 8.3, numManagers: 12, includeAdmin: true }, SHARED));
const detailed = (type, over = {}) => E.calc({ groups: E.buildOrg(type), ...SHARED, admin: ADMIN, recruit: { enabled: false }, fillRateNow: 8, perGroupPremium: false, ...over });

// Quick mode anchors on agency spend auto-estimated at £2,700 per registered bank worker
// (FY2025/26 basis: £1.2bn national agency spend ÷ ~400-500k registered bank workers).
// 660 x 2700 = £1.782m.
test('Quick default matches the golden headline (spend-anchored)', () => {
  const q = quick();
  assert.equal(Math.round(q.totSpend), 1782000);               // 660 x £2,700
  assert.equal(Math.round(q.totSaving), 30888);                // 1.782m x 0.8 x 0.13 x 0.2/1.2
  assert.equal(Math.round(q.adminSaving), 48600);
  assert.equal(Math.round(q.grossBenefit), 79488);
  assert.equal(Math.round(q.netSaving), 62488);
  assert.equal(Math.round(q.roiPct), 368);
  assert.equal(Math.round(q.roiMultiple * 100) / 100, 3.68);   // net return on the licence fee (net saving ÷ cost)
  assert.equal(q.timeSavedWeek, 60);
  assert.ok(Math.abs(q.paybackMonths - 17000 * 12 / 79488) < 1e-9);
});

test('Quick agency spend: auto-estimate is £2,700/registered bank worker; an explicit figure wins', () => {
  assert.equal(Math.round(E.calc(E.simpleToInput({ bankPool: 660, agencyFillRate: 8.3, numManagers: 12, includeAdmin: false }, SHARED)).totSpend), 1782000);
  const own = E.calc(E.simpleToInput({ bankPool: 660, agencySpend: 15000000, agencyFillRate: 8.3, numManagers: 12, includeAdmin: false }, SHARED));
  assert.equal(Math.round(own.totSpend), 15000000);
  assert.equal(Math.round(own.totSaving), 260000);   // same anchor as the acute preset -> same saving
});

test('Quick auto-estimate is flat £2,700/registered worker, independent of fill rate (parity with the short web product)', () => {
  const at = f => Math.round(E.calc(E.simpleToInput({ bankPool: 1000, agencyFillRate: f, numManagers: 12, includeAdmin: false }, SHARED)).totSpend);
  assert.equal(at(8.3), 2700000);                    // £2,700/worker exactly
  assert.equal(at(16.6), 2700000);                   // fill rate never moves the estimate:
  assert.equal(at(5), 2700000);                      // it drives the reliance narrative only
  // an explicit agency spend also ignores the fill rate for the cash figure
  const a = E.calc(E.simpleToInput({ bankPool: 1000, agencySpend: 5000000, agencyFillRate: 5, numManagers: 12 }, SHARED));
  const b = E.calc(E.simpleToInput({ bankPool: 1000, agencySpend: 5000000, agencyFillRate: 30, numManagers: 12 }, SHARED));
  assert.equal(Math.round(a.totSaving), Math.round(b.totSaving));
});

const DETAILED_GOLDEN = {
  acute:     { net: 291600, premium: 260000, totSpend: 15000000, totHead: 2200, roi: 1715 },
  community: { net: 152933, premium: 121333, totSpend: 7000000,  totHead: 700,  roi: 900 },
  mental:    { net: 204933, premium: 173333, totSpend: 10000000, totHead: 1000, roi: 1205 },
  ambulance: { net: 100933, premium: 69333,  totSpend: 4000000,  totHead: 400,  roi: 594 },
  ics:       { net: 551600, premium: 520000, totSpend: 30000000, totHead: 5000, roi: 3245 },
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

test('IDENTITY: saving per £ = displaceable 0.8 x 0.13 x 0.20/1.20 (audit #7/#9)', () => {
  const q = quick();
  assert.ok(Math.abs(q.totSaving / q.totSpend - SAVING_PER_POUND) < 1e-9);
  for (const type of Object.keys(DETAILED_GOLDEN)) {
    const d = detailed(type);
    assert.ok(Math.abs(d.totSaving / d.totSpend - SAVING_PER_POUND) < 1e-9, `Detailed ${type}`);
  }
});

test('Zero bank pay cannot delete a group\'s cash saving (pay cancels out of the identity)', () => {
  const gs = E.buildOrg('acute'); gs[0].bankPay = 0;   // RNs: £6.5m agency spend, no pay rate
  const d = E.calc({ groups: gs, ...SHARED, admin: ADMIN, recruit: { enabled: false }, fillRateNow: 8, perGroupPremium: false });
  assert.equal(Math.round(d.totSaving), 260000);       // unchanged from the acute golden
  assert.equal(d.rows[0].displaced, 0);                // but duty counts need a real pay rate
  assert.equal(d.zeroPay, true);
  assert.equal(detailed('acute').zeroPay, false);
});

test('num() keeps scientific notation intact and still strips pasted currency', () => {
  assert.equal(E.num('1e6'), 1000000);      // type=number inputs accept this; the old regex stripped the e -> 16
  assert.equal(E.num('2.5e3'), 2500);
  assert.equal(E.num('£1,500'), 1500);
  assert.equal(E.num(' 42 '), 42);
  assert.equal(E.num('-5'), -5);
  assert.equal(E.num('', 7), 7);
});

test('fillAfter applies the displaceable share, matching the modelled shift counts', () => {
  const q = quick();   // fill rate 8.3%, ds 0.80, displacement 13%
  assert.ok(Math.abs(q.fillAfter - 8.3 * (1 - 0.80 * 0.13)) < 1e-9);
  const d = detailed('acute');   // fillRateNow 8
  assert.ok(Math.abs(d.fillAfter - 8 * (1 - 0.80 * 0.13)) < 1e-9);
});

test('Displaceable share scales the agency saving (benchmark §4)', () => {
  const full = detailed('acute', { displaceableShare: 1 });
  assert.equal(Math.round(full.totSaving), 325000);          // 80% of this = 260000 (the default)
  assert.ok(Math.abs(detailed('acute').totSaving - full.totSaving * 0.8) < 1);
});

test('implausibleRoi (>40x) does not trip on the ICS default, only on genuine outliers', () => {
  assert.equal(detailed('ics').implausibleRoi, false);          // ~32x at defaults: legitimate scale
  assert.equal(detailed('acute', { platformCost: 1000 }).implausibleRoi, true);   // ~300x: input error
});

test('ROI is n/a (null), not 0%, when platform cost is zero (audit #16)', () => {
  const zero = E.calc(E.simpleToInput({ bankPool: 660, agencyFillRate: 8.3, numManagers: 12, includeAdmin: true }, { ...SHARED, platformCost: 0 }));
  assert.equal(zero.roiPct, null);
  assert.equal(zero.roiMultiple, null);
  assert.equal(detailed('acute', { platformCost: 0 }).roiPct, null);
});

test('adminOnly flags an agency-free saving, and is off by default (audit #14)', () => {
  assert.equal(quick().adminOnly, false);
  const noAgency = E.calc(E.simpleToInput({ bankPool: 660, agencySpend: 0, agencyFillRate: 8.3, numManagers: 12, includeAdmin: true }, SHARED));
  assert.equal(noAgency.adminOnly, true);
});

test('per-group premium override reprices only that group (perGroupPremium on)', () => {
  const groups = E.buildOrg('acute');
  groups[0].premium = 50;   // registered nurses, £6.5m agency spend
  const d = E.calc({ groups, ...SHARED, admin: ADMIN, recruit: { enabled: false }, fillRateNow: 8, perGroupPremium: true });
  const base = detailed('acute');
  // overridden group: spend x ds x displacement x p/(1+p) at 50%
  assert.ok(Math.abs(d.rows[0].saving - 6500000 * 0.80 * 0.13 * (0.50 / 1.50)) < 1e-6);
  // untouched groups keep the global 20% premium
  assert.ok(Math.abs(d.rows[1].saving - base.rows[1].saving) < 1e-9);
  // ...and the override is ignored while perGroupPremium is off
  const off = E.calc({ groups, ...SHARED, admin: ADMIN, recruit: { enabled: false }, fillRateNow: 8, perGroupPremium: false });
  assert.ok(Math.abs(off.totSaving - base.totSaving) < 1e-9);
});

test('negative net saving survives the engine for the UI noNet guard', () => {
  const d = detailed('ambulance', { platformCost: 200000 });   // fee > gross benefit
  assert.ok(d.netSaving < 0);
  assert.ok(d.roiPct < 0);
  assert.ok(d.paybackMonths > 12);   // gross still positive, so payback is finite but long
});

test('disabling admin removes its cash but keeps the time-saved co-headline', () => {
  const d = detailed('acute', { admin: { ...ADMIN, enabled: false } });
  assert.equal(d.adminSaving, 0);
  assert.equal(d.timeSavedWeek, 60);                       // 12 people x 1 h/day x 5 days
  assert.equal(Math.round(d.netSaving), 260000 - 17000);   // premium minus licence only
});

test('platformCostFor follows the G-Cloud licence bands (rounds a gap size UP to the covering tier; parity with kiosk)', () => {
  assert.equal(E.platformCostFor(300), 9486.54);
  assert.equal(E.platformCostFor(600), 9486.54);    // upper edge of band 1
  assert.equal(E.platformCostFor(660), 9855.27);
  assert.equal(E.platformCostFor(1000), 11321.21);
  assert.equal(E.platformCostFor(1500), 13280.66);  // upper edge of the 1,401–1,500 tier
  assert.equal(E.platformCostFor(1501), 15167.54);  // one over -> rounds up to the next tier
  assert.equal(E.platformCostFor(2000), 15167.54);  // covered by the 2,001–2,200 tier (kiosk default)
  assert.equal(E.platformCostFor(5000), 22793.38);  // above the 4,200 tier -> 5,001–5,200 tier
  assert.equal(E.platformCostFor(12000), 29101.79);  // top band caps large systems
});
