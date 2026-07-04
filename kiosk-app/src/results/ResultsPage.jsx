import React, { useState, useRef, useEffect } from 'react';
import { C, F, fmt, fmtK, fmtNum } from '../theme';
import { Icon } from '../components/Icons';
import { Card, InfoTip } from '../components';
import { stance, ADMIN_HRS_PER_DAY, ADMIN_WORKING_DAYS, ADMIN_LOADED_HOURLY } from '../calc/engine';

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

// One of the KPI tiles.
function KpiTile({ label, value, sub, iconKey, tip }) {
  return <div style={{ padding: "24px 22px", background: C.surface, borderRadius: 18, border: `1px solid ${C.accent}25` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <Icon name={iconKey} size={26} stroke={C.accent} />
      <span style={{ fontSize: F.tiny, fontWeight: 600, color: C.textMuted }}>{label}</span>
      {tip && <InfoTip text={tip} />}
    </div>
    <div style={{ fontSize: F.h1, fontWeight: 800, color: C.accent, marginBottom: 4 }}>{value}</div>
    {sub && <div style={{ fontSize: F.tiny, color: C.textMid }}>{sub}</div>}
  </div>;
}

export function ResultsPage({ r, displacement, chosen, setDisplacement, onAdjust, onStartOver }) {
  if (!r) return null;
  const st = stance(displacement);
  const fmtPayback = m => m == null ? "n/a" : `${Math.round(m * 365 / 12).toLocaleString("en-GB")} days`;
  const fmtPct1 = v => `${(Math.round(v * 10) / 10).toLocaleString("en-GB")}%`;
  const fmtMultiple = m => m == null ? "n/a" : (m >= 10 ? Math.round(m) : Math.round(m * 10) / 10) + "×";
  // At a very small bank / low agency reliance the licence fee can exceed the modelled
  // premium, so net saving goes <= 0. Reframe rather than show a negative headline.
  const noNet = r.netSaving <= 0;
  // Basis note, shown as an info tooltip on the headline (was an inline caption).
  const basisNote = `This is the agency premium you stop paying by filling more shifts from your own bank instead of agency${r.adminSaving > 0 ? `, plus ${fmtK(r.adminSaving)} of admin time` : ""}, shown as an annual figure after the ${fmt(r.platformCost)}/yr licence fee.`;

  return <div style={{ animation: "rfade .5s ease-out" }}>
    <style>{`@keyframes rfade { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
      @keyframes glow { 0%,100% { text-shadow: 0 0 30px rgba(0,212,170,0.25); } 50% { text-shadow: 0 0 56px rgba(0,212,170,0.5); } }`}</style>

    {/* Eyebrow */}
    <div style={{ textAlign: "center", padding: "14px 0 4px" }}>
      <div style={{ fontSize: F.tiny, fontWeight: 700, color: C.textMuted, letterSpacing: 4, textTransform: "uppercase" }}>Smart Match · Indicative ROI</div>
    </div>

    {/* Two co-headlines, side by side */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 14 }}>
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
        <div style={{ fontSize: F.h3, color: C.textMid, marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>Potential annual cash saving <InfoTip text={basisNote} /></div>
        <div style={{ fontSize: F.small, color: C.textMuted, marginTop: 8, lineHeight: 1.5, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>What you could save each year by filling more shifts from your bank instead of agency, the agency premium you stop paying.</div>
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

    {/* Confidence / modelling stance — set upfront, reconfigurable here at the top of the report */}
    <Card style={{ marginBottom: 28 }}>
      <CTitle iconKey="search">Confidence level</CTitle>
      <div style={{ fontSize: F.small, color: C.textMid, lineHeight: 1.6, marginBottom: 18 }}>
        You set this earlier; adjust it here and the cash figures recompute live. It is how much of today's agency activity you assume better bank utilisation moves onto your own bank.
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: F.body, fontWeight: 600, color: C.textMid }}>Agency work moved to your bank</span>
        <span style={{ fontSize: F.h1, fontWeight: 800, color: C.accent }}>{displacement}%</span>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[["Conservative", 13], ["Expected", 26], ["Optimistic", 50]].map(([lbl, v]) => {
          const on = chosen && displacement === v;
          return <button key={v} onClick={() => setDisplacement(v)} style={{
            flex: 1, padding: "16px 8px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
            border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.accent : C.surface2,
            color: on ? "#fff" : C.textMid, fontWeight: 700, fontSize: F.small, transition: "all .15s",
            display: "flex", flexDirection: "column", gap: 3, alignItems: "center"
          }}>{lbl}<span style={{ fontSize: F.tiny, fontWeight: 600, opacity: 0.8 }}>{v}%</span></button>;
        })}
      </div>
      <input type="range" aria-label="Agency work moved to your bank (%)" min={13} max={50} step={1} value={displacement} onChange={e => setDisplacement(Number(e.target.value))} style={{ width: "100%", cursor: "pointer", accentColor: C.accent }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: F.tiny, color: C.textMuted, marginTop: 8 }}>
        <span>13% · conservative</span><span>26% · expected</span><span>50% · optimistic</span>
      </div>
      {chosen && <div style={{ marginTop: 16, padding: "16px 20px", background: C.accentSoft, borderRadius: 14, border: `1px solid ${C.accent}30` }}>
        <div style={{ fontSize: F.body, fontWeight: 800, color: C.accent, marginBottom: 6 }}>{st.key}</div>
        <div style={{ fontSize: F.small, color: C.textMid, lineHeight: 1.6 }}>{st.note}</div>
      </div>}
    </Card>

    {/* Guardrail */}
    {r.exceedsSpend && <div style={{ marginBottom: 14, padding: "14px 20px", background: C.accentSoft, border: `1px solid ${C.accent}`, borderRadius: 14, fontSize: F.small, color: C.text, lineHeight: 1.5 }}>
      <strong>Check your inputs.</strong> The modelled saving exceeds your estimated agency spend. Try a lower displacement or a lower agency fill rate.
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
        { iconKey: "pound", label: "Agency premium avoided", value: <AnimVal value={r.agencySaving} format={fmtK} />, sub: "agency vs bank gap, before licence" },
        ...(r.adminSaving > 0 ? [{ iconKey: "clock", label: "Admin time saving", value: <AnimVal value={r.adminSaving} format={fmtK} />, sub: "temp staffing team time, valued", tip: adminTip }] : []),
        { iconKey: "calendar", label: "Payback", value: noNet ? "n/a" : fmtPayback(r.paybackMonths), sub: "to recover the annual licence fee" },
        { iconKey: "check", label: "Return", value: (r.roiMultiple == null || noNet) ? "n/a" : <>{r.implausibleRoi ? "⚠ " : ""}<AnimVal value={r.roiMultiple} format={fmtMultiple} /></>, sub: "net saving ÷ licence fee, per year" },
      ];
      const odd = tiles.length % 2 === 1;
      return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
        {tiles.map((t, i) => <div key={i} style={odd && i === tiles.length - 1 ? { gridColumn: "1 / -1" } : undefined}>
          <KpiTile iconKey={t.iconKey} label={t.label} value={t.value} sub={t.sub} tip={t.tip} />
        </div>)}
      </div>;
    })()}

    {/* Annual-figures clarifier: these are steady-state, per-year numbers, not one-offs. */}
    {!noNet && <div style={{ textAlign: "center", fontSize: F.small, color: C.textMuted, lineHeight: 1.5, margin: "0 auto 28px", maxWidth: 760 }}>
      These are annual figures: the saving recurs every year Smart Match is in use.
    </div>}

    {/* How the cash saving is worked out — bank vs agency rate vs the premium gap (the defensible basis) */}
    <Card style={{ marginBottom: 28 }}>
      <CTitle iconKey="pound">How the cash saving is worked out</CTitle>
      <div style={{ fontSize: F.small, color: C.text, lineHeight: 1.7, marginBottom: 14 }}>
        We only ever bank the <strong style={{ color: C.accent }}>gap</strong> between an agency shift and the same shift on your own bank, never the whole agency cost, and only on the shifts you realistically move to bank.
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
          <Row label="Your own bank (blended national rate)" value={rate(r.bankShiftCost, bankHr)} />
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
        Bank rate = 2026/27 AfC blended midpoint, loaded with on-cost. Premium defaults to the official ~20% House of Commons Library average, deliberately conservative and contested at shift level (nursing ~35–50%, medics ~80–120%).{r.agencySpend != null ? <> Your agency spend is modelled from your bank pool and fill rate ({fmtK(r.agencySpend)}); for a figure built on your real spend, use the detailed web calculator.</> : ""}
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
    <Card style={{ marginBottom: 28, borderLeft: `3px solid ${C.amber}` }}>
      <CTitle iconKey="calendar" color={C.amber}>Capacity and wider value: not a cash saving</CTitle>
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
        <li>The pilot evidence is a small <strong style={{ color: C.text }}>two-site vendor sample within a four-trust programme</strong>, anonymised here as "a community trust" and "an acute trust". Results are not solely attributable to Smart Match.</li>
        <li>The <strong style={{ color: C.text }}>agency premium is contested</strong> at shift level; the model is most credible when run on your own trust's rates.</li>
        <li>Better bank <strong style={{ color: C.text }}>utilisation is the mechanism</strong>; the cash is the agency premium displaced. Capacity gained is coverage, not cash, and is reported separately above.</li>
      </ul>
      <div style={{ marginTop: 16, padding: "14px 18px", background: C.surface2, borderRadius: 12, fontSize: F.small, color: C.textMid, lineHeight: 1.65, border: `1px solid ${C.borderLight}` }}>
        <strong style={{ color: C.text }}>Strategically</strong>, releasing cash and capacity from temporary staffing supports the <strong style={{ color: C.text }}>NHS 10 Year Plan</strong> and Workforce Paper, and the <strong style={{ color: C.text }}>Staff Health &amp; Wellbeing CQUIN</strong>.
      </div>
    </Card>

    {/* Methodology */}
    <Card style={{ marginBottom: 28 }}>
      <Collapsible title="How we calculated this">
        <div style={{ fontSize: F.small, color: C.textMid, lineHeight: 1.75 }}>
          <p style={{ marginTop: 0 }}>
            <strong style={{ color: C.text }}>The cash saving</strong> is the agency premium displaced when improved utilisation moves temp duties off agency onto your own bank:
          </p>
          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: F.small, color: C.text, background: C.bg, padding: "12px 14px", borderRadius: 10, marginBottom: 14, border: `1px solid ${C.borderLight}` }}>
            agency_saving = displaced_duties × bank_shift_cost × premium
          </div>
          <p>
            Filling a bank shift is itself <strong style={{ color: C.text }}>expenditure</strong>; only the gap between an agency shift and the equivalent bank shift (the premium) is cash released. The premium here is <strong style={{ color: C.text }}>20%</strong>, a contested figure at shift level; the model is most credible on your own trust's rates.
          </p>
          <p>
            <strong style={{ color: C.text }}>Admin time saving</strong> uses a per-person model: each member of the temporary staffing team recovers a conservative <strong style={{ color: C.text }}>1 hour/day</strong> across 225 working days, valued at a loaded £18/hour (the client's 2.5 hours/day would be an optimistic upper bound). The same hours feed the "time saved per week" co-headline.
          </p>
          <p>
            Pay assumptions use <strong style={{ color: C.text }}>2026/27 NHS Agenda for Change midpoints</strong> (+3.3%; {r.rows ? "per staff group" : "a band-mix weighted blended bank pay"}), 1,957.5 AfC hours/year, 8-hour shifts and a 20% bank on-cost (on-cost affects duty counts, not the cash headline). Defaults are deliberately conservative.
          </p>
          <p style={{ marginBottom: 0 }}>
            Outputs are <strong style={{ color: C.text }}>indicative</strong> and are recomputed live as you move the modelling-stance slider above.
          </p>
        </div>
      </Collapsible>
    </Card>

    {/* Actions */}
    <div style={{ display: "flex", gap: 16, justifyContent: "center", padding: "8px 0 32px" }}>
      <button onClick={onAdjust} style={{
        padding: "22px 44px", borderRadius: 18, border: `2px solid ${C.accent}`,
        background: "transparent", color: C.accent, fontSize: F.body, fontWeight: 700,
        cursor: "pointer", fontFamily: "inherit"
      }}>← Adjust inputs</button>
      <button onClick={onStartOver} style={{
        padding: "22px 44px", borderRadius: 18, border: `1px solid ${C.border}`,
        background: C.surface, color: C.textMid, fontSize: F.body, fontWeight: 600,
        cursor: "pointer", fontFamily: "inherit"
      }}>Start over ↻</button>
    </div>
  </div>;
}
