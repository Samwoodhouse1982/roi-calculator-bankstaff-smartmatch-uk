import React, { useState, useCallback } from 'react';
import { C, F, fmtK, fmtNum } from '../theme';
import { Icon } from './Icons';
import { ROLE_OPTIONS, STORAGE_KEY, readSubmissions, clearSubmissions, submissionsCSV, submitLead as submitLeadCore } from '../lead/core';

/* ────────────────────────────────────────────────────────────────────────
   Lead capture, React view.

   Everything this form actually DOES (the HubSpot configuration and
   submission, the PDF report, the local backup) lives in ../lead/core.js,
   which the plain-JS build of the calculator shares verbatim. This file is
   only the markup and the field state, so the two builds cannot drift on
   the form GUID, the fields sent, or the report.
   ──────────────────────────────────────────────────────────────────────── */

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

  const onSubmit = useCallback(async () => {
    if (!lead.name || !lead.email || sending) return;
    setSending(true);
    await submitLeadCore(r, lead, leadContext);
    setSending(false);
    setSubmitted(true);
  }, [lead, sending, r, leadContext]);

  if (submitted) {
    return <div style={{ marginBottom: 28, padding: "26px 28px", borderRadius: 18, background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 100%)`, border: "none", textAlign: "center" }}>
      <div style={{ fontSize: F.h3, fontWeight: 800, color: C.seafoam, marginBottom: 8 }}>Thanks, {lead.name.split(" ")[0]}, your report has downloaded.</div>
      <div style={{ fontSize: F.small, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>An RLDatix BankStaff specialist can validate these figures against your organisation's own bank and agency rates. We'll be in touch.</div>
    </div>;
  }

  const ready = lead.name && lead.email;

  // Navy card on the light page — the house lead-gen treatment.
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
    <button type="button" onClick={onSubmit} disabled={!ready || sending} style={{
      padding: "14px 32px", background: ready ? "#fff" : "rgba(255,255,255,0.15)",
      color: ready ? C.navy : "rgba(255,255,255,0.4)",
      border: "none", borderRadius: 999, fontSize: F.body, fontWeight: 800,
      cursor: ready && !sending ? "pointer" : "not-allowed", fontFamily: "inherit",
    }}>{sending ? "Generating report..." : "Download PDF report"}</button>
    <p style={{ fontSize: F.tiny, color: "rgba(255,255,255,0.55)", marginTop: 12, marginBottom: 0 }}>By submitting your details, you agree to share your name and email address so we can reach out to see if we can help with your programme. Details are processed in line with RLDatix's privacy notice.</p>
  </div>;
}

/* ── #admin-leads: review + CSV-export locally stored submissions ─────────
   Records live only in this browser's localStorage (per device); HubSpot
   remains the system of record. */
export function AdminLeads({ onClose }) {
  const [records, setRecords] = useState(readSubmissions());

  const exportCSV = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([submissionsCSV(records)], { type: "text/csv" }));
    a.download = "smartmatch-roi-leads-" + new Date().toISOString().split("T")[0] + ".csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const clearAll = () => {
    if (!window.confirm("Permanently delete all " + records.length + " local lead records? This cannot be undone (HubSpot copies are unaffected).")) return;
    clearSubmissions();
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

export { STORAGE_KEY };
