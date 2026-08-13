/* ═══════════════════════════════════════════════════════════════════════
   DATA LAYER

   Publishes every calculator value as one structured object so a host page
   can read it without parsing the DOM:

     window.smartMatchROIData                       (current state)
     window.addEventListener("smartmatch-roi-update", e => e.detail)
     postMessage { type: "smartmatch-roi-data", data }   (to the parent frame)

   Raw numbers stay raw; `fmt.*` carries display-ready strings. Documented
   for integrators in DATA-LAYER-REFERENCE.md.
   ═══════════════════════════════════════════════════════════════════════ */
import { fmt, fmtK, fmtNum } from './theme';
import { stance, AGENCY_SPEND_PER_REGISTERED_BANK_WORKER_GBP } from './calc/engine';

export const DATA_LAYER_VERSION = "2.0";

const days = m => (m == null ? null : Math.round(m * 365 / 12));

/* Build the published object from the engine result + the raw inputs.
   `lead` is optional: it only carries values once a visitor submits the form. */
export function buildData(r, inputs, lead) {
  const st = stance(inputs.displacement);
  const adminValue = inputs.includeAdmin ? r.adminSaving : inputs.numManagers * 1 * 225 * 18;
  const scenarioAt = d => {
    const s = inputs.calcAt ? inputs.calcAt(d) : null;
    return s ? { displacement: d, annual_cash_saving: Math.round(s.netSaving), agency_premium_avoided: Math.round(s.agencySaving), payback_days: days(s.paybackMonths) } : null;
  };
  return {
    _version: DATA_LAYER_VERSION,
    _generated: new Date().toISOString(),
    _stance: st.key,
    _product: "Smart Match ROI (web)",

    user_name: (lead && lead.name) || null,
    user_email: (lead && lead.email) || null,
    user_org: (lead && lead.org) || null,
    user_role: (lead && lead.role) || null,

    bank_workers: inputs.bankPool,
    agency_spend: Math.round(r.agencySpend),
    agency_spend_is_estimated: inputs.agencySpend == null,
    agency_spend_per_worker_basis: AGENCY_SPEND_PER_REGISTERED_BANK_WORKER_GBP,
    agency_fill_rate_pct: inputs.agencyFillRate,
    team_size: inputs.numManagers,
    confidence_pct: inputs.displacement,
    confidence_label: st.key,
    admin_time_in_cash_total: inputs.includeAdmin === true,

    annual_cash_saving: Math.round(r.netSaving),
    agency_premium_avoided: Math.round(r.agencySaving),
    admin_time_value: Math.round(adminValue),
    hours_released_per_week: Math.round(r.timeSavedWeek),
    gross_benefit: Math.round(r.grossBenefit),
    licence_fee: Math.round(r.platformCost),
    payback_days: r.netSaving > 0 ? days(r.paybackMonths) : null,
    return_multiple: r.netSaving > 0 && r.roiMultiple != null ? Math.round(r.roiMultiple * 10) / 10 : null,

    shifts_moved_to_bank: Math.round(r.displaced),
    bank_backfill_cost: Math.round(r.capacityValue),
    fill_rate_before_pct: Math.round(r.fillNow * 10) / 10,
    fill_rate_after_pct: Math.round(r.fillAfter * 10) / 10,

    scenarios: {
      conservative: scenarioAt(13),
      moderate: scenarioAt(26),
      optimistic: scenarioAt(50),
    },

    fmt: {
      annual_cash_saving: fmtK(r.netSaving),
      agency_premium_avoided: fmtK(r.agencySaving),
      admin_time_value: fmtK(adminValue),
      agency_spend: fmtK(r.agencySpend),
      licence_fee: fmt(r.platformCost),
      gross_benefit: fmtK(r.grossBenefit),
      hours_released_per_week: fmtNum(r.timeSavedWeek),
      shifts_moved_to_bank: fmtNum(r.displaced),
      bank_backfill_cost: fmtK(r.capacityValue),
      bank_workers: fmtNum(inputs.bankPool),
      payback_days: r.netSaving > 0 && r.paybackMonths != null ? fmtNum(days(r.paybackMonths)) + " days" : "n/a",
      return_multiple: r.netSaving > 0 && r.roiMultiple != null ? (Math.round(r.roiMultiple * 10) / 10) + "x" : "n/a",
      fill_rate: (Math.round(r.fillNow * 10) / 10) + "% to " + (Math.round(r.fillAfter * 10) / 10) + "%",
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    },
  };
}

/* Publish: set the global, fire the DOM event, and post to the parent frame.
   Never throws - a failure here must not affect the calculator. */
export function publishData(data) {
  try {
    if (typeof window === "undefined") return;
    window.smartMatchROIData = data;
    window.dispatchEvent(new CustomEvent("smartmatch-roi-update", { detail: data }));
    if (window.self !== window.top) window.parent.postMessage({ type: "smartmatch-roi-data", data }, "*");
  } catch (e) { /* host gone, or structured-clone refused: ignore */ }
}
