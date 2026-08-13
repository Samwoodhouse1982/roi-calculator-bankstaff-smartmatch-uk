# Smart Match (BankStaff+) — Workforce ROI Calculator

The public, self-serve web version of the RLDatix **Smart Match** bank-staff
utilisation ROI calculator. NHS terminology (bank/agency, AfC, Trust), pounds
sterling, `en-GB` formatting.

Two ways to use it, both in this package:

| You want to | Use |
|---|---|
| Embed it in a page (WordPress, CMS, landing page) | `roi-calculator.html` + `embed-snippet.html` |
| Render it inside an existing React app | `ROICalculator.jsx` + `styles.css` |

Both are generated from the same source, so the figures are identical.

## Quick start

### Standalone / iframe

1. Upload `roi-calculator.html` anywhere static, over HTTPS. It is fully
   self-contained: no build step, no bundler, no server code.
2. Paste the snippet from `embed-snippet.html` into your page and point the
   iframe `src` at the file from step 1.

### Inside a React app

```jsx
import ROICalculator from "./ROICalculator";
import "./styles.css";

export default function Page() {
  return <ROICalculator />;
}
```

Requires **React 18+**. The only other dependency is **jsPDF**, loaded on
demand when a visitor downloads their report:

```bash
npm install jspdf
```

If you would rather not add jsPDF to your bundle, the standalone file loads it
from a CDN instead; see `INTEGRATION-GUIDE.md`.

## Architecture

Single-component app. All logic lives in `ROICalculator.jsx`, assembled from
these sections in order:

| Section | Description |
|---|---|
| **Model constants** (top) | `AFC_DIVISOR`, `BANK_ONCOST`, `GCLOUD_LICENCE`, `AGENCY_SPEND_PER_REGISTERED_BANK_WORKER_GBP`, `DISPLACEABLE_SHARE_DEFAULT`, admin-time defaults. Every tuneable assumption is a named constant. |
| **`stance()`** | The three confidence levels (Conservative 13% / Moderate 26% / Optimistic 50%) and the note shown beside the slider. Wording is computed from the live value, never hard-coded. |
| **`calc()`** | Pure function. Takes the inputs, returns every derived value. No side effects, no DOM. This is the whole financial model. |
| **`calcDetailed()`, `ORG_TYPES`, `buildOrg()`** | The per-staff-group model used by the internal account-manager build. Not rendered by this UI; kept so both products share one engine. |
| **Theme** | `C` (colours), `F` (fluid type scale), `£` formatters, step labels. |
| **Data layer** | `buildData()` / `publishData()` — see `DATA-LAYER-REFERENCE.md`. |
| **Helper components** | `Card`, `TouchSlider`, `Stepper`, `InfoTip`, `DecisionRow`, `StepIndicator`, `NavButtons`, `PageTransition`, `Icon`. |
| **Steps** | `BankStep`, `AgencyStep`, `TeamStep`, `StanceStep` — the four input pages. |
| **`ResultsPage`** | Co-headline figures, KPI row, live confidence slider, capacity panel, methodology and assumptions. |
| **`LeadCapture`** | Results-page form: HubSpot submission, PDF download, local browser backup. |
| **`generatePDF()`** | Builds a branded one-page A4 report with jsPDF and downloads it directly. No popup, no print dialog, no server. |
| **`ROICalculator`** | Default export. Owns state, step routing, the calculating pause, and the iframe (postMessage) plumbing. |

## The value model

> **Better bank utilisation is the mechanism; the money is the agency premium
> avoided.** Filling a bank shift is *expenditure*. A trust only saves when a
> shift that would have gone to *agency* is covered by *bank* instead, and the
> saving is the **difference** (the premium), not the whole shift.

```
bank_shift_cost   = (annual_pay / 1957.5) x shift_hours x (1 + on_cost)
agency_shift_cost = bank_shift_cost x (1 + premium)
CASH SAVING       = agency_spend x displaceable_share x displacement x premium/(1+premium)
```

Three categories are kept strictly separate, and the UI says so:

| Category | In the headline saving? |
|---|---|
| **Hard cash** — agency premium displaced | **Yes** |
| **Admin time** — scheduling hours released | Optional, visitor decides; shown either way |
| **Capacity** — extra shifts filled from bank | **Never** — shown in its own panel |

Confidence defaults to **Moderate (26%)**, applied to the **80% displaceable
share** of agency spend (so ~21% of the whole agency book). Pay rates are
2026/27 NHS Agenda for Change midpoints.

## Colours

Defined in the `C` constant:

| Role | Hex |
|---|---|
| Deep teal (primary) | `#0F4146` |
| Teal mid (accent) | `#1A8A7A` |
| Seafoam (highlight) | `#34DEC2` |
| Pale green (page wash) | `#EEF7F2` |
| Surface / cards | `#FFFFFF` |
| Border | `#D4E0DD` |

## Fonts

**DM Sans** throughout. The standalone file loads it from Google Fonts with a
system-font fallback (`system-ui`, `Segoe UI`, Roboto) if that host is blocked.
In a React app, either load DM Sans yourself or install the self-hosted
package, which needs no external request:

```bash
npm install @fontsource-variable/dm-sans
```
```js
import "@fontsource-variable/dm-sans";
```

## Styles

`styles.css` carries only what the component cannot set inline: the
box-sizing reset, page background and font stack, range-slider thumbs and
scrollbars, plus a `prefers-reduced-motion` block. Everything else is inline
in the component, so a host page's stylesheet cannot break the calculator and
the calculator cannot leak styles into the host page.

## Accessibility

Keyboard and screen-reader support are built in: focus moves to each newly
revealed step, a polite live region announces results, selection state is
exposed with `aria-pressed` / `aria-checked`, sliders carry `aria-valuetext`
with formatted values, and every control has a real accessible name.

## Evidence and honesty rules

Figures are indicative and deliberately conservative in their rate
assumptions; the confidence level is the visitor's choice and is labelled on
screen and in the PDF. Sources for every assumption (2026/27 AfC pay, the ~20%
agency premium from House of Commons Library research, the 80% displaceable
share, the pilot-study figures behind the stances) are listed in the
calculator's own methodology panel, which the results page renders in full.
Capacity is never added to the cash saving anywhere in the product.

## Regenerating this package

These files are generated from the maintained Vite source app so the tested
engine and the shipped calculator can never drift apart:

```bash
npm install
npm run package:source
```
