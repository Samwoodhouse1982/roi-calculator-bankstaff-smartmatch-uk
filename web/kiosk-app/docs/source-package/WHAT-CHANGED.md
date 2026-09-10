# What changed, and what to do

This package replaces the version currently live. If the lead capture form has
not been working, this is the fix.

## The headline

**The calculator is now plain JavaScript.** No React, no JSX, no build step,
no framework of any kind, and nothing to install. It is one script that
defines one global.

That was the blocker: the previous package shipped a React component, which
your site cannot run. The calculation engine, the wording and the figures are
unchanged, and both builds share the same engine and the same lead-capture
code, so nothing about the numbers has moved.

## The problem

The calculator on the page is an older build. Its lead form posts to an interim
HubSpot form GUID (`3f860858-...`), not the Smart Match form, so submissions
have not been arriving where they were expected.

Two things kept that invisible:

1. The old build never checked HubSpot's response, so a rejected submission was
   discarded silently. The visitor still got their PDF and still saw the
   confirmation message, which made a broken form look like a working one.
2. The calculator was inlined into the page by hand as a base64 string, so
   there was no route for a new version to reach it.

## What to do

**Replace your Custom HTML block with the whole of `embed-snippet-srcdoc.html`.**

That is the only step. It is the same wrapper you are using now, same element
ids, same decode, same resize listener, with the current calculator inside it.
Nothing else needs to change and there is nothing to configure.

If you would rather host the calculator as a file, upload
`roi-calculator.html` and use `embed-snippet.html` instead. Both are supported
and both produce identical figures. `INTEGRATION-GUIDE.md` section 5 compares
them.

## What is different in this build

| | Before | Now |
|---|---|---|
| Technology | React 18 + Babel, compiled in the browser | plain JavaScript, nothing to load |
| Files to integrate | `ROICalculator.jsx` (needs a React app) | `roi-calculator.js`, or just the HTML file |
| Scripts fetched at load | React, ReactDOM, Babel (3 CDN requests) | none |
| HubSpot form | `3f860858-...` (interim, shared) | `7bbba4f2-2045-458d-a339-b06e5e7a16d7` (Smart Match) |
| Failed submission | discarded silently | HubSpot's own reason logged to the browser console |
| `context.pageUri` | `window.location.href` | resolved at run time, valid inside an inline embed |
| Licence price list | older band list, with gaps a bank size had to round up through | current list, continuous from 1 to 100,000 users |

The calculation engine itself is unchanged. One input to it is not: the licence
fee has been updated to the current price list, which is lower at every band the
two lists share and, because it has no gaps, lower again for the bank sizes that
previously had to round up to a higher tier. That moves the three figures
measured against the fee, and only those three:

| | Direction | Example, at a 3,500 worker bank |
|---|---|---|
| Net annual cash saving | slightly up | £657,699 to £662,194 |
| Payback | faster | 11 days to 9 days |
| Return multiple | up | 31.5x to 40.4x |

The agency premium avoided, the admin time value, the hours released, the shift
counts and the agency fill rates are all untouched, because none of them involve
the licence fee.

Both builds were driven through the full flow with identical inputs and every
published figure matched exactly, down to the payback days and the return
multiple, so the plain-JS and React versions cannot disagree.

Dropping the framework also made the page lighter. It no longer fetches React,
ReactDOM and Babel before it can draw anything, and it no longer compiles
itself in the browser on every visit.

### Why `pageUri` mattered

Inside an iframe filled by `srcdoc`, the document's own URL is the literal
string `about:srcdoc`. The old build sent that to HubSpot as the page the lead
came from, which is not a URL and can be rejected. It now falls back to the
parent page, so the submission carries the marketing page the visitor was
actually reading.

## Two things to check on your side

1. **Does the Smart Match form have a `message` property?** The calculator
   sends six fields: `firstname`, `lastname`, `email`, `company`, `jobtitle`,
   `message`. HubSpot rejects the *whole* submission with HTTP 400 if it is
   sent a field the form does not define, so one missing property loses the
   lead. `message` carries the calculator context and is the one most often
   absent. If you would rather not add it, tell us and we will map that context
   onto properties the form already has.

2. **Does your iframe have a `sandbox` attribute?** Without
   `allow-same-origin` it blocks the HubSpot request and the PDF download,
   while the calculator still looks like it worked. The snippet does not add
   one; check that your CMS or a security plugin has not.

## If submissions still do not arrive

Open the browser console and submit again. The calculator now logs the reason.
`INTEGRATION-GUIDE.md` section 6 lists the messages and what each one means.
