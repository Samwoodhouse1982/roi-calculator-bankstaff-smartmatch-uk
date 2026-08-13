# Smart Match ROI Calculator — Integration Setup Guide

## Overview

The calculator runs entirely in the visitor's browser. There is no server
code, no database and no build step. It has **one** outbound integration
(HubSpot lead capture), and it is optional: if the config values are blank the
calculator still works and still gives the visitor their PDF.

---

## 1. HubSpot Lead Capture (pre-configured)

**Status: LIVE** — HubSpot is already wired in and ready to use.

**What it does:** when a visitor submits the results-page form, their details
are POSTed to HubSpot's Forms API (EU1 region) as a new submission, and their
PDF report downloads.

### Current configuration

Near the top of the lead-capture section in `ROICalculator.jsx` (or in the
`<script type="text/babel">` block of `roi-calculator.html`):

```javascript
const HUBSPOT_PORTAL_ID = "27174408";
const HUBSPOT_FORM_GUID = "3f860858-5a58-4f1b-8419-a561af17adbe";
const HUBSPOT_REGION    = "eu1";   // EU data centre
```

**API endpoint:**
`https://forms-eu1.hsforms.com/submissions/v3/integration/submit/{portalId}/{formGuid}`

> **Note on the form GUID.** This is currently an **interim, shared** form,
> also used by another RLDatix calculator. Smart Match submissions are
> identifiable by the `message` field, which always begins
> `Smart Match ROI (web) submission | ...`. When a dedicated Smart Match form
> exists, replace `HUBSPOT_FORM_GUID` with its GUID — nothing else changes.

### Fields submitted

| HubSpot field | Source |
|---|---|
| `firstname` | First word of the name input |
| `lastname` | Remainder of the name input |
| `email` | Email input |
| `company` | Organisation input |
| `jobtitle` | Role dropdown |
| `message` | Calculator context: bank workers, agency fill rate, team size, confidence level and stance, net annual saving, hours released per week, estimated agency spend |

The `message` field gives the sales team full visibility of what the visitor
modelled, without needing custom HubSpot properties.

### How it works

No HubSpot form SDK is loaded. The calculator POSTs directly to the Forms API
v3, which is lighter than the `hbspt.forms.create()` widget and preserves the
calculator's own styling. **No HubSpot tracking script, cookies or pixels are
used** — it is a single request, made only when a visitor presses submit.

The submission is fire-and-forget: if HubSpot is unreachable (blocked network,
CSP, ad-blocker), the visitor still gets their PDF and the lead is kept in the
local browser backup below. Errors go to `console.warn` only.

### Optional: custom HubSpot properties

To capture calculator values as structured fields rather than free text,
create custom contact properties and add them to the `fields` array in
`submitLead`:

```javascript
{ name: "roi_bank_workers",   value: String(leadContext.bankPool) },
{ name: "roi_confidence",     value: String(leadContext.displacement) },
{ name: "roi_annual_saving",  value: String(Math.round(r.netSaving)) },
{ name: "roi_hours_week",     value: String(Math.round(r.timeSavedWeek)) },
```

Everything available to send is listed in `DATA-LAYER-REFERENCE.md`.

---

## 2. Local lead backup

Every submission is also written to the visitor's own browser
(`localStorage`, key `smartmatch-roi-web-submissions`, capped at 200 records)
as a resilience backup, so a lead is not lost if HubSpot was unreachable at
that moment.

Append `#admin-leads` to the calculator URL to review the records saved **in
that browser**. This is per-device and per-browser: it is a fallback for
demos and events, not a CRM.

---

## 3. PDF report

The "Download PDF report" button builds a branded one-page A4 report with
jsPDF and downloads it directly. No popup, no print dialog, no server.

- **Standalone file:** jsPDF is loaded from a CDN on first use, trying cdnjs,
  then jsDelivr, then unpkg. Nothing is fetched until a visitor asks for a PDF.
- **React app:** `npm install jspdf` — it is imported dynamically, so it stays
  out of your main bundle until needed.

The RLDatix wordmark is embedded in the file as base64, so the PDF header
needs no external asset. To change the branding, replace the `rldatixLogo`
constant with your own base64 PNG (white or light, it sits on a dark teal bar).

---

## 4. Content-Security-Policy

If your page or its host sets a strict CSP, allow these:

| Directive | Host | Needed for |
|---|---|---|
| `connect-src` | `https://forms-eu1.hsforms.com` | Lead submission |
| `script-src` | `https://cdnjs.cloudflare.com` `https://cdn.jsdelivr.net` `https://unpkg.com` | React, Babel, jsPDF (standalone file only) |
| `font-src` / `style-src` | `https://fonts.googleapis.com` `https://fonts.gstatic.com` | DM Sans (standalone file only; falls back to system fonts) |

In a React app you supply React and jsPDF yourself, so only the HubSpot entry
applies.

---

## 5. Framing (iframe embeds)

The host serving `roi-calculator.html` must not send an `X-Frame-Options` or
`Content-Security-Policy: frame-ancestors` header that blocks your page from
embedding it. WordPress security plugins commonly add
`X-Frame-Options: SAMEORIGIN`, which is fine when the calculator and the page
are on the same domain; if they are on different domains or subdomains, that
header has to be relaxed for the calculator's path.

---

## 6. Testing

| Setup | Result |
|---|---|
| **No config** (both HubSpot constants blank) | Calculator works; PDF downloads locally; no lead sent |
| **HubSpot set** (default) | Lead appears under Marketing → Forms → Submissions; PDF still downloads |
| **HubSpot unreachable** | PDF still downloads; lead kept in the local backup; a warning is logged |

To confirm the embed end to end: load the page, walk the four steps, press
**Calculate ROI**, submit the form, and check that (a) the PDF downloads,
(b) the iframe grew to fit the results with no inner scrollbar, and
(c) the submission is in HubSpot.

---

## 7. Analytics

The calculator emits **no** analytics of its own — no GTM, no GA, no cookies.
Every value it holds is published on a data layer instead, so you can feed
your own tracking on your terms. See `DATA-LAYER-REFERENCE.md`.

Because the standalone file runs in a cross-origin iframe, your page's GTM
cannot see interactions inside it. Use the `smartmatch-roi-data` postMessage
(shown in `embed-snippet.html`) to bridge them.

---

## 8. Privacy / GDPR

- The form carries consent wording, and the HubSpot submission includes
  `legalConsentOptions` with `consentToProcess: true`.
- Only what the visitor types (name, email, organisation, role) plus the
  calculator context summary is transmitted. Nothing is sent before submit.
- The calculator itself is stateless: no server, no database, no session.
- The local backup lives only in the visitor's own browser.
- Add a link to your privacy policy next to the form if your legal team
  requires it.
