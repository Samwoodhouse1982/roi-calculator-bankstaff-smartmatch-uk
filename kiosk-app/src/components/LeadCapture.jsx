import React, { useState, useCallback } from 'react';
import { C, F, fmt, fmtK, fmtNum } from '../theme';
import { Icon } from './Icons';
import rldatixLogo from '../assets/rldatix-logo.png';

/* ────────────────────────────────────────────────────────────────────────
   Lead capture — ported from the RLDatix EPR-migration/archive (Galen) ROI
   calculator and restyled for the Smart Match theme. Same mechanics:

   1. Submit generates + downloads a PDF summary (the value exchange).
   2. The submission is backed up to localStorage (reviewable at #admin-leads,
      exportable as CSV) so leads survive offline/blocked-network conditions.
   3. Fire-and-forget POST to HubSpot (EU1) with the calculator context in the
      message field.

   The HubSpot portal is RLDatix's (same as the Galen calculator). The form
   GUID below is the Galen calculator's working form — swap it for a dedicated
   Smart Match form GUID when marketing creates one; submissions are
   distinguishable meanwhile via the message field ("Smart Match ROI ...").
   ──────────────────────────────────────────────────────────────────────── */
const HUBSPOT_PORTAL_ID = "27174408";
const HUBSPOT_FORM_GUID = "3f860858-5a58-4f1b-8419-a561af17adbe";   // Galen calculator form — replace with a Smart Match form GUID when available
const HUBSPOT_REGION = "eu1";   // EU data centre

const STORAGE_KEY = "smartmatch-roi-web-submissions";
const MAX_RECORDS = 200;

const ROLE_OPTIONS = [
  "Workforce / HR Director (CPO)",
  "Finance / Business Case",
  "Temporary Staffing / Bank Lead",
  "Roster / e-Rostering Manager",
  "Chief Nurse / CNO team",
  "Digital / CIO team",
  "Other",
];

function readSubmissions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch (e) { return []; }
}

function saveSubmission(record) {
  try {
    const existing = readSubmissions();
    existing.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, MAX_RECORDS)));
  } catch (e) { console.warn("Local backup failed:", e); }
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

/* One-page PDF summary (jsPDF, bundled — no CDN dependency).
   Layout mirrors the report page: navy header with the white RLDatix wordmark
   top-right, two headline callout boxes, a KPI row (incl. the admin-time value,
   marked in/out of the cash total), then Your inputs + Capacity side by side,
   the worked-out equation strip, and the disclaimer. RLDatix light palette. */
async function generatePDF(r, lead, ctx) {
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
  doc.text("RLDatix BankStaff+ · indicative · " + new Date().toLocaleDateString("en-GB") + (lead.org ? " · " + lead.org : ""), M, 24);
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

  // ── Two columns: Your inputs | Capacity and wider value ──
  const colW = (W - 4) / 2, colH = 46;
  const colBox = (x, title, rows, note) => {
    doc.setFillColor(...PALE); doc.setDrawColor(...BORDER);
    doc.roundedRect(x, y, colW, colH, 2.5, 2.5, "FD");
    doc.setTextColor(...NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
    doc.text(title, x + 4, y + 7);
    let ry = y + 14;
    doc.setFontSize(8);
    rows.forEach(([k, v]) => {
      doc.setTextColor(...MID); doc.setFont("helvetica", "normal");
      doc.text(k, x + 4, ry);
      doc.setTextColor(...TEXT); doc.setFont("helvetica", "bold");
      doc.text(String(v), x + colW - 4, ry, { align: "right" });
      ry += 5.6;
    });
    if (note) { doc.setTextColor(...MUTED); doc.setFont("helvetica", "italic"); doc.setFontSize(6.5); doc.text(doc.splitTextToSize(note, colW - 8), x + 4, ry + 1); }
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
    ["Est. annual agency spend (anchor)", fmt(r.agencySpend)],
    ["BankStaff+ licence fee", fmt(r.platformCost) + "/yr"],
  ], "Capacity is coverage, not cash; it is never added to the saving.");
  y += colH + 7;

  // ── How the saving is worked out ──
  doc.setFillColor(...PALE_SEA); doc.setDrawColor(...TEAL);
  doc.roundedRect(M, y, W, 26, 2.5, 2.5, "FD");
  doc.setTextColor(...NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
  doc.text("How the cash saving is worked out", M + 4, y + 7);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...MID);
  const gap = r.agencyShiftCost - r.bankShiftCost;
  doc.text(`Your own bank ${fmt(Math.round(r.bankShiftCost))}/shift  ·  agency, same shift ${fmt(Math.round(r.agencyShiftCost))}/shift  ·  premium displaced ${fmt(Math.round(gap))}/shift`, M + 4, y + 13.5);
  doc.setFont("helvetica", "bold"); doc.setTextColor(...TEAL);
  const adminEq = ctx.includeAdmin && r.adminSaving > 0 ? ` + ${fmt(Math.round(r.adminSaving))} admin time` : "";
  doc.text(`${fmt(Math.round(r.agencySaving))} premium${adminEq}  -  ${fmt(Math.round(r.platformCost))} licence fee  =  ${noNet ? "-" + fmt(Math.abs(Math.round(r.netSaving))) : fmt(Math.round(r.netSaving))} net a year`, M + 4, y + 20.5);
  y += 26 + 7;

  // ── Disclaimer ──
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
  doc.text(doc.splitTextToSize("Indicative only. Cash saving = agency premium displaced when improved bank utilisation moves duties off agency; it excludes the cost of the bank shifts themselves (capacity, shown separately). 2026/27 NHS AfC midpoints; conservative, editable assumptions. Agency spend estimated from bank size (FY2025/26 national averages) unless supplied. Pilot-study figures are from 2 sites in a 4-trust programme, anonymised pending client sign-off, and are not solely attributable to the platform.", W), M, y);

  const orgSlug = lead.org ? "-" + lead.org.trim().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") : "";
  doc.save("smart-match-roi-estimate" + orgSlug + ".pdf");
}

export function LeadCapture({ r, leadContext }) {
  const [lead, setLead] = useState({ name: "", email: "", org: "", role: "" });
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Light fields on the navy card: near-white so they read as inputs, dark text.
  const inputStyle = {
    flex: "1 1 200px", minWidth: 150, padding: "11px 14px", borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.92)",
    color: C.text, fontSize: F.small, outline: "none", fontFamily: "inherit",
  };

  const submitLead = useCallback(async () => {
    if (!lead.name || !lead.email || sending) return;
    setSending(true);

    // 1. Generate + download the PDF summary (the value exchange).
    try { await generatePDF(r, lead, leadContext); } catch (e) { console.warn("PDF failed:", e); }

    // 2. Local backup (reviewable at #admin-leads; survives blocked networks).
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

    // 3. Fire-and-forget to HubSpot (EU1), context in the message field.
    if (HUBSPOT_PORTAL_ID && HUBSPOT_FORM_GUID) {
      try {
        const context = `Smart Match ROI (web) submission | Bank workers: ${fmtNum(leadContext.bankPool)} | Agency fill: ${leadContext.agencyFillRate}% | Team: ${leadContext.numManagers} | Confidence: ${leadContext.displacement}% (${leadContext.stance}) | Net annual saving: ${fmtK(r.netSaving)} | Hours/week released: ${fmtNum(r.timeSavedWeek)} | Est. agency spend: ${fmtK(r.agencySpend)}`;
        await fetch(`https://forms-${HUBSPOT_REGION}.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_GUID}`, {
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
            context: { pageUri: window.location.href, pageName: "Smart Match ROI Calculator (web)" },
            legalConsentOptions: { consent: { consentToProcess: true, text: "I agree to receive communications about my ROI estimate." } },
          }),
        });
      } catch (e) { console.warn("HubSpot submission failed:", e); }
    }

    setSending(false);
    setSubmitted(true);
  }, [lead, sending, r, leadContext]);

  if (submitted) {
    return <div style={{ marginBottom: 28, padding: "26px 28px", borderRadius: 18, background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 100%)`, border: "none", textAlign: "center" }}>
      <div style={{ fontSize: F.h3, fontWeight: 800, color: C.seafoam, marginBottom: 8 }}>Thanks, {lead.name.split(" ")[0]}, your report has downloaded.</div>
      <div style={{ fontSize: F.small, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>A Smart Match specialist can validate these figures against your organisation's own bank and agency rates. We'll be in touch.</div>
    </div>;
  }

  const ready = lead.name && lead.email;

  // Navy card on the light page — the Galen calculator's lead-gen treatment.
  return <div style={{ marginBottom: 28, padding: "clamp(18px, 3vw, 28px)", borderRadius: 18, background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 100%)`, border: "none" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
      <Icon name="mail" size={22} stroke={C.seafoam} />
      <h3 style={{ fontSize: F.h3, fontWeight: 800, margin: 0, color: "#fff" }}>Get this breakdown in your inbox</h3>
    </div>
    <p style={{ fontSize: F.small, color: "rgba(255,255,255,0.75)", marginTop: 6, marginBottom: 18 }}>Download a formatted summary ready to share with your team or board.</p>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
      <input type="text" placeholder="Your name *" aria-label="Your name (required)" autoComplete="name" value={lead.name} onChange={e => setLead(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
      <input type="email" placeholder="Work email *" aria-label="Work email (required)" autoComplete="email" value={lead.email} onChange={e => setLead(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
    </div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
      <input type="text" placeholder="Organisation" aria-label="Organisation" autoComplete="organization" value={lead.org} onChange={e => setLead(p => ({ ...p, org: e.target.value }))} style={inputStyle} />
      <select aria-label="Your role" value={lead.role} onChange={e => setLead(p => ({ ...p, role: e.target.value }))} style={{ ...inputStyle, color: lead.role ? C.text : C.textMuted }}>
        <option value="" style={{ color: C.text }}>Your role</option>
        {ROLE_OPTIONS.map(o => <option key={o} value={o} style={{ color: C.text }}>{o}</option>)}
      </select>
    </div>
    <button type="button" onClick={submitLead} disabled={!ready || sending} style={{
      padding: "14px 32px", background: ready ? "#fff" : "rgba(255,255,255,0.15)",
      color: ready ? C.navy : "rgba(255,255,255,0.4)",
      border: "none", borderRadius: 999, fontSize: F.body, fontWeight: 800,
      cursor: ready && !sending ? "pointer" : "not-allowed", fontFamily: "inherit",
    }}>{sending ? "Generating report..." : "Download PDF report"}</button>
    <p style={{ fontSize: F.tiny, color: "rgba(255,255,255,0.55)", marginTop: 12, marginBottom: 0 }}>Optional: the calculator is open to everyone. We may reach out to see if we can help with your programme; details are processed in line with the RLDatix privacy notice.</p>
  </div>;
}

/* ── #admin-leads: review + CSV-export locally stored submissions ─────────
   Ported from the Galen calculator's admin view. Records live only in this
   browser's localStorage (per device); HubSpot remains the system of record. */
export function AdminLeads({ onClose }) {
  const [records, setRecords] = useState(readSubmissions());

  const exportCSV = () => {
    const esc = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const rows = [["Timestamp", "Name", "Email", "Organisation", "Role", "Bank workers", "Agency fill %", "Team", "Confidence %", "Stance", "Net saving", "Hours/week"]];
    for (const rec of records) rows.push([
      rec.timestamp, rec.lead?.name, rec.lead?.email, rec.lead?.org, rec.lead?.role,
      rec.inputs?.bankPool, rec.inputs?.agencyFillRate, rec.inputs?.numManagers,
      rec.inputs?.displacement, rec.inputs?.stance, rec.results?.netSaving, rec.results?.timeSavedWeek,
    ]);
    const csv = rows.map(row => row.map(esc).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "smartmatch-roi-leads-" + new Date().toISOString().split("T")[0] + ".csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const clearAll = () => {
    if (!window.confirm("Permanently delete all " + records.length + " local lead records? This cannot be undone (HubSpot copies are unaffected).")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    setRecords([]);
  };

  const cell = { padding: "10px 12px", fontSize: F.tiny, color: C.textMid, borderBottom: `1px solid ${C.borderLight}`, textAlign: "left", whiteSpace: "nowrap" };

  return <div style={{ maxWidth: 1000, margin: "0 auto", padding: "clamp(20px, 4vw, 48px)" }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
      <div>
        <div style={{ fontSize: F.tiny, fontWeight: 700, color: C.accent, letterSpacing: 3, textTransform: "uppercase" }}>Admin · local records</div>
        <h2 style={{ fontSize: F.h2, fontWeight: 800, color: C.text, margin: "4px 0 0" }}>Lead form submissions ({records.length})</h2>
        <p style={{ fontSize: F.tiny, color: C.textMuted, marginTop: 6 }}>Stored in this browser only, as a backup; HubSpot holds the canonical copies. Remove <code>#admin-leads</code> from the URL to return.</p>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={exportCSV} disabled={!records.length} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: records.length ? C.accent : C.border, color: records.length ? "#fff" : C.textMuted, fontSize: F.tiny, fontWeight: 700, cursor: records.length ? "pointer" : "default", fontFamily: "inherit" }}>Export CSV</button>
        <button onClick={clearAll} disabled={!records.length} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: records.length ? C.textMid : C.textMuted, fontSize: F.tiny, fontWeight: 600, cursor: records.length ? "pointer" : "default", fontFamily: "inherit" }}>Clear</button>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.textMid, fontSize: F.tiny, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
      </div>
    </div>
    {!records.length ? (
      <div style={{ padding: 48, textAlign: "center", background: C.surface, borderRadius: 14, border: `1px dashed ${C.border}`, color: C.textMuted, fontSize: F.small }}>
        No submissions yet. Records appear here as users complete the lead form in this browser.
      </div>
    ) : (
      <div style={{ overflowX: "auto", background: C.surface, borderRadius: 14, border: `1px solid ${C.borderLight}` }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>{["When", "Name", "Email", "Organisation", "Role", "Net saving", "Hrs/wk"].map(h => <th key={h} style={{ ...cell, color: C.textMuted, fontWeight: 700 }}>{h}</th>)}</tr></thead>
          <tbody>
            {records.map((rec, i) => <tr key={i}>
              <td style={cell}>{new Date(rec.timestamp).toLocaleString("en-GB")}</td>
              <td style={{ ...cell, color: C.text, fontWeight: 600 }}>{rec.lead?.name || "-"}</td>
              <td style={cell}>{rec.lead?.email || "-"}</td>
              <td style={cell}>{rec.lead?.org || "-"}</td>
              <td style={cell}>{rec.lead?.role || "-"}</td>
              <td style={{ ...cell, color: C.accent, fontWeight: 700 }}>{rec.results?.netSaving != null ? fmtK(rec.results.netSaving) : "-"}</td>
              <td style={cell}>{rec.results?.timeSavedWeek != null ? fmtNum(rec.results.timeSavedWeek) : "-"}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    )}
  </div>;
}
