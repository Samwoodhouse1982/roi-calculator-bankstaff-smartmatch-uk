# Smart Match ROI Calculator — Full Audit

Date: 2026-06-24
Scope: web embed (`roi-calculator.html`, branch `main`) and touchscreen kiosk (`kiosk-app/`, branch `smartmatch-touchscreen`).
Method: two independent fresh-eyes engineering/product reviews plus a methodology review, cross-checked and numerically verified.

## Headline verdict

The core cash model is correct and unusually honest. The agency-premium formula is implemented correctly in both apps (verified numerically: Quick = £61,896 net; Detailed acute = £216,667 premium displaced), capacity is correctly kept out of cash, and the caveating is candid. Every serious issue is at the edges: defaults, guardrails, methodology framing, and a few real bugs, not the central maths.

Tags: [W] web only, [K] kiosk only, [B] both.

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
