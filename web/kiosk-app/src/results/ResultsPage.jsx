import React, { useState, useRef, useEffect } from 'react';
import { C, F, fmt, fmtK, fmtNum } from '../theme';
import { Icon } from '../components/Icons';
import { Card, InfoTip } from '../components';
import { LeadCapture } from '../components/LeadCapture';
import { stance, ADMIN_HRS_PER_DAY, ADMIN_WORKING_DAYS, ADMIN_LOADED_HOURLY, BANK_ONCOST, AGENCY_SPEND_PER_REGISTERED_BANK_WORKER_GBP } from '../calc/engine';

// Responsive grid: side-by-side where there's room, stacked on narrow screens.
const fluidGrid = (min) => ({ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))` });

/**
 * Animates a numeric value to a target over `duration` ms with ease-out cubic.
 * Animates from the CURRENTLY displayed value to the new target, so when the
 * modelling-stance slider moves the figures roll smoothly up/down rather than
 * snapping back to zero first.
 */
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const valRef = useRef(0);
  useEffect(() => {
    if (target == null) return;
    const from = valRef.current;
    const startTime = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      const next = from + (target - from) * ease;
      setVal(next);
      valRef.current = next;
      if (t < 1) requestAnimationFrame(tick);
      else { setVal(target); valRef.current = target; }
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return { val };
}

// Animated value with a custom formatter (receives the live animated number).
function AnimVal({ value, format }) {
  const { val } = useCountUp(value, 900);
  return <span style={{ display: "inline-block" }}>{format ? format(val) : Math.round(val)}</span>;
}

function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return <div>
    <div role="button" tabIndex={0} aria-expanded={open}
      onClick={() => setOpen(!open)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(!open); } }}
      style={{ fontSize: F.body, color: C.accent, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, outlineOffset: 4 }}>
      <span style={{ transition: "transform .2s", transform: open ? "rotate(90deg)" : "none" }}>▶</span> {title}
    </div>
    {open && <div style={{ marginTop: 14 }}>{children}</div>}
  </div>;
}

function CTitle({ iconKey, children, color }) {
  return <div style={{ fontSize: F.body, fontWeight: 700, color: C.textMid, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
    {iconKey && <Icon name={iconKey} size={24} stroke={color || C.accent} />} {children}
  </div>;
}

function Row({ label, value, accent }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "10px 0", borderBottom: `1px solid ${C.border}`, gap: 16 }}>
    <span style={{ fontSize: F.small, color: C.textMid }}>{label}</span>
    <span style={{ fontSize: F.body, fontWeight: accent ? 800 : 600, color: accent ? C.accent : C.text, textAlign: "right", whiteSpace: "nowrap" }}>{value}</span>
  </div>;
}

// One of the KPI tiles (hover lift via the .kpi-tile class in the page styles).
function KpiTile({ label, value, sub, iconKey, tip }) {
  return <div className="kpi-tile" style={{ padding: "24px 22px", background: C.surface, borderRadius: 18, border: `1px solid ${C.accent}25` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <Icon name={iconKey} size={26} stroke={C.accent} />
      <span style={{ fontSize: F.tiny, fontWeight: 600, color: C.textMuted }}>{label}</span>
      {tip && <InfoTip text={tip} />}
    </div>
    <div style={{ fontSize: F.h1, fontWeight: 800, color: C.accent, marginBottom: 4 }}>{value}</div>
    {sub && <div style={{ fontSize: F.tiny, color: C.textMid }}>{sub}</div>}
  </div>;
}

export function ResultsPage({ r, displacement, chosen, setDisplacement, onAdjust, onStartOver, leadContext }) {
  if (!r) return null;
  const st = stance(displacement);
  const fmtPayback = m => m == null ? "n/a" : `${Math.round(m * 365 / 12).toLocaleString("en-GB")} days`;
  const fmtPct1 = v => `${(Math.round(v * 10) / 10).toLocaleString("en-GB")}%`;
  const fmtMultiple = m => m == null ? "n/a" : (m >= 10 ? Math.round(m) : Math.round(m * 10) / 10) + "×";
  // At a very small bank / low agency reliance the licence fee can exceed the modelled
  // premium, so net saving goes <= 0. Reframe rather than show a negative headline.
  const noNet = r.netSaving <= 0;

  return <div style={{ animation: "rfade .5s ease-out" }}>
    <style>{`@keyframes rfade { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
      @keyframes glow { 0%,100% { text-shadow: 0 0 26px rgba(52,222,194,0.35); } 50% { text-shadow: 0 0 46px rgba(52,222,194,0.6); } }
      .kpi-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:14px; }
      .kpi-grid-4 { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; margin-bottom:14px; }
      @media (max-width:640px) { .kpi-grid-3, .kpi-grid-4 { grid-template-columns:1fr; } }
      .kpi-tile { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
      .kpi-tile:hover { transform: translateY(-4px); box-shadow: 0 10px 28px rgba(15,65,70,0.14); border-color: ${C.seafoam}; }
      @media (prefers-reduced-motion: reduce) { .kpi-tile, .kpi-tile:hover { transition:none; transform:none; } }`}</style>

    {/* Eyebrow */}
    <div style={{ textAlign: "center", padding: "14px 0 4px" }}>
      <div style={{ fontSize: F.tiny, fontWeight: 700, color: C.textMuted, letterSpacing: 4, textTransform: "uppercase" }}>Smart Match · Indicative ROI</div>
    </div>

    {/* Confidence level — a slim strip at the top of the report; adjusting it
        recomputes every figure live. Full stance context lives in the (i). */}
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 16px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 18 }}>
      <span style={{ fontSize: F.tiny, fontWeight: 700, color: C.textMid, display: "inline-flex", alignItems: "center", gap: 8 }}>
        Confidence level
        <InfoTip text={`${st.key}: ${st.note} Adjust it here and every figure recomputes live.`} />
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        {[["Conservative", 13], ["Moderate", 26], ["Optimistic", 50]].map(([lbl, v]) => {
          const on = chosen && displacement === v;
          return <button key={v} onClick={() => setDisplacement(v)} style={{
            padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
            border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.accent : C.surface2,
            color: on ? "#fff" : C.textMid, fontWeight: 700, fontSize: F.tiny, transition: "all .15s",
          }}>{lbl}</button>;
        })}
      </div>
      <input type="range" aria-label="Agency work moved to your bank (%)" min={13} max={50} step={1} value={displacement} onChange={e => setDisplacement(Number(e.target.value))} style={{ flex: "1 1 120px", minWidth: 110, cursor: "pointer", accentColor: C.accent }} />
      <span style={{ fontSize: F.small, fontWeight: 800, color: C.accent, minWidth: 42, textAlign: "right" }}>{displacement}%</span>
    </div>

    {/* Two co-headlines, side by side (stacked on narrow screens) */}
    <div style={{ ...fluidGrid(320), gap: 18, marginBottom: 14 }}>
      {noNet ? (
      <div style={{ textAlign: "center", padding: "26px 22px", background: C.surface, borderRadius: 22, border: `1px solid ${C.amber}55`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: F.h1, fontWeight: 800, color: C.amber, lineHeight: 1.1 }}>No net cash saving</div>
        <div style={{ fontSize: F.h3, color: C.textMid, marginTop: 8 }}>at this scale</div>
        <div style={{ fontSize: F.small, color: C.textMuted, marginTop: 12, lineHeight: 1.55 }}>The <strong style={{ color: C.textMid }}>{fmt(r.platformCost)}/yr</strong> licence fee is larger than the <strong style={{ color: C.textMid }}>{fmtK(r.agencySaving)}</strong> agency premium you'd displace here. The value at this size is the released capacity and time below; the cash case grows with a larger bank or higher agency reliance.</div>
      </div>
      ) : (
      <div style={{ textAlign: "center", padding: "26px 18px", background: C.surface, borderRadius: 22, border: `1px solid ${C.accent}30` }}>
        <div style={{ fontSize: F.hero, fontWeight: 800, color: C.accent, lineHeight: 1, letterSpacing: "-3px", animation: "glow 3s ease-in-out infinite" }}>
          <AnimVal value={r.netSaving} format={fmtK} />
        </div>
        <div style={{ fontSize: F.h3, color: C.textMid, marginTop: 14 }}>Potential annual cash saving</div>
        <div style={{ fontSize: F.small, color: C.textMuted, marginTop: 8, lineHeight: 1.5, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>What you could save each year by filling more shifts from your own bank instead of agency{r.adminSaving > 0 ? `, plus ${fmtK(r.adminSaving)} of admin time` : ""}, shown as an annual figure after the {fmt(r.platformCost)}/yr licence fee.</div>
      </div>
      )}
      <div style={{ textAlign: "center", padding: "26px 18px", background: C.surface, borderRadius: 22, border: `1px solid ${C.accent}30` }}>
        <div style={{ fontSize: F.hero, fontWeight: 800, color: C.accent, lineHeight: 1, letterSpacing: "-3px" }}>
          <AnimVal value={r.timeSavedWeek} format={v => fmtNum(v)} />
        </div>
        <div style={{ fontSize: F.h3, color: C.textMid, marginTop: 14 }}>hours released each week</div>
        <div style={{ fontSize: F.small, color: C.textMuted, marginTop: 8, lineHeight: 1.5, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>Time your temporary staffing team gets back each week as Smart Match automates shift booking and matching, scaled to your team's size.</div>
      </div>
    </div>

    {/* Guardrail */}
    {r.exceedsSpend && <div style={{ marginBottom: 14, padding: "14px 20px", background: C.accentSoft, border: `1px solid ${C.accent}`, borderRadius: 14, fontSize: F.small, color: C.text, lineHeight: 1.5 }}>
      <strong>Check your inputs.</strong> The modelled saving exceeds your agency spend. Try a lower premium or a lower confidence level.
    </div>}
    {r.adminOnly && !noNet && <div style={{ marginBottom: 14, padding: "14px 20px", background: C.accentSoft, border: `1px solid ${C.accent}`, borderRadius: 14, fontSize: F.small, color: C.text, lineHeight: 1.5 }}>
      <strong>Admin time only.</strong> No agency premium saving is modelled (agency spend is zero), so this figure is the admin-time value on its own.
    </div>}

    {/* KPI tiles — the Admin time tile only shows when admin time is toggled on (adminSaving > 0) */}
    {(() => {
      // Admin saving = team × hrs/day × working days × loaded hourly rate. teamSize is
      // recovered from the always-computed weekly hours (team × hrs/day × 5).
      const teamSize = Math.round(r.timeSavedWeek / (ADMIN_HRS_PER_DAY * 5));
      const adminTip = `${teamSize} ${teamSize === 1 ? "person" : "people"} × ${ADMIN_HRS_PER_DAY} h/day × ${ADMIN_WORKING_DAYS} working days × £${ADMIN_LOADED_HOURLY}/h (loaded) = ${fmt(r.adminSaving)}`;
      const tiles = [
        { iconKey: "pound", label: "Agency premium avoided", value: <AnimVal value={r.agencySaving} format={fmtK} />, sub: "agency vs bank gap, excluding licence fee" },
        ...(r.adminSaving > 0 ? [{ iconKey: "clock", label: "Admin time saving", value: <AnimVal value={r.adminSaving} format={fmtK} />, sub: "temp staffing team time, valued", tip: adminTip }] : []),
        { iconKey: "calendar", label: "Payback", value: noNet ? "n/a" : fmtPayback(r.paybackMonths), sub: "to recover the annual licence fee" },
        { iconKey: "check", label: "Return", value: (r.roiMultiple == null || noNet) ? "n/a" : <>{r.implausibleRoi ? "⚠ " : ""}<AnimVal value={r.roiMultiple} format={fmtMultiple} /></>, sub: "net saving ÷ licence fee, per year" },
      ];
      // 4 tiles (admin saving on) → 2×2; 3 tiles → one row of three. Stacks on phones.
      return <div className={tiles.length === 4 ? "kpi-grid-4" : "kpi-grid-3"}>
        {tiles.map((t, i) => <KpiTile key={i} iconKey={t.iconKey} label={t.label} value={t.value} sub={t.sub} tip={t.tip} />)}
      </div>;
    })()}

    {/* Explains the ⚠ shown on the Return tile when the multiple is implausibly high (>40×). */}
    {r.implausibleRoi && !noNet && <div style={{ marginBottom: 14, padding: "14px 20px", background: C.surface, border: `1px solid ${C.amber}66`, borderRadius: 14, fontSize: F.small, color: C.text, lineHeight: 1.5 }}>
      <strong style={{ color: C.amber }}>⚠ Unusually high return.</strong> At these inputs the modelled saving is more than 40 times the licence fee, which usually reflects a very large bank or agency book. Sense-check against your organisation's real agency spend before quoting it.
    </div>}

    {/* Annual-figures clarifier: these are steady-state, per-year numbers, not one-offs. */}
    {!noNet && <div style={{ textAlign: "center", fontSize: F.small, color: C.textMuted, lineHeight: 1.5, margin: "0 auto 28px", maxWidth: 760 }}>
      These are annual figures: the saving recurs every year Smart Match is in use.
    </div>}

    {/* Lead capture — straight after the headline tiles, while the numbers land.
        Optional; results are never gated behind it. Ported from the Galen calculator. */}
    <LeadCapture r={r} leadContext={leadContext} />

    {/* How the cash saving is worked out — bank vs agency rate vs the premium gap (the defensible basis) */}
    <Card style={{ marginBottom: 28, borderLeft: `3px solid ${C.accentMid}` }}>
      <CTitle iconKey="pound" color={C.accentMid}>How the cash saving is worked out</CTitle>
      <div style={{ fontSize: F.small, color: C.text, lineHeight: 1.7, marginBottom: 14 }}>
        The saving is the <strong style={{ color: C.accent }}>extra</strong> an agency charges for a shift, over what the same shift would cost on your own bank: the premium, not the whole agency bill. We only count it on the shifts you can realistically move from agency to your bank.
      </div>
      {(() => {
        const hrs = r.shiftHours || 8;
        const money2 = v => "£" + (v || 0).toFixed(2);
        const bankHr = r.bankShiftCost / hrs, agencyHr = r.agencyShiftCost / hrs;
        const gapShift = r.agencyShiftCost - r.bankShiftCost, gapHr = gapShift / hrs;
        // Round each term first so the displayed premium - licence = net equation adds up exactly.
        const grossR = Math.round(r.agencySaving), adminR = Math.round(r.adminSaving || 0), licR = Math.round(r.platformCost), netR = grossR + adminR - licR;
        const rate = (shift, hr) => <>{fmt(shift)}<span style={{ fontSize: F.tiny, color: C.textMuted, fontWeight: 400 }}> /shift · {money2(hr)}/hr</span></>;
        return <>
          <Row label={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>Your own bank (blended rate, all-in) <InfoTip text={`Already includes a ${Math.round(BANK_ONCOST * 100)}% employer on-cost (employer NI and pension) on top of raw Agenda for Change pay, below the full ~30% NHS rate because bank-only workers often opt out of the pension. This is the true cost of a bank shift; the saving is the gap between it and the agency rate, so on-costs are counted once, never twice.`} /></span>} value={rate(r.bankShiftCost, bankHr)} />
          <Row label={r.perGroupPremium ? "Agency, same shift (your per-group premiums)" : `Agency, same shift (at ${r.premium}% premium)`} value={rate(r.agencyShiftCost, agencyHr)} />
          <Row label="Premium displaced = the saving" value={rate(gapShift, gapHr)} accent />
          <div style={{ marginTop: 14, fontSize: F.small, color: C.textMid, lineHeight: 1.6 }}>
            <strong style={{ color: C.text }}>{money2(gapHr)}/hr</strong> on each of <strong style={{ color: C.text }}>{fmtNum(r.displaced)}</strong> shifts moved to bank = <strong style={{ color: C.text }}>{fmt(r.agencySaving)}</strong> gross a year.
          </div>
          {r.platformCost > 0 && <div style={{ marginTop: 12, padding: "14px 18px", background: C.accentSoft, borderRadius: 12, border: `1px solid ${C.accent}30`, fontSize: F.small, color: C.textMid, lineHeight: 1.7 }}>
            <strong style={{ color: C.text }}>{fmt(grossR)}</strong> premium{adminR > 0 ? <> + <strong style={{ color: C.text }}>{fmt(adminR)}</strong> admin time</> : ""} − <strong style={{ color: C.text }}>{fmt(licR)}</strong> licence fee = <strong style={{ color: netR > 0 ? C.accent : C.amber }}>{netR >= 0 ? fmt(netR) : "−" + fmt(-netR)}</strong> net{netR > 0 ? ", the headline saving shown at the top." : ", so the licence fee is larger than the premium at these inputs."}
          </div>}
        </>;
      })()}
      <div style={{ marginTop: 14, fontSize: F.tiny, color: C.textMuted, fontStyle: "italic", lineHeight: 1.6 }}>
        Bank rate = 2026/27 AfC blended midpoint, already including a {Math.round(BANK_ONCOST * 100)}% employer on-cost (employer NI and pension, below the full ~30% NHS rate because bank-only workers often opt out of the pension), so on-costs are counted once and never added on top. Premium defaults to ~20%, reflecting figures cited in House of Commons Library research, deliberately conservative and contested at shift level (nursing ~35-50%, medics ~80-120%).{r.agencySpend != null ? (leadContext && leadContext.agencySpend != null
          ? <> Agency spend is the annual figure you supplied, which anchors the saving.</>
          : <> Agency spend is estimated from your bank size using FY2025/26 national averages (~{fmt(AGENCY_SPEND_PER_REGISTERED_BANK_WORKER_GBP)} per registered bank worker), which anchors the saving.</>) : ""}
      </div>
    </Card>

    {/* Per-group breakdown (detailed model only, carries rows) */}
    {r.rows && <Card style={{ marginBottom: 28 }}>
      <CTitle iconKey="pound">Cash saving by staff group</CTitle>
      {(() => { const mx = Math.max(...r.rows.map(x => x.saving), 1); return r.rows.map(x => (
        <div key={x.id} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 12 }}>
            <span style={{ fontSize: F.small, color: C.textMid }}>{x.role}{r.perGroupPremium ? ` · ${x.premiumPct}% premium` : ""}</span>
            <span style={{ fontSize: F.body, fontWeight: 800, color: C.accent, whiteSpace: "nowrap" }}>{fmtK(x.saving)}</span>
          </div>
          <div style={{ height: 14, borderRadius: 7, background: C.surface2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: Math.round((x.saving / mx) * 100) + "%", background: `linear-gradient(90deg, ${C.accentMid}, ${C.accent})`, borderRadius: 7, transition: "width .6s ease" }} />
          </div>
        </div>
      )); })()}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
        <span style={{ fontSize: F.body, fontWeight: 700, color: C.textMid }}>Total agency premium displaced</span>
        <span style={{ fontSize: F.h3, fontWeight: 800, color: C.accent }}>{fmt(r.totSaving)}</span>
      </div>
      <div style={{ marginTop: 10, fontSize: F.tiny, color: C.textMuted }}>
        Anchored to {fmt(r.totSpend)} total agency spend across {r.rows.length} staff group{r.rows.length === 1 ? "" : "s"}{r.recruitSaving > 0 ? ` · incl. ${fmtK(r.recruitSaving)} recruitment waste recovered` : ""}.
      </div>
    </Card>}

    {r.regime && <Card style={{ marginBottom: 28 }}>
      <CTitle iconKey="search">Agency intensity: {r.agencyPctOfTurnover.toFixed(1)}% of turnover</CTitle>
      <div style={{ fontSize: F.small, color: C.textMid, lineHeight: 1.7 }}>
        {r.regime === "low" ? <>This is a <strong style={{ color: C.text }}>mature, low-agency</strong> model (under 1% of turnover): rate-arbitrage savings are small, so the stronger story is <strong style={{ color: C.text }}>admin time released, fill-rate improvement and bank-rate control</strong> rather than the cash premium.</> : r.regime === "high" ? <>This trust is <strong style={{ color: C.text }}>highly agency-reliant</strong> (over 4% of turnover): <strong style={{ color: C.text }}>the cash saving from displacing the agency premium dominates</strong>: the strongest rate-arbitrage case.</> : <>This is <strong style={{ color: C.text }}>typical</strong> agency reliance (1–4% of turnover): <strong style={{ color: C.text }}>the cash saving from the agency premium</strong> is the headline, with admin time a secondary benefit.</>} Displacement is applied to the <strong style={{ color: C.text }}>{Math.round((r.displaceableShare != null ? r.displaceableShare : 0.8) * 100)}% displaceable share</strong> only.
      </div>
    </Card>}

    {/* Capacity + wider value (merged): explicitly NOT a cash saving */}
    <Card style={{ marginBottom: 28, borderLeft: `3px solid ${C.blue}` }}>
      <CTitle iconKey="calendar" color={C.blue}>Capacity and wider value</CTitle>
      <div style={{ fontSize: F.small, color: C.textMid, lineHeight: 1.6, marginBottom: 16 }}>
        Filling more shifts from your own bank is real operational value: steadier rosters, better continuity of care and less last-minute reliance on agency. It is deliberately kept separate from the cash saving above and is never added to it.
      </div>
      <Row label="More shifts filled from your own bank each year (off agency)" value={<AnimVal value={r.displaced} format={fmtNum} />} />
      <Row label="Bank backfill cost (spend, not saving)" value={<AnimVal value={r.capacityValue} format={fmtK} />} />
      <Row label="Agency reliance reduced" value={<>{fmtPct1(r.fillNow)} → <span style={{ color: C.good, fontWeight: 800 }}>{fmtPct1(r.fillAfter)}</span></>} />
      <div style={{ marginTop: 16, fontSize: F.small, color: C.textMid, lineHeight: 1.7 }}>
        These figures capture cash savings only. Smart Match also supports safer staffing, better continuity of care and a fairer, more flexible experience for your bank workers, real benefits we've deliberately not put a pound figure on.
      </div>
    </Card>

    {/* Honest framing (mandatory) */}
    <Card style={{ marginBottom: 28, borderLeft: `3px solid ${C.amber}` }}>
      <CTitle iconKey="lightbulb" color={C.amber}>How to read these numbers</CTitle>
      <ul style={{ margin: 0, paddingLeft: 22, fontSize: F.small, color: C.textMid, lineHeight: 1.75 }}>
        <li>These figures are <strong style={{ color: C.text }}>indicative</strong>, not a guarantee or a quote.</li>
        <li>The evidence comes from a pilot study, a small <strong style={{ color: C.text }}>two-site vendor sample within a four-trust programme</strong>, anonymised here as "a community trust" and "an acute trust". Results are not solely attributable to Smart Match.</li>
        <li>The <strong style={{ color: C.text }}>agency premium is contested</strong> at shift level; the model is most credible when run on your own organisation's rates.</li>
        <li>Better bank <strong style={{ color: C.text }}>utilisation is the mechanism</strong>; the cash is the agency premium displaced. Capacity gained is coverage, not cash, and is reported separately above.</li>
      </ul>
      <div style={{ marginTop: 16, padding: "14px 18px", background: C.surface2, borderRadius: 12, fontSize: F.small, color: C.textMid, lineHeight: 1.65, border: `1px solid ${C.borderLight}` }}>
        <strong style={{ color: C.text }}>Strategically</strong>, releasing cash and capacity from temporary staffing supports the <strong style={{ color: C.text }}>NHS 10 Year Plan</strong> and Workforce Paper, and the <strong style={{ color: C.text }}>Staff Health &amp; Wellbeing CQUIN</strong>.
      </div>
    </Card>

    {/* Methodology */}
    <Card style={{ marginBottom: 28, borderLeft: `3px solid ${C.seafoam}` }}>
      <Collapsible title="How we calculated this">
        <div style={{ fontSize: F.small, color: C.textMid, lineHeight: 1.75 }}>
          <p style={{ marginTop: 0 }}>
            <strong style={{ color: C.text }}>The cash saving</strong> is the agency premium displaced when improved utilisation moves temp duties off agency onto your own bank:
          </p>
          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: F.small, color: C.text, background: C.bg, padding: "12px 14px", borderRadius: 10, marginBottom: 14, border: `1px solid ${C.borderLight}` }}>
            agency_saving = displaced_duties × bank_shift_cost × premium
          </div>
          <p>
            Filling a bank shift is itself <strong style={{ color: C.text }}>expenditure</strong>; only the gap between an agency shift and the equivalent bank shift (the premium) is cash released. The premium here is <strong style={{ color: C.text }}>20%</strong>, a contested figure at shift level; the model is most credible on your own organisation's rates.
          </p>
          <p>
            <strong style={{ color: C.text }}>Admin time saving</strong> uses a per-person model: each member of the temporary staffing team recovers a conservative <strong style={{ color: C.text }}>1 hour/day</strong> across 225 working days, valued at a loaded £18/hour (some teams report up to 2.5 hours/day; we deliberately use 1). The same hours feed the "time saved per week" co-headline.
          </p>
          <p>
            Pay assumptions use <strong style={{ color: C.text }}>2026/27 NHS Agenda for Change midpoints</strong> (+3.3%; {r.rows ? "per staff group" : "a band-mix weighted blended bank pay"}), 1,957.5 AfC hours/year, 8-hour shifts and a <strong style={{ color: C.text }}>{Math.round(BANK_ONCOST * 100)}% employer on-cost (employer NI and pension)</strong>, already included in the modelled bank shift costs and never added on top. Pay, hours and on-cost set the modelled shift counts, not the cash saving, which is anchored to agency spend, premium and confidence level.{r.rows ? "" : ` Agency spend is estimated at ~£${AGENCY_SPEND_PER_REGISTERED_BANK_WORKER_GBP.toLocaleString("en-GB")} per registered bank worker (FY2025/26), scaled from your bank size.`} Defaults are deliberately conservative.
          </p>
          <p style={{ marginBottom: 0 }}>
            Outputs are <strong style={{ color: C.text }}>indicative</strong> and are recomputed live as you adjust the confidence level above.
          </p>
        </div>
      </Collapsible>
    </Card>

    {/* Actions */}
    <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", padding: "8px 0 32px" }}>
      <button onClick={onAdjust} style={{
        padding: "14px 32px", borderRadius: 14, border: `2px solid ${C.accent}`,
        background: "transparent", color: C.accent, fontSize: F.body, fontWeight: 700,
        cursor: "pointer", fontFamily: "inherit"
      }}>← Adjust inputs</button>
      <button onClick={onStartOver} style={{
        padding: "14px 32px", borderRadius: 14, border: `1px solid ${C.border}`,
        background: C.surface, color: C.textMid, fontSize: F.body, fontWeight: 600,
        cursor: "pointer", fontFamily: "inherit"
      }}>Start over ↻</button>
    </div>
  </div>;
}
