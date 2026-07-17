# Smart Match ROI Calculator — Full Audit

Date: 2026-06-24
Scope: web embed (`roi-calculator.html`, branch `main`) and touchscreen kiosk (`kiosk-app/`, branch `smartmatch-touchscreen`).
Method: two independent fresh-eyes engineering/product reviews plus a methodology review, cross-checked and numerically verified.

## Headline verdict

The core cash model is correct and unusually honest. The agency-premium formula is implemented correctly in both apps (verified numerically: Quick = £61,896 net; Detailed acute = £216,667 premium displaced), capacity is correctly kept out of cash, and the caveating is candid. Every serious issue is at the edges: defaults, guardrails, methodology framing, and a few real bugs, not the central maths.

Tags: [W] web only, [K] kiosk only, [B] both.

## Implementation status (updated 2026-06-24)

Worked through in priority order. Each fix was verified (offline browser render and/or engine reference tests) and deployed to both production branches (`main` = web, `smartmatch-touchscreen` = kiosk).

Done:
- P0: #1 PDF staff-group table (autotable + CDN-chain loader), #2 lead form (consent-gated, confirms only on real success), #3 scaleGroupsTo (largest-remainder, reversible, exact sums), #4 savings chart uses the edited platform cost.
- P1: #5 hero leads with net cash + payback (ROI% demoted to the secondary row), #6 honest result-basis caption, #7 engines aligned (provably identical per pound of agency spend; acute preset converged to the Quick 15%-fill view), #8 input clamping (incl. kiosk keypad #19), #11 web a11y labels (sliders, band select).
- P2: #12/#14 unreachable exceedsSpend supplemented by a reachable admin-only flag + note, #16 ROI shows n/a (not 0%) at zero platform cost, #17 iframe-resize effect dependency array, #18 manager count + admin toggle preserved across mode switch, #21 kiosk stat relabelled, #22 kiosk respects prefers-reduced-motion.
- P3: #25 small-print contrast raised to ~4.7:1 / WCAG AA (web), #26 C.rose defined, #27 displacement default aligned, #29 num() strips £/commas, #31 kiosk "Start over" disambiguated ("Change calculator" vs results "Start over") + PDF uses the current brand colours.
- Engine, resilience & UX (latest round): #9 golden-value + cross-engine parity tests on BOTH builds (`node --test`; web extracts the inline engine and pins it to the same numbers as the kiosk), so the two engine copies cannot drift silently; #10 React/ReactDOM/Babel now load via a cdnjs->jsDelivr->unpkg fallback chain (verified offline: with the primary CDN forced to fail, the app still falls back and boots); #11 kiosk a11y pass (BigChoice aria-pressed, ToggleRow role=switch + keyboard, Collapsible/StepIndicator role=button + aria-expanded/label + Enter/Space); #13 Quick results state the agency spend is derived from bank pool x fill rate and point to Detailed for an actual figure; #20 admin PIN reads VITE_ADMIN_PIN (build-time env), not committed source; #23 60s "Are you still there?" countdown before the 15-min idle reset.

Open - heavier options, deferred (not guessed):
- #9/#10 deeper: a single shared engine FILE and/or precompiling / self-hosting the web libraries would each need a build step for the deliberately build-less, single-file web app. The parity tests + CDN fallback chain cover the drift and network risks without one; raise this if you want the full build pipeline (and a same-origin ./vendor/ for fully air-gapped networks).
- #11 deeper: a full WCAG 2.1 AA audit / screen-reader pass across every kiosk surface (this round covered the interactive controls).
- Live check still owed: the web Detailed PDF staff-group table only renders when the autotable CDN plugin loads, which cannot be exercised in the offline sandbox - worth one click-test on the live site.

Verified by web research (2026-06-24):
- #24 citations fact-checked and confirmed accurate. AfC 2026/27 +3.3% confirmed (NHSPRB recommendation accepted 12 Feb 2026; effective 1 Apr 2026 for England/Wales/NI). Per-band pay constants match the official 2026/27 spine points: Band 5 £34,592 = exact Step 2 (of £32,073 / £34,592 / £39,043); Band 3 £26,618 = exact midpoint (£25,760-£27,476); Band 2 £25,272 = exact entry; Band 6 £42,170 within range (£37,338-£44,962). AFC_DIVISOR 1,957.5 = standard AfC full-time annual hours. The ~20% agency-over-bank premium is confirmed as a House of Commons Library figure, briefing CBP-10539 ("NHS workforce: Size, characteristics and staffing levels"), and the REC FOI shift-level contestation (bank often dearer per shift) is real and already hedged in the tooltips. No code change required - the figures are correct.
- Residual: the CBP-10539 PDF, NHS Employers and the pay-calculator sites all 403 to automated fetch in this sandbox, so the exact CBP-10539 page reference is asserted by search snippets but not PDF-confirmed. The £17k platform cost (vendor pricing) and 60 shifts/worker/yr (internal, deliberately conservative assumption) are not publicly checkable and were left unchanged.

Not actioned (low value / cosmetic): #15 stance-note wording, #28 fmt vs fmtK mix, #29 useId / band-pill / calibrating-overlay polish, #30 unused kiosk icons + InfoTip scroll-follow, #31 dead-code removal.

## P0 — Critical (fix before it is truly "live")

1. [W] Detailed PDF silently drops the staff-group table. `doc.autoTable()` is called but the autotable plugin is never loaded, so the finance-facing PDF is missing its core breakdown with no error. Fix: load jspdf-autotable (with CDN fallback).
2. [W] Lead form is fake-successful. Posts to `REPLACE_PORTAL_ID`/`REPLACE_FORM_GUID` (404), always shows "Thanks, we'll be in touch", captures nothing, and GDPR consent is unwired. Fix: real IDs (or graceful unconfigured state), only confirm on a successful POST, required consent checkbox, send consent field.
3. [B] `scaleGroupsTo` can permanently zero-collapse the staff mix. Dragging/typing the size headline low rounds small groups to 0, and 0 cannot recover when scaled back up; rounding also drifts so the sum does not equal the total you set. Kiosk is most exposed (sliders). Fix: distribute target across weights with largest-remainder rounding and a per-positive-group floor so groups never collapse and the sum is exact.
4. [K] Savings-over-time chart ignores the edited platform cost. It uses the hardcoded £17k constant while the headline net/ROI/payback use the user's value, so the chart and headline contradict each other on screen. Fix: thread `platformCost` through `calcDetailed` and the projection (the web already does this correctly).

## P1 — High (credibility, correctness, resilience)

5. [B] "ROI" denominator is the platform licence only. Detailed acute shows ~1,460% ROI / 0.8-month payback; the ratio excludes the cost to realise the saving (bank backfill, implementation), and the £17k default is the bottom of the cited £10.2k-£36k range. The only guard (>3000%) lets it pass. Fix: reframe headline as net cash, qualify ROI, and/or add a true cost-to-achieve denominator.
6. [B] Admin-time-as-cash is ON by default in the headline (~£48.6k at defaults), the softest input. Decision: default OFF (hours only), or split "hard cash (agency)" vs "incl. admin time".
7. [B] Quick vs Detailed disagree ~7x for the same trust (Quick derives agency spend from bank pool ~£1.4m; Detailed takes £10m directly). Fix: recalibrate Quick, or have Quick take agency spend directly.
8. [B] Inputs are not clamped. Typed out-of-range values flow into the maths (negative on-cost zeroes all savings; >100% fill; negative spend; kiosk keypad bypasses the slider max). Fix: one validated numeric component (clamp + paste-clean).
9. [B] Two separate copies of the calc engine (kiosk JS + web inline) that have already drifted. Fix: single shared source of truth plus reference tests.
10. [W] NHS-network fragility. React/Babel/jsPDF load from CDNs with no SRI, and ~3MB Babel compiles in-browser; if cdnjs is blocked the page is blank. Fix: pre-compile to plain JS, self-host or add SRI.
11. [B] Accessibility (PSBAR / WCAG 2.1 AA). Web: sliders lack programmatic labels, InfoTip is keyboard-fragile, small-print contrast borderline. Kiosk: near-zero a11y (div onClick, no aria/keyboard), lower priority for a touch kiosk but relevant to NHS procurement.

## P2 — Medium

12. [B] `exceedsSpend` guardrail is mathematically unreachable (max ratio ~0.22) and its advice cites a lever that does not affect detailed spend. Repurpose to a real sanity check.
13. [B] Quick model: a bigger bank pool mechanically increases derived agency spend and saving (pool used as a proxy for org size), counterintuitive to the product story.
14. [B] Quick shows positive "agency displacement" ROI from admin alone when agency inputs are 0.
15. [B] Stance is incoherent across the UI: slider 8-40, bins <=18/<=30, presets 13/26/35.
16. [B] platformCost = 0 shows ROI "0%" (should be n/a).
17. [W] iframe-resize effect has no dependency array (rebuilds observer + 800ms interval every render); postMessage uses "*" origin.
18. [W] Quick `numManagers` vs Detailed `admin.managers` are separate state; edits lost on mode switch.
19. [K] Keypad accepts values beyond the slider max, silently discarded on the next drag.
20. [K] Admin reset PIN ('2580') hardcoded in the client bundle.
21. [K] Admin "avg bank pool" stat mixes Quick bank-pool and Detailed total-headcount under one label.
22. [K] Two full-screen particle canvases, no prefers-reduced-motion, no pause under modals.
23. [K] 15-minute idle reset wipes an in-progress session with no warning; leaves a trust-specific model on a public screen.
24. [B] Several load-bearing citations need fact-checking (HoC CBP-10539, REC FOI dates, AfC 2026/27 "+3.3% confirmed", 60 shifts/worker, £17k platform).
25. [B] Contrast/tiny muted text on the mandatory caveat copy borderline vs AA.

## P3 — Low / cleanup

26. [W] `C.rose` undefined, negative-year label colour lost (one-liner).
27. [B] Default displacement mismatch: `DEFAULTS=13` vs `calc()` param default `10` (latent; align).
28. [B] `fmt` vs `fmtK` mixed on one screen (£216,667 next to £1.40m).
29. [W] Field `id` from label can collide (use `useId`). [W] `num()` does not strip £/commas (pasted "£1,400,000" discarded). [W] band pill can disagree with custom pay. [W] 1.6s "Calibrating" overlay is cosmetic.
30. [K] ~20 unused US-healthcare icons shipped. [K] InfoTip does not follow scroll on the tall results page.
31. [B] "Start over" appears twice with different destinations. [B] dead code (per-group displacement branch, unused `SegmentedControl`, unreachable fill-rate guards). [W] PDF header uses the old navy, not the current brand. [B] no engine unit tests.

## Opportunities

- Show a Conservative/Pilot/Optimistic sensitivity band instead of one stance.
- Surface the Quick-derived agency spend (currently invisible).
- True net-benefit option (add implementation + incremental backfill to a defensible ROI).
- URL/QR state so a result is shareable and a kiosk visitor can take it away (email/QR).
- One shared engine module + Vitest reference tests + a centralised pay-year constant.

## What is correct / good

- The cash formula is implemented consistently and correctly in both engines; capacity is kept out of cash with no double-counting.
- `num()` guards prevent most NaN/Infinity in the detailed model; ROI/payback divide-by-zero is guarded.
- localStorage stats handle corrupt data defensively.
- The honesty framing, capacity-vs-cash separation, and "indicative" labelling are genuinely well done for a sales tool.

## Recommended first pass

P0 #1-#4, then methodology #5 and #6 and input clamping #8. That removes the genuinely misleading/broken behaviours and settles the two methodology calls a finance reviewer will attack first.
