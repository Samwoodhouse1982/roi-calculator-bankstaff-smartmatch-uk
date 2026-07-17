# Smart Match — Bank-Staff Utilisation ROI (Kiosk)

Touchscreen kiosk for the **RLDatix Smart Match** bank-staff utilisation ROI calculator (UK / NHS).
Portrait 1080×1920 (9:16), dark navy + teal theme, touch-optimised. Currency en-GB (£).

## The model

Better bank-staff **utilisation is the mechanism**; the cash is the **agency premium displaced** when
improved utilisation moves temporary duties off expensive agency and onto the trust's own bank.
Filling a bank shift is expenditure — only the agency-vs-bank premium is a cash saving. Three things
are kept separate:

- **(A) Hard cash** — agency premium displaced (plus admin time saved, valued).
- **(B) Admin time** — roster-team hours released (shown both as cash and as the "hours saved / week" co-headline).
- **(C) Capacity** — additional temp duties filled by your own bank. This is coverage, **not** cash, and is never in the saving.

Outputs are **indicative**. The pilot evidence is a small two-site vendor sample within a four-trust
programme; the agency premium is contested at shift level and the model is most credible on a trust's own rates.

## Flow

Three simple inputs, then a calibrating animation, then a results screen with a live modelling-stance slider:

1. **Your bank** — bank staff pool size (50–3000)
2. **Agency** — current agency fill rate % (0–30)
3. **Your team** — number of admin / roster managers (0–60)
4. **Results** — two co-headlines (net cash saving / year, hrs admin time saved / week), KPI tiles,
   a live Conservative/Moderate/Optimistic displacement slider (5–30%), a capacity panel, methodology,
   and honest framing.

## Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Use browser DevTools to set the viewport to 1080×1920 for kiosk preview.

## Build

```bash
npm install
npm run build
```

Outputs a fully static, offline-capable bundle to `dist/`.

## Deploy

**Vercel — Git deploy:** the Vercel project builds from `main` with Root Directory `touchscreen`;
build settings come from that folder's `vercel.json` (`cd kiosk-app && npm run build`, output `kiosk-app/dist`).

**Any static host:** run `npm run build` and upload `dist/` — the bundle is fully static and self-contained.

## Architecture

```
src/
  main.jsx              Entry point
  App.jsx               State, step routing, splash, calibrating, admin stats overlay
  theme.js              Colours (navy + teal), fonts, £ formatters, step labels
  calc/
    engine.js           calc() + the validated bank-staff ROI model constants
  components/
    index.jsx           Card, StepIndicator, NavButtons, PageTransition,
                        TouchSlider, Stepper, InfoTip, SectionTitle, etc.
    SplashScreen.jsx    Animated splash + particle convergence
    BackgroundParticles.jsx
    Icons.jsx
  steps/
    index.jsx           BankStep, AgencyStep, TeamStep
  results/
    ResultsPage.jsx     Co-headlines, KPIs, live stance slider, capacity, methodology
```

Hidden admin stats overlay: single-tap the RLDatix logo on the splash. Reset is PIN-protected.
15-minute idle timeout returns the kiosk to the splash.
