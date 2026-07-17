# RLDatix Smart Match — ROI Calculator Suite (UK)

One repository, three products, all sharing the same Smart Match ROI
methodology (cash saving = agency premium displaced; capacity shown
separately, never added). Folder-per-product on `main`; each folder deploys
as its own Vercel project via that project's **Root Directory** setting.

| Folder | Product | Status | App root | Deployment |
|---|---|---|---|---|
| [`touchscreen/`](touchscreen/) | Conference touchscreen kiosk (portrait 1080×1920, attract loop, idle reset) | Complete | `touchscreen/kiosk-app` (Vite + React) | Vercel project `...-touchscreen`, Root Directory `touchscreen` |
| [`web/`](web/) | Short web version of the touchscreen (responsive, iframe-embeddable, lead capture + PDF report) | Complete | `web/kiosk-app` (Vite + React) | Vercel project `rld-smartmatch-web-from-kiosk`, Root Directory `web`; also packaged as a standalone client zip (`npm run package`) |
| [`commercial/`](commercial/) | Long-form commercial flow (single-file HTML: Quick wizard + Detailed per-staff-group model) | Underway | `commercial/` (no build; static) | Vercel project `roi-calculator-bankstaff-smartmatch-uk`, Root Directory `commercial` |

Each folder keeps its own README, docs and `vercel.json` (the two Vite
products' configs `cd kiosk-app` relative to their folder, so they work
unchanged under a Root Directory).

## Working on the suite

- Develop on short-lived feature branches off `main` and merge back via PR —
  no permanent product branches. (The historical `smartmatch-touchscreen`
  and `rld-smartmatch-web-from-kiosk` branches are fully merged into this
  history and can be deleted.)
- A methodology change (pay scales, premium sourcing, licence bands) must
  be applied to **every** product it affects: the engine currently exists in
  `touchscreen/kiosk-app`, `web/kiosk-app` and inline in
  `commercial/roi-calculator.html`. Run each product's tests after.

## Tests

```bash
cd touchscreen/kiosk-app && npm test   # golden-value engine tests
cd web/kiosk-app         && npm test   # golden-value engine tests
cd commercial            && node --test test/engine.web.test.mjs   # web-engine parity tests
```
