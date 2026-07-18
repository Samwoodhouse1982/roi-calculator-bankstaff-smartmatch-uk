# Audit follow-ups — parked for review

Open items from the July 2026 full audit (methodology, reliability, evidence,
UI, accessibility). Fixes 1–10 from that audit are done (commit `767b4e9`).
Nothing below is committed-to; each needs a review decision first.

## Methodology disclosures — DONE (content review pass, July 2026)

- [x] **VAT / commission basis of the premium.** Now disclosed in the
  Assumptions panel ("Premium basis & bank-rate caveat") and the PDF
  ("Basis notes").
- [x] **No bank-rate escalation.** Same rows as above.
- [x] **Bank-spend cap counterargument.** Assumptions panel row
  "Bank spend is also capped".

## Accessibility cluster — DONE (July 2026)

- [x] Unlock focus + announcements: on each new unlock, focus moves to the
  revealed section's heading (or the Calculate button) and an always-mounted
  polite live region announces it.
- [x] `aria-pressed` on stance and org-preset buttons.
- [x] Results announced via the app-level live region when `calculated` flips
  (the inline pre-populated `role="status"` node removed).
- [x] InfoTip accessible name is now "More info about {label}"; body stays in
  `aria-describedby` when open.
- [x] SliderField ranges carry `aria-valuetext` with the formatted value.
- [x] Remove-group button: `aria-label="Remove this staff group"`.
- [x] "Annual agency spend" heading no longer labels the checkbox.

## Diagnostics & small correctness — DONE (July 2026)

- [x] "Admin time only" callout now names the actual zero factor (spend,
  premium, or displaceable share).
- [x] noNet copy compares the modelled **benefit** (premium + included levers)
  and special-cases the zero-benefit / zero-licence state, on screen and in
  the PDF/summary strings.
- [x] Capacity panel shows "8% → 6.6%" (whole number vs one decimal) — fixed:
  one decimal both sides, matching the PDF.
- [x] PDF worked-out equation rounds each term first (netR construction),
  matching the on-screen version.
- [x] zeroPay now replaces the per-shift identity sentence with a caveat (and
  the capacity worked example already hid itself).
- [x] `pcAuto` effect skips the "choose" screen.
- [x] The calibrating timeout drops the pending calculation if the user
  navigated away mid-pause.
- [x] `SliderField.commit` stores the round-tripped display value and clamps
  percent fields to 100 (£/count fields stay uncapped by design).

## Copy / config drift

- [ ] README licence-cost range says "~£10k–£20k"; the G-Cloud table spans
  £9,486.54–£29,101.79 — update to "~£9.5k–£29k".
- [ ] embed-snippet says point at `/roi-calculator.html` "to avoid a
  redirect", but `cleanUrls: true` makes exactly that URL 308-redirect —
  point the snippet at `/roi-calculator` instead.
- [ ] Band 2/3 pay £25,900 isn't the midpoint of the quoted Band 2 (£25,272)
  and Band 3 (£26,618) figures (£25,945) — confirm intent or align.
- [ ] "Update results →" implies stale results, but results update live — it's
  really a scroll-to-results affordance; consider relabelling.
- [ ] `exceedsSpend` guardrail is mathematically unreachable from the UI
  (identity caps the saving at ~30% of spend) — README oversells it as an
  active check; reword as structural.
- [ ] Dead `C.rose` colour constant; stale "no wizard" code comment in the
  Quick section.
- [ ] Reliability: no automated JSX-parse check — the engine tests exercise
  only the pure-JS block, so a JSX syntax error would ship silently. Consider
  a CI step or devDependency-based parse test (repo is otherwise no-deps).
- [ ] Threshold parity: the `implausibleRoi` 100× change (fix 3) applies to
  this product only; the kiosk/web engines keep 40× (their defaults are
  Conservative, where 40× holds). Decide whether to harmonise.
