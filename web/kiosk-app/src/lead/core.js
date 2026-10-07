/* ────────────────────────────────────────────────────────────────────────
   LEAD CAPTURE CORE - no framework, no DOM rendering.

   Everything the lead form does that is not drawing pixels: the HubSpot
   configuration, the submission itself, the PDF report and the local backup.

   This file is shared verbatim by both builds of the calculator, the React
   one and the plain-JS one, so the form GUID, the fields sent, the pageUri
   fallback and the PDF layout are literally the same code in both. They
   cannot drift apart, and a fix here reaches both at once.

   The submission is: PDF first, local backup second, HubSpot last. The
   visitor's report never waits on the network, but the response IS checked,
   because silently discarding a rejection is how a broken lead form comes to
   look like a working one.
   ──────────────────────────────────────────────────────────────────────── */
import { fmt, fmtK, fmtNum } from '../theme';
import { calc, stance } from '../calc/engine';
import rldatixLogo from '../assets/rldatix-logo.png';

/* Dedicated Smart Match form on the RLDatix HubSpot portal (EU data centre).
   To point the calculator at a different form, change the GUID only. */
export const HUBSPOT_PORTAL_ID = "27174408";
export const HUBSPOT_FORM_GUID = "7bbba4f2-2045-458d-a339-b06e5e7a16d7";
export const HUBSPOT_REGION = "eu1";   // EU data centre

export const STORAGE_KEY = "smartmatch-roi-web-submissions";
export const MAX_RECORDS = 200;

export const ROLE_OPTIONS = [
  "Workforce / HR Director (CPO)",
  "Finance / Business Case",
  "Temporary Staffing / Bank Lead",
  "Roster / e-Rostering Manager",
  "Chief Nurse / CNO team",
  "Digital / CIO team",
  "Other",
];

/* The page to attribute the submission to. `location.href` is the answer in
   every normal embed, but it is the literal string "about:srcdoc" when a host
   injects the calculator via iframe srcdoc, and a file:// path when someone
   opens the HTML from disk. Neither is a URL HubSpot will accept, so fall back
   to the parent page: a srcdoc document inherits its base URL from its parent,
   and the referrer carries it otherwise. pageUri is optional in the Forms API,
   so if none of the three is usable we omit the field rather than send junk. */
export const isHttpUrl = u => /^https?:/i.test(u || "");

/* The HOST page's URL, announced by the embed snippet via postMessage
   ({type:"smartmatch-roi-host", href}). Inside a cross-origin iframe,
   location.href is the calculator's own origin (e.g. the Vercel URL), not the
   page the visitor is actually on (e.g. rldatix.com/en-uki/smart-match-roi-
   calculator/), and the default referrer policy strips the parent's path. The
   snippet tells us, so leads are attributed to the real page. Data only: the
   value is used solely as a URL string, and only if it parses as http(s). */
let hostPageHref = null;
if (typeof window !== "undefined") {
  window.addEventListener("message", e => {
    const d = e.data;
    if (d && d.type === "smartmatch-roi-host" && typeof d.href === "string" && isHttpUrl(d.href)) hostPageHref = d.href;
  });
}
export const hostHref = () => hostPageHref;

export function pageUri() {
  return [
    hostPageHref,
    typeof location !== "undefined" ? location.href : null,
    typeof document !== "undefined" ? document.baseURI : null,
    typeof document !== "undefined" ? document.referrer : null,
  ].find(isHttpUrl);
}

export function readSubmissions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch (e) { return []; }
}

export function saveSubmission(record) {
  try {
    const existing = readSubmissions();
    existing.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, MAX_RECORDS)));
  } catch (e) { console.warn("Local backup failed:", e); }
}

export function clearSubmissions() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
}

/* CSV of the local backup, for the #admin-leads view. */
export function submissionsCSV(records) {
  const esc = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  const rows = [["Timestamp", "Name", "Email", "Organisation", "Role", "Bank workers", "Agency fill %", "Team", "Confidence %", "Stance", "Net saving", "Hours/week"]];
  for (const rec of records) rows.push([
    rec.timestamp, rec.lead && rec.lead.name, rec.lead && rec.lead.email, rec.lead && rec.lead.org, rec.lead && rec.lead.role,
    rec.inputs && rec.inputs.bankPool, rec.inputs && rec.inputs.agencyFillRate, rec.inputs && rec.inputs.numManagers,
    rec.inputs && rec.inputs.displacement, rec.inputs && rec.inputs.stance,
    rec.results && rec.results.netSaving, rec.results && rec.results.timeSavedWeek,
  ]);
  return rows.map(row => row.map(esc).join(",")).join("\n");
}

// Fetch the bundled white RLDatix wordmark as a data URL for jsPDF (best-effort).
async function logoDataUrl() {
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = rldatixLogo; });
    // Downscale before embedding: jsPDF stores PNGs as raw pixels, so the
    // full-size asset would bloat the file by megabytes.
    const w = 400, h = Math.round(w * img.height / img.width);
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    cv.getContext("2d").drawImage(img, 0, 0, w, h);
    return cv.toDataURL("image/png");
  } catch (e) { return null; }
}

/* One-page PDF summary.
   Layout mirrors the report page: navy header with the white RLDatix wordmark
   top-right, two headline callout boxes, a KPI row (incl. the admin-time value,
   marked in/out of the cash total), then Your inputs + Capacity side by side,
   the worked-out equation strip, and the disclaimer. RLDatix light palette. */
export async function generatePDF(r, lead, ctx) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const NAVY = [15, 65, 70], TEAL = [26, 138, 122], SEAFOAM = [52, 222, 194],
        PALE = [238, 247, 242], PALE_SEA = [232, 250, 246], BORDER = [212, 224, 221],
        TEXT = [15, 65, 70], MID = [61, 90, 94], MUTED = [120, 130, 150];
  const M = 14, W = 210 - 2 * M;   // margins / usable width
  const noNet = r.netSaving <= 0;
  const paybackDays = m => m == null ? "n/a" : Math.round(m * 365 / 12).toLocaleString("en-GB") + " days";
  // Admin-time value is always reported: in the cash total when toggled on,
  // otherwise as its own separately-shown figure.
  const adminValue = ctx.includeAdmin ? r.adminSaving : ctx.numManagers * 1 * 225 * 18;

  // ── Header band ──
  doc.setFillColor(...NAVY); doc.rect(0, 0, 210, 34, "F");
  doc.setFillColor(...SEAFOAM); doc.rect(0, 34, 210, 1.4, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(17);
  doc.text("Smart Match: Workforce ROI Estimate", M, 16);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...SEAFOAM);
  doc.text("RLDatix BankStaff+ · " + new Date().toLocaleDateString("en-GB") + (lead.org ? " · " + lead.org : ""), M, 24);
  const logo = await logoDataUrl();
  if (logo) { try { doc.addImage(logo, "PNG", 210 - M - 38, 9, 38, 7.3); } catch (e) { /* header still fine without it */ } }

  // ── Headline callouts ──
  let y = 42;
  doc.setTextColor(...MUTED); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text("YOUR ESTIMATED ANNUAL IMPACT", M, y); y += 3;
  const hbW = (W - 4) / 2, hbH = 28;
  const headlineBox = (x, big, label, sub) => {
    doc.setFillColor(...PALE_SEA); doc.setDrawColor(...TEAL);
    doc.roundedRect(x, y, hbW, hbH, 2.5, 2.5, "FD");
    doc.setTextColor(...TEAL); doc.setFont("helvetica", "bold"); doc.setFontSize(21);
    doc.text(big, x + hbW / 2, y + 13, { align: "center" });
    doc.setTextColor(...TEXT); doc.setFontSize(9.5);
    doc.text(label, x + hbW / 2, y + 20, { align: "center" });
    doc.setTextColor(...MID); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.text(sub, x + hbW / 2, y + 24.5, { align: "center" });
  };
  headlineBox(M,
    noNet ? "No net cash saving" : fmt(Math.round(r.netSaving)),
    noNet ? "at this scale" : "Potential annual cash saving",
    noNet ? "licence fee exceeds the modelled premium" : "after the " + fmt(r.platformCost) + "/yr licence fee");
  headlineBox(M + hbW + 4,
    fmtNum(r.timeSavedWeek) + " hrs",
    "released each week",
    "temporary staffing team time given back");
  y += hbH + 6;

  // ── KPI row ──
  const kW = (W - 9) / 4, kH = 21;
  const kpis = [
    ["AGENCY PREMIUM AVOIDED", fmt(Math.round(r.agencySaving)), "agency vs bank gap, excluding licence fee"],
    ["ADMIN TIME VALUE", fmt(Math.round(adminValue)), ctx.includeAdmin ? "included in the cash total" : "shown separately, not in the cash total"],
    ["PAYBACK", noNet ? "n/a" : paybackDays(r.paybackMonths), "to recover the annual licence fee"],
    ["RETURN", (noNet || r.roiMultiple == null) ? "n/a" : (Math.round(r.roiMultiple * 10) / 10) + "x", "net saving ÷ licence fee, per year"],
  ];
  kpis.forEach(([label, val, sub], i) => {
    const x = M + i * (kW + 3);
    doc.setFillColor(255, 255, 255); doc.setDrawColor(...BORDER);
    doc.roundedRect(x, y, kW, kH, 2, 2, "FD");
    doc.setTextColor(...MUTED); doc.setFont("helvetica", "bold"); doc.setFontSize(6.3);
    doc.text(label, x + 3, y + 5);
    doc.setTextColor(...NAVY); doc.setFontSize(12.5);
    doc.text(String(val), x + 3, y + 11.5);
    doc.setTextColor(...MID); doc.setFont("helvetica", "normal"); doc.setFontSize(6.2);
    doc.text(doc.splitTextToSize(sub, kW - 6), x + 3, y + 15.5);
  });
  y += kH + 7;

  // ── Confidence scenarios: every stance modelled, the chosen one flagged ──
  // Each tile recomputes the whole model at that confidence level (same bank
  // size, fill rate, team and admin choice); the one matching the visitor's
  // selection in the flow is highlighted.
  const chosenKey = stance(ctx.displacement).key;
  const scenarios = [["Conservative", 13], ["Moderate", 26], ["Optimistic", 50]].map(([key, d]) => {
    const rr = calc({ bankPool: ctx.bankPool, agencyFillRate: ctx.agencyFillRate, numManagers: ctx.numManagers, displacement: d, includeAdmin: ctx.includeAdmin, agencySpend: ctx.agencySpend, platformCost: r.platformCost });
    return { key, d, rr, selected: key === chosenKey };
  });
  doc.setTextColor(...MUTED); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text("SAVING BY CONFIDENCE LEVEL", M, y); y += 3;
  const sW = (W - 8) / 3, sH = 47;
  scenarios.forEach((s, i) => {
    const x = M + i * (sW + 4);
    if (s.selected) { doc.setFillColor(...PALE_SEA); doc.setDrawColor(...TEAL); doc.setLineWidth(0.7); }
    else { doc.setFillColor(255, 255, 255); doc.setDrawColor(...BORDER); doc.setLineWidth(0.2); }
    doc.roundedRect(x, y, sW, sH, 2.5, 2.5, "FD");
    doc.setLineWidth(0.2);
    // header: stance name + % (+ SELECTED pill)
    doc.setTextColor(...NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
    doc.text(s.key, x + 4, y + 8);
    doc.setTextColor(...MID); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.text(s.d + "% to bank", x + 4, y + 12.5);
    if (s.selected) {
      doc.setFillColor(...TEAL); doc.roundedRect(x + sW - 27, y + 3.5, 23, 5.5, 2.75, 2.75, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(6);
      doc.text("YOUR CHOICE", x + sW - 15.5, y + 7.2, { align: "center" });
    }
    // net saving headline
    const net = s.rr.netSaving;
    doc.setTextColor(...TEAL); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text(net > 0 ? fmtK(net) : "No net saving", x + 4, y + 21);
    doc.setTextColor(...MID); doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
    doc.text("net annual cash saving", x + 4, y + 25);
    // full KPI list beneath a separator (mirrors the KPI row, per scenario)
    doc.setDrawColor(...BORDER); doc.setLineWidth(0.2); doc.line(x + 4, y + 27.5, x + sW - 4, y + 27.5);
    const paybk = net > 0 && s.rr.paybackMonths != null ? Math.round(s.rr.paybackMonths * 365 / 12).toLocaleString("en-GB") + " days" : "n/a";
    const ret = net > 0 && s.rr.roiMultiple != null ? (Math.round(s.rr.roiMultiple * 10) / 10) + "x" : "n/a";
    const stats = [
      ["Agency premium avoided", fmtK(s.rr.agencySaving)],
      ["Admin time value", fmtK(adminValue)],
      ["Payback", paybk],
      ["Return on licence fee", ret],
    ];
    let sy = y + 31.5;
    stats.forEach(([k, v]) => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.8); doc.setTextColor(...MID);
      doc.text(k, x + 4, sy);
      doc.setFont("helvetica", "bold"); doc.setTextColor(...NAVY);
      doc.text(String(v), x + sW - 4, sy, { align: "right" });
      sy += 4.1;
    });
  });
  y += sH + 7;

  // ── Two columns: Your inputs | Capacity and wider value ──
  const colW = (W - 4) / 2, colH = 42;
  const colBox = (x, title, rows, note) => {
    doc.setFillColor(...PALE); doc.setDrawColor(...BORDER);
    doc.roundedRect(x, y, colW, colH, 2.5, 2.5, "FD");
    doc.setTextColor(...NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
    doc.text(title, x + 4, y + 7);
    let ry = y + 13;
    doc.setFontSize(8);
    rows.forEach(([k, v]) => {
      doc.setTextColor(...MID); doc.setFont("helvetica", "normal");
      doc.text(k, x + 4, ry);
      doc.setTextColor(...TEXT); doc.setFont("helvetica", "bold");
      doc.text(String(v), x + colW - 4, ry, { align: "right" });
      ry += 5.1;
    });
    // Anchor the note a fixed distance above the box floor so it always sits inside.
    if (note) { doc.setTextColor(...MUTED); doc.setFont("helvetica", "italic"); doc.setFontSize(6.5); doc.text(note, x + 4, y + colH - 3.5); }
  };
  colBox(M, "Your inputs", [
    ["Registered bank workers", fmtNum(ctx.bankPool)],
    ["Current agency fill rate", ctx.agencyFillRate + "%"],
    ["Temporary staffing team", fmtNum(ctx.numManagers)],
    ["Confidence level", ctx.displacement + "% (" + ctx.stance + ")"],
    ["Admin time in cash total", ctx.includeAdmin ? "included" : "shown separately"],
  ]);
  colBox(M + colW + 4, "Capacity and wider value", [
    ["Shifts moved to bank / year", fmtNum(r.displaced)],
    ["Bank backfill cost", fmt(Math.round(r.capacityValue))],
    ["Agency reliance", (Math.round(r.fillNow * 10) / 10) + "% down to " + (Math.round(r.fillAfter * 10) / 10) + "%"],
    [ctx.agencySpend != null ? "Your annual agency spend (anchor)" : "Est. annual agency spend (anchor)", fmt(r.agencySpend)],
    ["BankStaff+ licence fee", fmt(r.platformCost) + "/yr"],
  ], "Capacity is coverage, not cash, never added to the saving.");
  y += colH + 5;

  // ── How the saving is worked out ──
  doc.setFillColor(...PALE_SEA); doc.setDrawColor(...TEAL);
  doc.roundedRect(M, y, W, 22, 2.5, 2.5, "FD");
  doc.setTextColor(...NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
  doc.text("How the cash saving is worked out", M + 4, y + 7);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...MID);
  const gap = r.agencyShiftCost - r.bankShiftCost;
  doc.text(`Your own bank ${fmt(Math.round(r.bankShiftCost))}/shift  ·  agency, same shift ${fmt(Math.round(r.agencyShiftCost))}/shift  ·  premium displaced ${fmt(Math.round(gap))}/shift`, M + 4, y + 12.5);
  doc.setFont("helvetica", "bold"); doc.setTextColor(...TEAL);
  const adminEq = ctx.includeAdmin && r.adminSaving > 0 ? ` + ${fmt(Math.round(r.adminSaving))} admin time` : "";
  doc.text(`${fmt(Math.round(r.agencySaving))} premium${adminEq}  -  ${fmt(Math.round(r.platformCost))} licence fee  =  ${noNet ? "-" + fmt(Math.abs(Math.round(r.netSaving))) : fmt(Math.round(r.netSaving))} net a year`, M + 4, y + 18.5);
  y += 22 + 6;

  // ── About these figures (plain-English explainer) ──
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.2); doc.line(M, y, M + W, y); y += 5;
  doc.setTextColor(...MUTED); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text("ABOUT THESE FIGURES", M, y); y += 5;
  const explain = [
    ["Cash saving", "the agency premium displaced when better bank utilisation moves duties off agency onto your own bank. It excludes the cost of the bank shifts themselves; that is capacity, shown separately, and never added to the saving."],
    ["Assumptions", "based on 2026/27 NHS Agenda for Change pay midpoints and deliberately conservative throughout. The 20% agency premium reflects figures cited in House of Commons Library research."],
    ["Agency spend", ctx.agencySpend != null
      ? "was the annual agency figure you supplied, which anchors the cash saving directly."
      : "was estimated from your bank size using FY2025/26 national averages (~£2,700 per registered bank worker); a figure based on your own agency book would give a more accurate result."],
  ];
  doc.setFontSize(7.5);
  explain.forEach(([term, def]) => {
    const label = term + ": ";
    doc.setFont("helvetica", "bold"); doc.setTextColor(...NAVY);
    doc.text(label, M, y);
    const lw = doc.getTextWidth(label);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...MID);
    const lines = doc.splitTextToSize(def, W - lw);
    doc.text(lines, M + lw, y);
    y += lines.length * 3.3 + 1.3;
  });
  y += 2;

  // ── Legal disclaimer (separated) ──
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.2); doc.line(M, y, M + W, y); y += 4.5;
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.8); doc.setTextColor(...MUTED);
  doc.text("DISCLAIMER", M, y); y += 3.6;
  doc.setFont("helvetica", "italic"); doc.setFontSize(6.8); doc.setTextColor(...MUTED);
  doc.text(doc.splitTextToSize("Indicative only, not a quote or a guarantee. Pilot-study figures are from two sites within a four-trust programme, anonymised pending client sign-off, and are not solely attributable to the platform. Validate against your organisation's own bank and agency rates before use in a business case.", W), M, y);

  const orgSlug = lead.org ? "-" + lead.org.trim().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") : "";
  doc.save("smart-match-roi-estimate" + orgSlug + ".pdf");
}

/* The calculator context that travels with every submission (the `message`
   field), so each lead is self-describing in HubSpot. Built at submit time,
   never render time: the visitor can move the confidence slider after the
   form is on screen, and the lead must carry the figures they submitted on. */
export function buildContextMessage(r, leadContext) {
  // The host page (when embedded) rides along so the widget route, whose own
  // page attribution sees only the iframe's origin, still names the real page.
  const page = hostPageHref ? ` | Page: ${hostPageHref}` : "";
  return `Smart Match ROI (web) submission | Bank workers: ${fmtNum(leadContext.bankPool)} | Agency fill: ${leadContext.agencyFillRate}% | Team: ${leadContext.numManagers} | Confidence: ${leadContext.displacement}% (${leadContext.stance}) | Net annual saving: ${fmtK(r.netSaving)} | Hours/week released: ${fmtNum(r.timeSavedWeek)} | Est. agency spend: ${fmtK(r.agencySpend)}${page}`;
}

/* PDF + local backup, shared by both submission routes. The embedded-widget
   route calls this alone (HubSpot has already received the submission from
   its own widget); the fallback route follows it with the Forms API POST. */
export async function recordAndReport(r, lead, leadContext) {
  try { await generatePDF(r, lead, leadContext); } catch (e) { console.warn("PDF failed:", e); }
  saveSubmission({
    timestamp: new Date().toISOString(),
    lead: { name: lead.name, email: lead.email, org: lead.org, role: lead.role },
    inputs: { ...leadContext },
    results: {
      netSaving: r.netSaving, agencySaving: r.agencySaving, adminSaving: r.adminSaving,
      timeSavedWeek: r.timeSavedWeek, displaced: r.displaced,
      agencySpend: r.agencySpend, platformCost: r.platformCost,
      roiMultiple: r.roiMultiple, paybackMonths: r.paybackMonths,
    },
  });
}

/* ────────────────────────────────────────────────────────────────────────
   HUBSPOT EMBEDDED FORM (hbspt.forms.create), the integration style the
   client's marketing team uses everywhere else on their site.

   The calculator tries this FIRST: it loads HubSpot's embed script and
   renders the client's actual HubSpot form (same portal, same form GUID as
   the API route) inside the lead card. If the script cannot load or the
   widget does not render — ad-blockers block js-eu1.hsforms.net routinely,
   and a strict host-page CSP can too — the calculator falls back to its own
   styled form posting to the Forms API. Both routes land submissions in the
   identical HubSpot form, so no lead is lost either way.
   ──────────────────────────────────────────────────────────────────────── */
export const HUBSPOT_EMBED_SRC = "https://js-eu1.hsforms.net/forms/embed/v2.js";

let embedScriptPromise = null;
export function loadHubSpotEmbed(timeoutMs = 8000) {
  if (typeof window === "undefined" || typeof document === "undefined") return Promise.resolve(null);
  if (window.hbspt && window.hbspt.forms) return Promise.resolve(window.hbspt);
  if (!embedScriptPromise) {
    embedScriptPromise = new Promise(resolve => {
      const done = v => { clearTimeout(timer); resolve(v); };
      const timer = setTimeout(() => done(null), timeoutMs);
      const s = document.createElement("script");
      s.src = HUBSPOT_EMBED_SRC; s.async = true; s.charset = "utf-8";
      s.onload = () => done(window.hbspt && window.hbspt.forms ? window.hbspt : null);
      s.onerror = () => done(null);
      document.head.appendChild(s);
    });
  }
  return embedScriptPromise;
}

/* HubSpot's v2 embed renders the form either inline or inside a SAME-ORIGIN
   iframe it writes itself, so the parent page can reach the fields. The
   container can ALSO hold other iframes that are not the form: a hidden
   submission-target helper, or a reCAPTCHA frame. Resolving "the first
   iframe" therefore picks the wrong document whenever one of those is
   present, and the styling, the gap-collapse and the context prefill all
   silently no-op against an empty helper document while the real form sits
   inline, untouched. Resolve by looking for the document that actually
   holds a form, with the container's own document taking precedence. */
const FORM_SELECTOR = "form.hs-form, form[data-form-id], form";
function embeddedFormDoc(container) {
  try {
    if (container.querySelector(FORM_SELECTOR)) return container.ownerDocument || document;
    for (const frame of container.querySelectorAll("iframe")) {
      try {
        const d = frame.contentDocument;
        if (d && d.querySelector(FORM_SELECTOR)) return d;
      } catch (e) { /* cross-origin helper (e.g. reCAPTCHA): not the form */ }
    }
  } catch (e) { /* fall through */ }
  return container.ownerDocument || document;
}
function embeddedFormEl(container) {
  try {
    const doc = embeddedFormDoc(container);
    // Inline, scope to the container so the calculator's own fallback
    // controls can never be mistaken for the widget.
    return doc === (container.ownerDocument || document)
      ? container.querySelector(FORM_SELECTOR)
      : doc.querySelector(FORM_SELECTOR);
  } catch (e) { return null; }
}
function setEmbeddedField(container, name, value) {
  try {
    const form = embeddedFormEl(container);
    const field = form && form.querySelector(`[name="${name}"]`);
    if (!field) return false;
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  } catch (e) { return false; }
}
function readEmbeddedFields(container) {
  const out = {};
  try {
    const form = embeddedFormEl(container);
    if (form) form.querySelectorAll("input[name], select[name], textarea[name]").forEach(f => {
      if (f.type === "checkbox" || f.type === "radio") { if (f.checked) out[f.name] = f.value; }
      else out[f.name] = f.value;
    });
  } catch (e) { /* cross-origin or detached: submissionValues covers it */ }
  return out;
}

/* ── Styling the embedded form ────────────────────────────────────────────
   On the client's own site HubSpot forms are styled by the SITE's
   stylesheet, but inside the calculator's iframe that stylesheet cannot
   reach, and a form set to "raw HTML" mode in HubSpot arrives with no CSS
   at all: bare browser inputs and a grey Submit button. So the calculator
   styles the widget itself, in its own design system, and the form looks
   right regardless of how it is configured in HubSpot or where the
   calculator is embedded. */
function embeddedFormCSS(p) {
  return `
${p}iframe[name^="target_iframe"] { display: none !important; }
${p}.hs-form, ${p}.hs-form * { box-sizing: border-box; }
${p}.hs-form { font-family: 'DM Sans', 'DM Sans Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #0F4146; }
${p}.hs-form fieldset { max-width: none; border: 0; padding: 0; margin: 0; }
${p}.hs-form fieldset.form-columns-2 { display: flex; gap: 12px; }
${p}.hs-form fieldset.form-columns-2 .hs-form-field { flex: 1 1 0; width: auto !important; float: none !important; }
${p}.hs-form fieldset.form-columns-1 .hs-form-field, ${p}.hs-form fieldset.form-columns-3 .hs-form-field { width: 100% !important; float: none !important; }
@media (max-width: 480px) { ${p}.hs-form fieldset.form-columns-2 { display: block; } }
${p}.hs-form .hs-form-field { margin-bottom: 14px; }
${p}.hs-form label { display: block; font-size: 0.9rem; font-weight: 600; color: #3D5A5E; margin-bottom: 6px; }
${p}.hs-form .input { margin: 0 !important; }
${p}.hs-form input.hs-input, ${p}.hs-form select.hs-input, ${p}.hs-form textarea.hs-input {
  width: 100% !important; padding: 11px 14px; border: 1px solid #D4E0DD; border-radius: 10px;
  font-family: inherit; font-size: 0.95rem; color: #0F4146; background: #fff; appearance: auto;
}
${p}.hs-form input.hs-input:focus, ${p}.hs-form select.hs-input:focus, ${p}.hs-form textarea.hs-input:focus {
  outline: none; border-color: #1A8A7A; box-shadow: 0 0 0 3px rgba(26, 138, 122, 0.15);
}
${p}.hs-form input.hs-input[type="checkbox"], ${p}.hs-form input.hs-input[type="radio"] { width: auto !important; accent-color: #0F4146; }
${p}.hs-form ul.inputs-list, ${p}.hs-form ul.hs-error-msgs { list-style: none; margin: 4px 0 0; padding: 0; }
${p}.hs-form .hs-error-msg, ${p}.hs-form .hs-error-msgs label { color: #B42318; font-size: 0.78rem; font-weight: 600; margin: 4px 0 0; }
${p}.hs-form .hs_error_rollup { margin-bottom: 10px; }
${p}.hs-form .hs-richtext, ${p}.hs-form .legal-consent-container, ${p}.hs-form .legal-consent-container p {
  font-size: 0.78rem; color: #5F787C; line-height: 1.5; margin: 0 0 10px;
}
${p}.hs-form .hs_submit { margin-top: 4px; }
${p}.hs-form input.hs-button, ${p}.hs-form .hs-button {
  width: auto; background: #0F4146; color: #fff; border: none; border-radius: 999px;
  padding: 13px 32px; font-family: inherit; font-size: 1rem; font-weight: 800; cursor: pointer;
}
${p}.hs-form input.hs-button:hover, ${p}.hs-form .hs-button:hover { background: #1A5459; }
${p}.submitted-message { font-family: 'DM Sans', system-ui, sans-serif; font-size: 0.95rem; color: #0F4146; line-height: 1.6; }
`;
}

function styleEmbeddedForm(container) {
  try {
    const doc = embeddedFormDoc(container);
    const ownDoc = container.ownerDocument || document;
    const inIframe = doc !== ownDoc;
    const STYLE_ID = "smartmatch-hs-form-style";
    if (!(inIframe ? doc.getElementById(STYLE_ID) : container.querySelector("#" + STYLE_ID))) {
      const style = doc.createElement("style");
      style.id = STYLE_ID;
      // Inside HubSpot's own same-origin iframe the selectors stand alone (and
      // the calculator's font is not loaded there, so fetch it, with the stack
      // falling back to system fonts if that host is blocked). Rendered inline,
      // they are scoped under the widget container so nothing leaks.
      style.textContent = (inIframe ? "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');\nbody { margin: 0; padding: 0; }\n" : "")
        + embeddedFormCSS(inIframe ? "" : `#${container.id || "smartmatch-hs-form"} `);
      (inIframe ? (doc.head || doc.documentElement) : container).appendChild(style);
    }
    // Collapse field wrappers with nothing visible in them, such as the one
    // HubSpot renders around the hidden calculator-context field, which
    // otherwise leaves a blank gap at the top of the form.
    const form = embeddedFormEl(container);
    if (form) form.querySelectorAll(".hs-form-field").forEach(w => {
      if (!w.querySelector("input:not([type=hidden]), select, textarea")) w.style.display = "none";
    });
    // When the form renders inline, HubSpot also drops helper iframes into
    // the container around it (the hidden submission-target frame chief
    // among them). One without its own hiding style renders at the default
    // 300x150, which is the blank block above the first field. Hide every
    // container iframe that does not itself hold the form; reCAPTCHA's
    // frames live inside the form element, so they are never touched.
    if (!inIframe) container.querySelectorAll("iframe").forEach(frame => {
      if (form && form.contains(frame)) return;
      try {
        const d = frame.contentDocument;
        if (d && d.querySelector(FORM_SELECTOR)) return;
      } catch (e) { /* cross-origin: still not the form, hide it */ }
      frame.style.display = "none";
    });
    // One breadcrumb for live diagnosis: says the widget was found and
    // styled, and in which rendering mode, without spamming the console.
    if (form && !styleEmbeddedForm.logged) {
      styleEmbeddedForm.logged = true;
      console.info(`Smart Match ROI: HubSpot widget styled (${inIframe ? "iframe" : "inline"} render).`);
    }
  } catch (e) { /* styling is best-effort; the form still works unstyled */ }
}

/* Render the client's HubSpot form into `container`.
   - getMessage(): called at form-ready AND again just before submission, so
     the hidden context field always carries the figures on screen. The form
     needs a (hidden) field named "message" for this; without one the prefill
     is a silent no-op and the lead simply arrives without calculator context.
   - onSubmitted(lead): fires after HubSpot accepts the submission, with the
     visitor's details recovered from the widget, for the PDF + local backup.
   Resolves true only once the widget has VISIBLY rendered (script loading is
   not enough: a bad GUID or blocked definition fetch renders nothing), so the
   caller can keep its own form when anything in the chain fails. */
export async function createEmbeddedLeadForm({ container, getMessage, onSubmitted }) {
  const hbspt = await loadHubSpotEmbed();
  if (!hbspt) return false;
  let captured = {};
  try {
    hbspt.forms.create({
      portalId: HUBSPOT_PORTAL_ID,
      formId: HUBSPOT_FORM_GUID,
      region: HUBSPOT_REGION,
      target: container.id ? "#" + container.id : container,
      onFormReady: () => {
        try {
          styleEmbeddedForm(container);
          setEmbeddedField(container, "message", getMessage());
          const form = embeddedFormEl(container);
          // Capture-phase listener: refresh the context and snapshot the
          // visitor's answers at the moment they press the widget's submit.
          if (form) form.addEventListener("submit", () => {
            setEmbeddedField(container, "message", getMessage());
            captured = readEmbeddedFields(container);
          }, true);
        } catch (e) { /* prefill is best-effort */ }
      },
      onFormSubmitted: (_f, data) => {
        const v = (data && data.submissionValues) || captured || {};
        onSubmitted({
          name: [v.firstname, v.lastname].filter(Boolean).join(" "),
          email: v.email || "",
          org: v.company || "",
          role: v.jobtitle || "",
        });
      },
    });
  } catch (e) { return false; }
  // Wait for the widget to actually appear (iframe or form) before declaring success.
  for (let waited = 0; waited < 6000; waited += 200) {
    await new Promise(res => setTimeout(res, 200));
    if (container.querySelector("iframe, form")) {
      // HubSpot can rebuild the widget's DOM, or rewrite its iframe's
      // document, AFTER our first styling pass, discarding the injected
      // stylesheet. Keep re-applying for a short window; styleEmbeddedForm
      // is idempotent (it keys on the style element's id), so the passes
      // where nothing was discarded cost nothing.
      styleEmbeddedForm(container);
      const reapply = setInterval(() => styleEmbeddedForm(container), 400);
      setTimeout(() => clearInterval(reapply), 10000);
      return true;
    }
  }
  return false;
}

/* The whole submission, in the order that matters:
     1. the visitor's PDF (the value exchange, never blocked on the network),
     2. the local backup (so a lead survives a blocked network),
     3. HubSpot, with the response checked.
   Never throws: a failure at any stage must not cost the visitor their report. */
export async function submitLead(r, lead, leadContext) {
  await recordAndReport(r, lead, leadContext);

  if (!HUBSPOT_PORTAL_ID || !HUBSPOT_FORM_GUID) return;
  try {
    const context = buildContextMessage(r, leadContext);
    const uri = pageUri();
    const res = await fetch(`https://forms-${HUBSPOT_REGION}.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_GUID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: [
          { name: "firstname", value: lead.name.split(" ")[0] },
          { name: "lastname", value: lead.name.split(" ").slice(1).join(" ") || "" },
          { name: "email", value: lead.email },
          { name: "company", value: lead.org || "" },
          { name: "jobtitle", value: lead.role || "" },
          { name: "message", value: context },
        ],
        context: { pageName: "Smart Match ROI Calculator (web)", ...(uri ? { pageUri: uri } : {}) },
        legalConsentOptions: { consent: { consentToProcess: true, text: "I agree to receive communications about my ROI estimate." } },
      }),
    });
    // HubSpot answers 200 on success and 400 with a JSON reason on rejection.
    // Surface the reason: the visitor's journey is unaffected either way, so
    // without this a misconfigured form is invisible.
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`HubSpot rejected the submission (HTTP ${res.status}). Check HUBSPOT_FORM_GUID and that every field above exists on that form.`, detail);
    }
  } catch (e) {
    // Network-level failure: blocked by CSP, an ad-blocker, offline, or a
    // sandboxed iframe with no allow-same-origin. The lead is still in the
    // local backup above.
    console.warn("HubSpot submission could not be sent:", e);
  }
}
