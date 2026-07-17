# Smart Match — Workforce ROI Calculator (UK web embed)

The **UK web-embed** version of the RLDatix **Smart Match** bank-staff utilisation
ROI calculator. NHS terminology (bank/agency, AfC, Trust), pounds sterling,
`en-GB` formatting. RLDatix corporate brand (navy + teal), built in the same
design system as the Galen ROI calculator suite.

> This branch (`rld-smartmatch-web-from-kiosk`) holds the **web version built
> from the kiosk**: the touchscreen build's exact flow and methodology
> (`kiosk-app/`), made responsive and iframe-embeddable for the WordPress
> site, with the Galen/EPR calculator's lead capture form ported in. The
> original single-file web embed lives on [`main`](../../tree/main); the
> touchscreen build lives on
> [`smartmatch-touchscreen`](../../tree/smartmatch-touchscreen). See
> `kiosk-app/README.md` for build + packaging.

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
displaced_shifts  = (annual_agency_spend / agency_shift_cost) × displacement
CASH SAVING       = displaced_shifts × bank_shift_cost × agency_premium
                  ≡ annual_agency_spend × displacement × premium/(1+premium)
```

The cash saving is anchored to the trust's **agency spend**, premium and
displacement — **not** bank payroll. (v8's error was counting `bank payroll ×
17%` as a saving and double-counting the same shifts, which inflated the headline
~5× and produced a 24,768% ROI.)

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

1. **Platform cost** used as the ROI denominator — confirm the figure (~£17k) and
   whether it includes implementation, not licence alone.
2. **Displacement and admin defaults** — health-economist validation before
   publication.
3. **Pilot data** — confirm permission to cite the specific pilot figures/trusts.
4. **AfC figures** — refresh from the NHS Employers pay-scale PDF annually
   (currently 2025/26 England midpoints).
5. **HubSpot** — confirm the SmartMatch portal ID, form GUID and GDPR consent
   copy (the integration is scaffolded with placeholders; v1 is open-access and
   does not gate results or the PDF).

## Localisation

Currently UK (`en-GB`, `£`). AU-ready: the `LOCALE`/`SYMBOL` constants and the
formatter helpers are isolated near the top of the script for a future AU
variant.
