# Smart Match Workforce ROI Calculator: owner overview

Background and rationale for the team that owns this tool. Covers what it
measures, what the numbers are based on, why it is structured this way, and how
it is configured and personalised to an organisation.

Repository layout:
- `main` branch: the **web embed** (`roi-calculator.html`), a single self-contained file.
- `smartmatch-touchscreen` branch: the **touchscreen kiosk** (`kiosk-app/`, React + Vite, 1080x1920 portrait).

Both formats share the same value model, so the figures are consistent between them.

---

## 1. What it is

An interactive ROI calculator that shows an NHS trust the cash it could release
by improving **bank-staff utilisation**: moving temporary shifts off expensive
agency and onto the trust's own staff bank. It ships in two formats:

- **Web embed** (`roi-calculator.html`): drops into any web page or CMS via an
  iframe. Includes optional lead capture and a downloadable PDF. For the
  website, marketing and remote / self-serve use.
- **Touchscreen kiosk**: a guided, finger-friendly wizard with large sliders and
  an on-screen keypad, an attract screen and idle reset. For events, stands and
  face-to-face conversations.

---

## 2. What we measure (and what we deliberately exclude)

Three things are kept strictly separate so the headline figure is defensible:

| Category | What it is | Counted as cash? |
|---|---|---|
| **A. Agency premium displaced** | The premium you stop paying when a shift moves from agency to bank | **Yes, the headline** |
| **B. Admin time released** | Roster / bank / temp-staffing time saved through self-booking automation | Yes by default (toggle to exclude); also shown as hours per week |
| **C. Capacity** | Extra duties your own bank now fills; agency reliance reduced | **Never.** Shown separately as coverage, not cash |

### The core principle (why this is conservative and honest)

Filling a bank shift still costs money. A trust only **saves** when a shift that
would have gone to agency is instead covered by bank, and the saving is the
**difference** (the agency premium), not the whole shift value:

```
cash saving = agency spend x displacement x premium / (1 + premium)
```

This corrects a common overstatement (counting the entire shift value as a
saving). The gross value of the shifts you fill is real operational benefit, but
we report it under Capacity, never in the cash total.

---

## 3. What the numbers are based on

- **Pay:** 2026/27 NHS Agenda for Change midpoints (+3.3%), 1,957.5 AfC hours per
  year, 8-hour shifts, 20% bank on-cost.
- **Agency premium:** ~20% default (House of Commons Library average). Flagged as
  contested at shift level and fully editable; most credible on the trust's own rates.
- **Displacement stance** (how much agency work shifts to bank): Conservative
  ~13% (default, about half the pilot), Pilot / Expected ~26% (the level measured
  at one community site, agency fill 8.1% to 6.0%), Optimistic ~35%.
- **Platform cost:** GBP 17,000 per year default, used as the ROI denominator
  (should include implementation, not licence alone).
- **Pilot evidence:** a 2-site dataset within a 4-trust Smart Match programme,
  vendor-collected, anonymised pending client sign-off. Treated as indicative and
  not solely attributable to the platform.

All defaults are deliberately conservative and editable.

---

## 4. Two modes, by audience

- **Quick estimate** (three inputs: bank pool, agency fill rate, roster team) for
  operational managers and a fast headline at events. Agency spend is inferred
  from the bank pool and fill rate.
- **Detailed / commercial** (agency spend per staff group, with AfC bands and an
  editable premium, plus optional admin and recruitment levers) for finance leads
  and workforce directors in a guided commercial conversation, anchored to the
  trust's real agency spend.

---

## 5. Why we built it this way

- **Defensible over impressive:** conservative defaults, a single transparent
  formula, every assumption shown with its source and a "how we calculated this"
  panel, plus honest caveats. Designed to survive scrutiny from a sceptical
  finance lead.
- **Editable:** the model is most credible when run on the trust's own rates, so
  every assumption can be changed live.
- **Strategically framed:** releasing cash and capacity from temporary staffing
  supports the NHS 10 Year Plan and Workforce Paper and the Staff Health and
  Wellbeing CQUIN. Staff-experience benefits are kept as a qualitative note, out
  of the ROI.

---

## 6. How it is configured and personalised

The tool is configurable on two levels: live in the browser by anyone using it
(to personalise to a specific trust in the moment), and in one central place in
the code by whoever owns it (to re-base, rebrand or re-localise it over time).

### 6.1 Live, in the browser, no code

Every assumption is a starting point, not a fixed value. Change any input and the
whole model, ROI, payback and charts recompute instantly.

**Quick estimate:**
- Bank staff pool size, current agency fill rate, number of roster / admin staff.
- Modelling stance: Conservative / Pilot / Optimistic, or any value on the slider.
- Toggle to include or exclude admin time from the cash total.
- "Advanced" reveal (web): agency premium %, platform cost, shift length, bank on-cost.

**Detailed / commercial:**
- **Organisation presets** (acute, community, mental health, ambulance, ICS) that
  pre-fill a realistic starting shape, then refine.
- **Per staff group:** add or remove groups and set each group's bank headcount,
  annual agency spend and bank pay. AfC band chips fill pay with one tap.
- **Assumptions:** agency premium (one official rate, or set it per staff group),
  displacement stance, platform cost, current agency fill rate.
- **Optional levers, off until substantiated:** admin time saving (managers,
  hours per day, working days, loaded rate) and recruitment / onboarding waste
  recovered (workers, cost each, recovery share).
- **Time horizon:** 3-year or 5-year cumulative view (kiosk).

**Input methods:** the kiosk pairs big sliders for quick setting with an on-screen
numeric keypad for exact figures; the web uses standard number fields. The web
also offers lead capture and a PDF export of the personalised result.

### 6.2 In the code, one central place, for the owner

All defaults live in a single labelled block per app
(`kiosk-app/src/calc/engine.js` and `kiosk-app/src/theme.js` for the touchscreen;
the top of `roi-calculator.html` for the web). Editing these re-bases the tool:

- **Pay scales:** AfC midpoints and band table (update once a year when AfC
  uplifts land), the hourly divisor, shift length and on-cost.
- **Model defaults:** agency premium, displacement stance values and labels,
  platform cost, admin assumptions.
- **Organisation presets:** add or edit the trust archetypes and the scale each applies.
- **Stance model:** the thresholds, names and notes for Conservative / Pilot / Optimistic.
- **Branding:** theme colours (navy and teal), logo asset and splash copy.
- **Locale and currency:** the web file exposes `LOCALE` and `SYMBOL` with an
  "AU-ready" note, so it can be re-pointed to another country by changing two
  values; the kiosk formatters are en-GB and live in `theme.js`.
- **Lead capture:** HubSpot portal and form placeholders in the web file are ready
  to wire up; the embed auto-resizes its iframe via postMessage.
- **Kiosk admin:** a PIN-protected panel tracks usage and cumulative impact; the
  PIN is a single configurable value.

### 6.3 Why this matters

Conservative, defensible defaults mean it produces a credible figure out of the
box with no setup. But because every assumption is editable (and the optional
levers stay off until the trust can stand behind them), the same tool scales from
a 30-second event estimate to a finance-grade business case run entirely on the
organisation's own bank and agency rates.

---

## 7. Maintenance notes

- **Annual refresh:** when AfC pay uplifts are announced, update the pay constants
  (`SIMPLE_BLENDED_BANK_PAY`, `STAFF_GROUPS`, `AFC_BANDS` in the kiosk engine; the
  matching constants at the top of `roi-calculator.html`).
- **Keeping the two in step:** the quick estimate and detailed model share their
  assumptions; if you change a default in one app, mirror it in the other so the
  web and kiosk agree.
- **Evidence:** the pilot figures are indicative and anonymised pending client
  sign-off. Update the evidence strip and caveats if and when firmer data is approved.
