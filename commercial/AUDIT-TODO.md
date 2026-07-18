# Audit follow-ups — parked for review

Open items from the July 2026 full audit (methodology, reliability, evidence,
UI, accessibility). Fixes 1–10 from that audit are done (commit `767b4e9`).
Nothing below is committed-to; each needs a review decision first.

## Methodology disclosures (one honest line each, Assumptions panel + PDF)

- [ ] **VAT / commission basis of the premium.** The saving applies
  `premium/(1+premium)` to invoiced agency spend (commission and often
  unrecoverable VAT included); whether the 20% premium is measured on that
  same basis is never stated. The licence is flagged "ex VAT"; the numerator
  basis isn't.
- [ ] **No bank-rate escalation.** The model holds the AfC-midpoint bank rate
  fixed as volume moves to bank; hard-to-fill shifts often need enhanced bank
  rates, shrinking the realised premium. Say so.
- [ ] **Bank-spend cap counterargument.** The Medium Term Planning Framework
  that mandates the agency cuts also caps bank spend (−7.5–15% over three
  years). One line noting that displacing the premium cuts *total* temporary
  staffing spend would pre-empt the obvious FD rebuttal to "move it to bank".

## Accessibility cluster

- [ ] Unlock buttons ("These numbers look right →" etc.) unmount on click —
  keyboard/SR focus drops to `<body>`; locked sections are `inert` so SR users
  can't perceive them, and nothing announces an unlock. Keep the button
  mounted, or move focus to the revealed section's heading + live-region note.
- [ ] Stance buttons and org-preset buttons expose no selected state — add
  `aria-pressed` (the Yes/No radiogroups already do this correctly).
- [ ] Results `role="status"` live region mounts already populated, so many
  screen readers never announce it — keep an always-mounted empty node and set
  its text when `calculated` flips.
- [ ] InfoTip `aria-label` embeds the entire tooltip paragraph (80+ words) —
  use "More info about {label}" and keep the body in `aria-describedby`.
- [ ] £ sliders announce raw numbers ("1782000") — add `aria-valuetext` with
  the formatted value (the confidence slider already does this).
- [ ] Remove-group button's accessible name is "×" ("multiplication sign") —
  add `aria-label="Remove this staff group"`.
- [ ] Quick's "Annual agency spend" heading is a `<label for="spendKnown">`,
  garbling the checkbox's accessible name — make it a non-label span.

## Diagnostics & small correctness

- [ ] "Admin time only" callout says "agency spend is zero" even when the real
  cause is premium = 0 or displaceable share = 0 — branch the message.
- [ ] All-zero state renders "the £0 premium you'd displace is below the
  £0/yr licence" (and the PDF equivalent) — special-case zero-vs-zero; also
  the noNet copy says "premium" when admin is included in the comparison.
- [ ] Capacity panel shows "8% → 6.6%" (whole number vs one decimal) — use one
  decimal on both sides (the PDF already does).
- [ ] PDF worked-out equation can be £1 off — round each term first, as the
  on-screen version already does (`netR` construction).
- [ ] With a zero-pay group the "£x/hr × N shifts = £gross" sentence no longer
  multiplies out — suppress or caveat it when `zeroPay`.
- [ ] `pcAuto` effect runs on the "choose" screen using Detailed's groups —
  first paint after re-entering Quick can briefly show the wrong licence fee.
  Guard with `if(mode==="choose") return;`.
- [ ] Keyboard users can navigate away during the 1.6s "Calibrating" overlay,
  leaving a phantom `calculated` state — guard the timeout or disable nav
  while calibrating.
- [ ] `SliderField.commit` stores the unrounded value but displays the rounded
  one (type 8.35 → shows 8.4, models 8.35), and `commit` never clamps to max —
  fine for £ (intended) but lets a 300% fill rate through.

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
