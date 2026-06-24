# Smart Match — Workforce ROI Calculator (UK web embed)

The **UK web-embed** version of the RLDatix **Smart Match** bank-staff utilisation
ROI calculator. NHS terminology (bank/agency, AfC, Trust), pounds sterling,
`en-GB` formatting. RLDatix corporate brand (navy + teal), built in the same
design system as the Galen ROI calculator suite.

> This branch (`main`) holds the **single-file HTML web embed**. The
> **touchscreen / kiosk** version (Vite + React, 1080×1920) lives on the
> [`smartmatch-touchscreen`](../../tree/smartmatch-touchscreen) branch.

## What's the calculator?

**`roi-calculator.html`** is the entire application — a self-contained single
file (React 18 + Babel loaded from CDN, all styles inline, no build step). Open
it in a browser and it runs. This is the only file you edit to change the
calculator.

## The value model (v9 — corrected)

This calculator rebuilds a v8 prototype that contained a **structural costing
error**. The headline principle:

> **Better bank utilisation is the mechanism; the money is the agency premium
> avoided.** Filling a bank shift is *expenditure* — a trust only saves when a
> shift that would have gone to *agency* is covered by *bank* instead, and the
> saving is the **difference** (the premium), not the whole shift.

Three categories are kept strictly separate:

| Category | What | In the saving total / ROI? |
|---|---|---|
| **A. Hard cash** | Agency premium displaced (+ optional substantiated admin) | **Yes** — the headline |
| **B. Admin (modelled)** | Scheduling time released; off by default | Optional, shown separately |
| **C. Capacity (non-cash)** | Additional shifts filled / agency reliance reduced | **Never** — shown in its own panel |

Core formulas (all assumptions conservative and editable):

```
bank_hourly       = annual_pay / 1957.5                  # NHS AfC divisor
bank_shift_cost   = bank_hourly × shift_hours × (1 + bank_oncost)
agency_shift_cost = bank_shift_cost × (1 + agency_premium)
displaceable_spend = annual_agency_spend × displaceable_share   # benchmark §4: default 80%
displaced_shifts  = (displaceable_spend / agency_shift_cost) × displacement
CASH SAVING       = displaced_shifts × bank_shift_cost × agency_premium
                  ≡ annual_agency_spend × displaceable_share × displacement × premium/(1+premium)
```

The cash saving is anchored to the trust's **agency spend**, premium and
displacement — **not** bank payroll. (v8's error was counting `bank payroll ×
17%` as a saving and double-counting the same shifts, which inflated the headline
~5× and produced a 24,768% ROI.)

**Agency-spend benchmark (latest research).** Org-type templates use benchmark-backed
agency spend and bank size (acute DGH ~£15m / ~2,200 bank, mental health ~£10m / ~1,000,
community ~£7m / ~700, ambulance ~£4m / ~400, ICS ~£30m / ~5,000) — labelled *typical,
edit to your trust*; HCA agency is kept low (largely restricted at Band 2–3). Displacement
applies only to the **displaceable share** (default **80%**, editable) — break-glass and
hard-to-fill specialist agency can't realistically move to bank. An optional **annual
turnover** input sets *agency intensity* (agency % of turnover) and tailors the headline:
**< 1%** mature / low-agency (lead with admin time, fill-rate and bank-rate control),
**1–4%** typical (lead with the cash premium), **> 4%** high reliance (rate arbitrage
dominates). Treat agency spend as a current, **declining** figure and prefer the trust's own.

**Guardrails:** the cash saving can never exceed total agency spend; the tool
leads with **net annual saving + payback months** (not a giant ROI %) and flags
implausibly high ROI.

## Files

| File | Purpose |
|------|---------|
| `roi-calculator.html` | **The calculator.** Self-contained; edit this. |
| `index.html` | Redirect to `roi-calculator.html`. |
| `vercel.json` | Deploy routing + cache headers. |
| `embed-snippet.html` | Reference snippet for embedding via iframe (auto-resizes via `postMessage`). |
| `README.md` | This file. |

## How it deploys (Vercel)

| URL | Serves |
|-----|--------|
| `/` | `index.html` → redirects to `roi-calculator.html` |
| `/uk`, `/calc`, `/calculator`, `/roi-calculator` | rewritten to `roi-calculator.html` |
| `/roi-calculator.html` | served directly |

Static hosting only — no build step.

## Embedding

Use `embed-snippet.html` as the host-page reference. The iframe auto-resizes via
`postMessage` (`type: "smartmatch-roi-resize"`). Point `src` at
`/roi-calculator.html` (not `/`, which redirects) and serve over HTTPS.

## Editing notes

- All tuneable assumptions are named constants near the top of the
  `<script type="text/babel">` block (`AFC_DIVISOR`, `BANK_ONCOST_DEFAULT`,
  `PLATFORM_COST_DEFAULT`, `STAFF_GROUPS`, `PRESETS`, `stance()`).
- The pure `calc(input)` function takes inputs and returns all derived values —
  no DOM side-effects (so the same engine can back the kiosk version).
- Babel is **pinned to 7.26.4** which uses the *classic* JSX runtime
  (`React.createElement`). Do not switch to a Babel build that defaults to the
  *automatic* runtime, or the in-browser transform will emit `import` statements
  and fail.
- After editing, sanity-check the JSX parses before pushing (e.g. transform the
  `text/babel` block with `@babel/standalone` using `presets:[["react",
  {runtime:"classic"}]]`).
- Evidence framing stays honest: the Smart Match pilot is a small (n=3),
  vendor-collected sample presented as **indicative**; the 17%/26% figures are
  engagement/fill measures and are **not** multiplied into the saving.

## Open items to confirm (from the research brief)

1. **Platform cost** used as the ROI denominator — now **scales with organisation
   size** (~£10k–£20k by bank headcount via `platformCostFor`, fully editable);
   confirm the banding and that it includes implementation, not licence alone.
2. **Displacement and admin defaults** — health-economist validation before
   publication.
3. **Pilot data** — confirm permission to cite the specific pilot figures/trusts.
4. **AfC figures** — refresh from the NHS Employers pay-scale PDF annually
   (currently 2026/27 England midpoints, +3.3% from 1 Apr 2026).
5. **HubSpot** — confirm the SmartMatch portal ID, form GUID and GDPR consent
   copy (the integration is scaffolded with placeholders; v1 is open-access and
   does not gate results or the PDF).

## Localisation

Currently UK (`en-GB`, `£`). AU-ready: the `LOCALE`/`SYMBOL` constants and the
formatter helpers are isolated near the top of the script for a future AU
variant.
