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

## Copy / config drift — DONE (July 2026)

- [x] README licence-cost range corrected to ~£9.5k–£29k.
- [x] embed-snippet (and the README embedding note) now point at
  `/roi-calculator` — the extensionless path serves directly; `cleanUrls`
  308-redirects the `.html` form.
- [x] Band 2/3 pay aligned to £25,945, the midpoint of the quoted Band 2
  (£25,272) and Band 3 (£26,618) figures. Cash goldens are pay-independent so
  tests are unaffected. **Cross-product note:** the kiosk/web engines still
  carry £25,900 — mirror there on the next methodology sweep.
- [x] "Update results →" relabelled "See updated results →" (results update
  live; the button is a scroll affordance).
- [x] README guardrails paragraph rewords `exceedsSpend` as structural (the
  identity caps the saving) and states the 100× input-error flag.
- [x] Dead `C.rose` constant removed; stale "no wizard" comment updated.
- [x] `test/jsx-parse.test.mjs` added: transforms the whole `text/babel`
  block with pinned Babel (CDN / `$BABEL_STANDALONE_PATH` / optional
  `test/vendor` copy; skips offline) and syntax-checks the output. Verified
  it catches an injected JSX error.
- [x] Threshold parity — DECIDED: keep per-product. 100× here (Moderate
  default makes stock presets reach ~45×); kiosk/web keep 40× (Conservative
  defaults, where 40× still holds). Revisit only if their defaults change.
