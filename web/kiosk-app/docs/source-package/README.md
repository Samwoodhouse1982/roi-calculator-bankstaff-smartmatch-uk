# Smart Match (BankStaff+): Workforce ROI Calculator

The public, self-serve web version of the RLDatix **Smart Match** bank-staff
utilisation ROI calculator. NHS terminology (bank/agency, AfC, Trust), pounds
sterling, `en-GB` formatting.

> **Replacing a version that is already live?** Read `WHAT-CHANGED.md` first.
> It is one step.

Three ways to use it, all in this package:

| You want to | Use |
|---|---|
| Embed it in a page (WordPress, CMS, landing page) | `roi-calculator.html` + `embed-snippet.html` |
| Embed it with nothing to upload | `embed-snippet-srcdoc.html` on its own |
| Load it into a page you already control | `roi-calculator.js` + `styles.css` |

All three are generated from the same source, so the figures are identical.

## Quick start

### Standalone / iframe

1. Upload `roi-calculator.html` anywhere static, over HTTPS. It is fully
   self-contained: no build step, no bundler, no server code.
2. Paste the snippet from `embed-snippet.html` into your page and point the
   iframe `src` at the file from step 1.

### Inline, with nothing to upload

Paste the whole of `embed-snippet-srcdoc.html` into a Custom HTML block. It
carries the calculator inside it as a base64 string, so there is no file to
host and nothing to configure. To take a new version, replace the whole
snippet; never hand-edit the `DATA` string. `INTEGRATION-GUIDE.md` section 5
compares the two routes.

### Into a page you already control

If you would rather not use an iframe at all, include the script and the
styles yourself and mount it into any element:

```html
<link rel="stylesheet" href="styles.css">
<div id="roi"></div>
<script src="roi-calculator.js"></script>
<script>SmartMatchROI.mount(document.getElementById("roi"));</script>
```

`roi-calculator.js` defines exactly one global, `SmartMatchROI`, with one
method, `mount(element)`. It adds nothing else to the page and takes nothing
from it.

Note that this is the one option with no isolation: the calculator's markup
sits in your document, so your stylesheet can reach it. All of its own styling
is inline for that reason, but a broad reset in your CSS can still affect it.
The iframe options above cannot be touched by the host page.

## Architecture

**Plain JavaScript. No framework, no JSX, no build step, and no dependency to
install.** The only external thing it ever loads is jsPDF, from a CDN, and only
at the moment a visitor presses Download.

All logic lives in `roi-calculator.js`, assembled from these sections in order:

| Section | Description |
|---|---|
| **Model constants** (top) | `AFC_DIVISOR`, `BANK_ONCOST`, `LICENCE_BANDS`, `AGENCY_SPEND_PER_REGISTERED_BANK_WORKER_GBP`, `DISPLACEABLE_SHARE_DEFAULT`, admin-time defaults. Every tuneable assumption is a named constant. |
| **`stance()`** | The three confidence levels (Conservative 13% / Moderate 26% / Optimistic 50%) and the note shown beside the slider. Wording is computed from the live value, never hard-coded. |
| **`calc()`** | Pure function. Takes the inputs, returns every derived value. No side effects, no DOM. This is the whole financial model. |
| **`calcDetailed()`, `ORG_TYPES`, `buildOrg()`** | The per-staff-group model used by the internal account-manager build. Not rendered by this UI; kept so both products share one engine. |
| **Lead core** | HubSpot configuration and submission, the PDF report, the local backup. Shared file, see below. |
| **Theme** | `C` (colours), `F` (fluid type scale), `£` formatters, step labels. |
| **Data layer** | `buildData()` / `publishData()`. See `DATA-LAYER-REFERENCE.md`. |
| **`h()`** | A 40-line stand-in for the one thing a framework was doing here: turning a tag, some properties and some children into a DOM node. There is no virtual DOM and no reconciliation. |
| **Helper components** | `Card`, `TouchSlider`, `Stepper`, `InfoTip`, `DecisionRow`, `StepIndicator`, `NavButtons`, `Icon`. Each is a function returning a DOM node. |
| **Steps** | `BankStep`, `AgencyStep`, `TeamStep`, `StanceStep`: the four input pages. |
| **`ResultsPage`** | Co-headline figures, KPI row, live confidence slider, capacity panel, methodology and assumptions. |
| **`LeadCapture`** | Results-page form: HubSpot submission, PDF download, local browser backup. |
| **`generatePDF()`** | Builds a branded one-page A4 report with jsPDF and downloads it directly. No popup, no print dialog, no server. |
| **`mount()`** | The entry point, exposed as `SmartMatchROI.mount`. Owns state, step routing, the calculating pause, and the iframe (postMessage) plumbing. |

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
| **Hard cash** (agency premium displaced) | **Yes** |
| **Admin time** (scheduling hours released) | Optional, visitor decides; shown either way |
| **Capacity** (extra shifts filled from bank) | **Never**, shown in its own panel |

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
If you mount the script into your own page and would rather not call Google
Fonts, load DM Sans yourself or leave it out: the calculator falls back to
`system-ui`, `Segoe UI` and Roboto and still reads correctly.

## Styles

`styles.css` carries only what cannot be set inline: the box-sizing reset,
page background and font stack, range-slider thumbs and scrollbars, plus a
`prefers-reduced-motion` block. It is already inlined into
`roi-calculator.html`, so you only need this file if you are mounting the
script into your own page.

Everything else is set inline on the elements themselves, so the calculator
does not leak styles into a host page.

## Accessibility

- Every control has a real accessible name, including the icon-only ones.
- Sliders carry `aria-valuetext`, so a screen reader reads "2,000 workers" or
  "26% (Moderate)" rather than the raw number behind them.
- Focus moves to the new screen on every step change, so a keyboard or screen
  reader user is not left on a control that no longer exists.
- A polite live region announces the headline figures when results appear,
  which is the one moment the page changes without the visitor acting.
- Selection state is exposed with `aria-checked` on the Yes/No decisions and
  the toggle; the tooltip and the methodology panel expose `aria-expanded` and
  work from the keyboard.
- `prefers-reduced-motion` is respected: the same figures, without the
  count-ups and transitions.

## Evidence and honesty rules

Figures are indicative and deliberately conservative in their rate
assumptions; the confidence level is the visitor's choice and is labelled on
screen and in the PDF. Sources for every assumption (2026/27 AfC pay, the ~20%
agency premium from House of Commons Library research, the 80% displaceable
share, the pilot-study figures behind the stances) are listed in the
calculator's own methodology panel, which the results page renders in full.
Capacity is never added to the cash saving anywhere in the product.

## Regenerating this package

These files are generated from the maintained source app so the tested engine
and the shipped calculator can never drift apart. The calculation engine, the
theme, the data layer and the whole of the lead-capture core (HubSpot
configuration, submission and the PDF report) are shared files, used verbatim
by this build and by the internal React build of the same calculator, so the
two cannot produce different figures or send different submissions:

```bash
npm install
npm run package:source
```
