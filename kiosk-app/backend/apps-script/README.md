# Shared kiosk stats — Google Sheet + Apps Script backend

This makes kiosk stats **persist server-side** and **aggregate across every kiosk**
into one Google Sheet you own, which is also the live dashboard. It's optional:
if you don't set the endpoint the kiosk keeps working exactly as before (local
stats only), so you can deploy this whenever you're ready.

## How it works

1. Each time a visitor completes the calculator, the kiosk POSTs that session to
   your Apps Script web-app URL.
2. The Apps Script appends the row to a Google Sheet it creates and owns
   ("Smart Match Kiosk Stats").
3. The Sheet's **Dashboard** tab shows combined totals and averages across all
   kiosks, live. Share or export it like any Google Sheet.
4. The kiosk still keeps its own local stats (in the hidden admin panel) and
   retries any session that failed to send, so nothing is lost offline.

No patient or personal data is involved — only the anonymous calculator
inputs/outputs already shown on screen.

## One-time setup (about 5 minutes)

1. Go to **https://script.google.com** → **New project**.
2. Delete the default `myFunction` stub, then paste in the full contents of
   [`Code.gs`](./Code.gs). Save.
3. **Set the write key** (a shared secret so only your kiosks can post):
   - Project **Settings** (gear icon) → **Script properties** → **Add script property**.
   - Property: `WRITE_KEY`  ·  Value: any long random string (e.g. a password-manager
     generated 24+ char value). Keep a copy — the kiosk build needs the same value.
4. **Deploy** → **New deployment** → type **Web app**:
   - **Execute as:** Me
   - **Who has access:** Anyone
   - Click **Deploy**, approve the permissions prompt (it needs to create/edit the Sheet).
5. Copy the **Web app URL** — it ends in `/exec`. That's your `VITE_STATS_ENDPOINT`.
6. (Optional) Trigger it once to create the Sheet: paste the `/exec` URL into a
   browser. You'll get `{"ok":true,...,"sheetUrl":"..."}` — open `sheetUrl` and
   bookmark the Sheet. That's your dashboard.

> Re-deploying after a code change: use **Deploy → Manage deployments → edit
> (pencil) → Version: New version**, so the `/exec` URL stays the same.

## Point the kiosk at it

Set these build-time variables before you build the kiosk (`npm run build`).
Copy `kiosk-app/.env.example` to `kiosk-app/.env` and fill in:

```
VITE_STATS_ENDPOINT=https://script.google.com/macros/s/XXXXXXXX/exec
VITE_STATS_KEY=the-same-WRITE_KEY-you-set-above
VITE_KIOSK_ID=conference-stand-1      # any label to tell devices apart in the Sheet
```

Then rebuild and redeploy the kiosk. The admin panel footer will show
**“Shared sync on”** when it's wired up correctly.

- Leave `VITE_STATS_ENDPOINT` unset (or absent) to keep a build local-only.
- Give each physical kiosk a distinct `VITE_KIOSK_ID` so the Dashboard's
  "By kiosk" breakdown is meaningful.

## Security notes

- The `WRITE_KEY` is embedded in the built kiosk JavaScript (it must be, to send
  from the browser), so treat it as a low-value shared secret — it only permits
  appending stat rows, nothing else. Rotate it by changing the script property
  and rebuilding the kiosk if needed.
- "Who has access: Anyone" means the URL accepts posts without a Google login;
  the `WRITE_KEY` is what gates writes. Don't publish the URL + key together.

## Sheet columns

`id, ts, kioskId, flow, netSaving, agencySaving, adminSaving, grossBenefit,
displaced, timeSavedWeek, capacityValue, roiMultiple, paybackMonths, agencySpend,
platformCost, bankPool, agencyFillRate, numManagers, displacement, includeAdmin,
stance`
