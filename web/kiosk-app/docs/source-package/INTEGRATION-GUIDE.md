# Smart Match ROI Calculator: Integration Setup Guide

## Overview

The calculator runs entirely in the visitor's browser. There is no server
code, no database and no build step. It has **one** outbound integration
(HubSpot lead capture), and it is optional: if the config values are blank the
calculator still works and still gives the visitor their PDF.

---

## 1. HubSpot Lead Capture (pre-configured)

**Status: LIVE.** HubSpot is already wired in and ready to use.

**What it does:** when a visitor submits the results-page form, their details
are POSTed to HubSpot's Forms API (EU1 region) as a new submission, and their
PDF report downloads.

### Current configuration

Near the top of the lead-capture section in `roi-calculator.js` (and in the
inline script of `roi-calculator.html`, which is the same code):

```javascript
const HUBSPOT_PORTAL_ID = "27174408";
const HUBSPOT_FORM_GUID = "7bbba4f2-2045-458d-a339-b06e5e7a16d7";
const HUBSPOT_REGION    = "eu1";   // EU data centre
```

**API endpoint:**
`https://forms-eu1.hsforms.com/submissions/v3/integration/submit/{portalId}/{formGuid}`

This is the dedicated Smart Match form. To point the calculator at a different
form, change `HUBSPOT_FORM_GUID` only. Nothing else in the code refers to it.

> **If you are used to the `hbspt.forms.create()` embed script, note that this
> is a different integration style.** That script renders HubSpot's own form
> markup into a container div. This calculator renders its own form, styled to
> match the results page, and POSTs the answers straight to the Forms API. Both
> routes deliver to the same HubSpot form and the same submissions list, but
> pasting the embed-script snippet into the page will not connect the
> calculator's form to HubSpot. The GUID above is the only wiring needed.

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

> **Every one of these six fields must exist on the HubSpot form.** The Forms
> API rejects the *whole* submission with HTTP 400 if it is sent a field the
> form does not define, so a single missing property loses the lead. `message`
> is the one most often absent. If you would rather not add it, delete that
> line from the `fields` array and use the custom properties below instead.

The submission also carries `context.pageUri`, the page the visitor was on.
The calculator works this out at run time and omits the field entirely if it
cannot find a valid `http(s)` URL, so this needs no configuration.

### How it works

No HubSpot form SDK is loaded. The calculator POSTs directly to the Forms API
v3, which is lighter than the `hbspt.forms.create()` widget and preserves the
calculator's own styling. **No HubSpot tracking script, cookies or pixels are
used.** It is a single request, made only when a visitor presses submit.

The visitor's PDF never waits on HubSpot: it is generated and downloaded
first, and the lead is written to the local browser backup below before the
request goes out. But the response **is** checked. HubSpot answers 200 on
success and 400 with a JSON reason on rejection, and a rejection is logged to
the browser console with that reason, naming the likely cause. If you are
testing the form and nothing arrives in HubSpot, open the browser console:
the answer will be there.

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

jsPDF is the calculator's only dependency of any kind. It is loaded from a CDN
on first use, trying cdnjs, then jsDelivr, then unpkg, so one blocked host does
not cost the visitor their report. Nothing is fetched until the Download button
is pressed.

The RLDatix wordmark is embedded in the file as base64, so the PDF header
needs no external asset. To change the branding, replace the `rldatixLogo`
constant with your own base64 PNG (white or light, it sits on a dark teal bar).

---

## 4. Content-Security-Policy

If your page or its host sets a strict CSP, allow these:

| Directive | Host | Needed for |
|---|---|---|
| `connect-src` | `https://forms-eu1.hsforms.com` | Lead submission |
| `script-src` | `https://cdnjs.cloudflare.com` `https://cdn.jsdelivr.net` `https://unpkg.com` | jsPDF, and only when a visitor downloads a report |
| `font-src` / `style-src` | `https://fonts.googleapis.com` `https://fonts.gstatic.com` | DM Sans (falls back to system fonts if blocked) |

The calculator loads no framework, so there is nothing else to allow.

---

## 5. Framing (iframe embeds)

The host serving `roi-calculator.html` must not send an `X-Frame-Options` or
`Content-Security-Policy: frame-ancestors` header that blocks your page from
embedding it. WordPress security plugins commonly add
`X-Frame-Options: SAMEORIGIN`, which is fine when the calculator and the page
are on the same domain; if they are on different domains or subdomains, that
header has to be relaxed for the calculator's path.

### Hosted file, or inline

Both are supported, and both are tested:

| | `embed-snippet.html` (hosted) | `embed-snippet-inline.txt` (inline) |
|---|---|---|
| What you paste | ~30 lines | one ~315 KB file, calculator included |
| Setup | upload `roi-calculator.html`, point `src` at it | nothing to upload |
| To take a new version | replace the uploaded file | re-paste the whole snippet |
| Calculator has its own URL | yes | no (`about:srcdoc`) |
| Browser caches it separately | yes | no |
| Antivirus objects to the file | no | sometimes, see section 9 |

The hosted route is less to maintain: updates are a one-file swap, and the
calculator has a real address to cache and link to. The inline route needs no
file upload at all, which is the right trade when uploading to the CMS is the
awkward part.

`embed-snippet-inline.txt` is generated from the calculator, so it is always
the current build. Do not hand-edit the base64 `DATA` string inside it: to
update, replace the whole file. It ships as a `.txt` file alongside this
package rather than as `.html` inside it, for the reason in section 9. Paste
it; do not open or rename it.

Inline embedding is fully supported by the calculator. It resolves its HubSpot
`pageUri` from the parent page (see section 1), and its local lead backup
degrades quietly if browser storage is unavailable.

### If you use the `sandbox` attribute

A `sandbox` attribute without `allow-same-origin` puts the calculator on an
opaque origin. **The lead form then silently fails**: the browser blocks the
HubSpot request outright, while the visitor still receives their PDF and still
sees the confirmation message, so nothing looks wrong from the outside. The
local lead backup is blocked too.

If you need `sandbox`, use at least:

```html
sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"
```

`allow-downloads` is needed for the PDF. The simplest option is to omit the
attribute, which is what `embed-snippet.html` does.

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

### The form submits but nothing reaches HubSpot

The PDF downloading and the confirmation message appearing prove only that the
calculator ran; they say nothing about HubSpot. **Open the browser console and
submit again.** The calculator logs the reason.

| Console message | Cause | Fix |
|---|---|---|
| `HubSpot rejected the submission (HTTP 400)` plus a JSON body naming a field | That field is not defined on the form | Add the property in HubSpot, or remove the field from the `fields` array |
| `HTTP 404` | Portal ID or form GUID is wrong, or the form was deleted | Re-check the two constants against Marketing then Forms in HubSpot |
| `could not be sent: TypeError: Failed to fetch` | The request never left the browser | An ad-blocker, a `connect-src` CSP rule, or a `sandbox` attribute on the iframe. See sections 4 and 5 |
| Nothing at all in the console | The `HUBSPOT_PORTAL_ID` / `HUBSPOT_FORM_GUID` constants are blank, so no request is attempted | Set them |

Leads are kept in the local browser backup (section 2) whatever happens, so
submissions made while the form was misconfigured can still be recovered from
the machine they were made on.

---

## 7. Analytics

The calculator emits **no** analytics of its own: no GTM, no GA, no cookies.
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

---

## 9. If antivirus flags the inline snippet

`embed-snippet-inline.txt` carries the whole calculator as one ~337,000
character base64 string that the page decodes at run time and injects into an
iframe. That is also the shape of HTML smuggling, where a payload is hidden in
base64 so it never exists as a file until the browser rebuilds it, so Windows
Defender's heuristics flag any `.html` file built this way on sight. It is a
false positive: the string decodes byte for byte to `roi-calculator.html`,
which ships in this package unwrapped, and you can confirm that yourself:

```bash
# Linux or macOS. Both lines must print the same hash.
sed -n 's/.*var DATA = "\([A-Za-z0-9+/=]*\)".*/\1/p' embed-snippet-inline.txt | base64 -d | shasum -a 256
shasum -a 256 roi-calculator.html
```

Three things keep this out of your way:

1. It is sent as `.txt`, not `.html`. The file is only ever pasted into a
   Custom HTML block, never opened or executed, so the extension costs nothing
   and the scanner has no self-decoding HTML file to object to. Do not rename
   it.
2. It is sent alongside the package rather than inside the zip, so a scanner
   objecting to it cannot block everything else.
3. The hosted route in section 5 has no base64 and no run-time decoding at
   all. If a scanner or an email gateway is in the way, use that instead.

The calculator itself contains no `eval`, no `new Function`, no
`document.write`, and no executable of any kind, and it talks only to the
hosts listed in section 4.
