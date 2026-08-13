# Smart Match ROI Calculator — Data Layer Reference

Every data point from the calculator is exposed in a single structured
object: `window.smartMatchROIData`. It updates reactively whenever the visitor
changes an input or the confidence level.

The calculator sends **no** analytics of its own (no GTM, no GA, no cookies).
This data layer is how you feed your own tracking, CRM or PDF templates.

---

## Accessing the data

### From the same page (standalone or React app)

```javascript
// Read the current state at any time
const data = window.smartMatchROIData;
console.log(data.annual_cash_saving);      // 172032
console.log(data.fmt.annual_cash_saving);  // "£172k"

// Listen for updates
window.addEventListener("smartmatch-roi-update", (e) => {
  const data = e.detail;
  console.log("Updated:", data.fmt.annual_cash_saving);
});
```

### From a parent page (iframe embed)

```javascript
window.addEventListener("message", (e) => {
  // Optional hardening: check e.origin against your calculator's domain.
  if (e.data?.type === "smartmatch-roi-data") {
    const data = e.data.data;
    console.log("Annual saving:", data.fmt.annual_cash_saving);
  }
});
```

### Into Google Tag Manager

```javascript
window.addEventListener("message", (e) => {
  if (e.data?.type !== "smartmatch-roi-data") return;
  const d = e.data.data;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "smartmatch_roi_update",
    roi_bank_workers: d.bank_workers,
    roi_confidence: d.confidence_label,
    roi_annual_saving: d.annual_cash_saving,
    roi_hours_week: d.hours_released_per_week,
  });
});
```

> The event fires on **every** input change, so debounce it (or only push on
> the values you care about) before sending it to an analytics endpoint.

---

## Full field reference

### Meta

| Field | Type | Example | Description |
|---|---|---|---|
| `_version` | string | `"2.0"` | Data schema version |
| `_generated` | string | `"2026-08-13T14:56:42.349Z"` | ISO timestamp |
| `_stance` | string | `"Moderate"` | Active confidence level |
| `_product` | string | `"Smart Match ROI (web)"` | Which calculator produced it |

### Visitor details

Populated only once the visitor submits the results-page form; `null` before
that.

| Field | Type | Example |
|---|---|---|
| `user_name` | string \| null | `"Jane Smith"` |
| `user_email` | string \| null | `"jane@nhs.net"` |
| `user_org` | string \| null | `"Example NHS Trust"` |
| `user_role` | string \| null | `"Director of Nursing"` |

### Inputs

| Field | Type | Example | Description |
|---|---|---|---|
| `bank_workers` | number | `2000` | Registered bank workers (the whole bank register) |
| `agency_spend` | number | `5400000` | Annual agency spend anchoring the saving |
| `agency_spend_is_estimated` | boolean | `true` | `true` = derived from bank size; `false` = the visitor entered their own figure |
| `agency_spend_per_worker_basis` | number | `2700` | The per-registered-worker rate used for the estimate (FY2025/26) |
| `agency_fill_rate_pct` | number | `8.3` | Share of temporary duties currently on agency |
| `team_size` | number | `12` | Temporary staffing team headcount |
| `confidence_pct` | number | `26` | Displacement applied to the displaceable share |
| `confidence_label` | string | `"Moderate"` | Conservative / Moderate / Optimistic |
| `admin_time_in_cash_total` | boolean | `false` | Whether admin time is included in the headline |

### Headline results

| Field | Type | Example | Description |
|---|---|---|---|
| `annual_cash_saving` | number | `172032` | **The headline.** Net of the licence fee |
| `agency_premium_avoided` | number | `187200` | Gross agency premium displaced |
| `admin_time_value` | number | `48600` | Cash value of the hours released (always reported; in the headline only when `admin_time_in_cash_total` is true) |
| `hours_released_per_week` | number | `60` | Temporary staffing team hours given back |
| `gross_benefit` | number | `187200` | Before the licence fee |
| `licence_fee` | number | `15168` | BankStaff+ annual licence (the ROI denominator) |
| `payback_days` | number \| null | `30` | `null` when there is no net saving |
| `return_multiple` | number \| null | `11.3` | Net saving ÷ licence fee |

### Capacity (never part of the cash saving)

| Field | Type | Example |
|---|---|---|
| `shifts_moved_to_bank` | number | `5613` |
| `bank_backfill_cost` | number | `936000` |
| `fill_rate_before_pct` | number | `8.3` |
| `fill_rate_after_pct` | number | `6.6` |

### Scenario comparison

All three confidence levels are always computed, whichever the visitor has
selected:

```javascript
data.scenarios.conservative.annual_cash_saving  // 78432
data.scenarios.moderate.annual_cash_saving      // 172032
data.scenarios.optimistic.annual_cash_saving    // 344832
// Each has: displacement, annual_cash_saving, agency_premium_avoided, payback_days
```

### Pre-formatted values (`data.fmt`)

Ready to drop straight into templates without formatting:

| Field | Example |
|---|---|
| `fmt.annual_cash_saving` | `"£172k"` |
| `fmt.agency_premium_avoided` | `"£187k"` |
| `fmt.admin_time_value` | `"£49k"` |
| `fmt.agency_spend` | `"£5.40m"` |
| `fmt.licence_fee` | `"£15,168"` |
| `fmt.gross_benefit` | `"£187k"` |
| `fmt.hours_released_per_week` | `"60"` |
| `fmt.shifts_moved_to_bank` | `"5,613"` |
| `fmt.bank_backfill_cost` | `"£936k"` |
| `fmt.bank_workers` | `"2,000"` |
| `fmt.payback_days` | `"30 days"` |
| `fmt.return_multiple` | `"11.3x"` |
| `fmt.fill_rate` | `"8.3% to 6.6%"` |
| `fmt.date` | `"13 August 2026"` |

---

## Example: driving your own summary block

```javascript
window.addEventListener("smartmatch-roi-update", (e) => {
  const d = e.detail;

  // Raw values for your own arithmetic
  const monthly = Math.round(d.annual_cash_saving / 12);

  // fmt values for display
  document.getElementById("headline").textContent = d.fmt.annual_cash_saving;
  document.getElementById("hours").textContent = d.fmt.hours_released_per_week;
  document.getElementById("stance").textContent = d.confidence_label;
});
```

## Example: posting the full dataset to your own endpoint

```javascript
// On form submission, send everything the visitor modelled to your CRM/warehouse.
window.addEventListener("smartmatch-roi-update", (e) => {
  const d = e.detail;
  if (!d.user_email) return;            // only after the visitor submits the form
  fetch("/api/roi-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(d),
  });
});
```

---

## Notes

- Number fields are raw (`172032`), never formatted strings — use `fmt.*` for
  display.
- The object updates on every input change, not only on form submission.
- `annual_cash_saving` is **net** of the licence fee; `agency_premium_avoided`
  is the gross premium before it.
- `admin_time_value` is always populated, but is only part of
  `annual_cash_saving` when `admin_time_in_cash_total` is `true` — that is the
  visitor's explicit Yes/No choice.
- Capacity fields (`shifts_moved_to_bank`, `bank_backfill_cost`) are
  operational value, **never** added to the cash saving. Presenting them as
  cash would misstate the model.
- `hours_released_per_week` deliberately does not change with the confidence
  level: it comes from automating the booking workflow, not from the share of
  agency work displaced.
- Publishing is best-effort and never throws: if a host page or frame rejects
  the message, the calculator carries on unaffected.
