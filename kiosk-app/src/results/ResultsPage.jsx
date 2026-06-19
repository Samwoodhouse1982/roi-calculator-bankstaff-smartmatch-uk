import React, { useState, useRef, useEffect } from 'react';
import { C, F, fmt, fmtK, fmtNum } from '../theme';
import { Icon } from '../components/Icons';
import { Card } from '../components';
import { stance } from '../calc/engine';

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
    <div onClick={() => setOpen(!open)} style={{ fontSize: F.body, color: C.accent, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
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

// One of the four KPI tiles.
function KpiTile({ label, value, sub, iconKey }) {
  return <div style={{ padding: "24px 22px", background: C.surface, borderRadius: 18, border: `1px solid ${C.accent}25` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <Icon name={iconKey} size={26} stroke={C.accent} />
      <span style={{ fontSize: F.tiny, fontWeight: 600, color: C.textMuted }}>{label}</span>
    </div>
    <div style={{ fontSize: F.h1, fontWeight: 800, color: C.accent, marginBottom: 4 }}>{value}</div>
    {sub && <div style={{ fontSize: F.tiny, color: C.textMid }}>{sub}</div>}
  </div>;
}

export function ResultsPage({ r, displacement, setDisplacement, onAdjust, onStartOver }) {
  if (!r) return null;
  const st = stance(displacement);
  const fmtMonths = m => m == null ? "—" : `${m.toFixed(1)} mo`;
  const fmtPct1 = v => `${(Math.round(v * 10) / 10).toLocaleString("en-GB")}%`;

  return <div style={{ animation: "rfade .5s ease-out" }}>
    <style>{`@keyframes rfade { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
      @keyframes glow { 0%,100% { text-shadow: 0 0 30px rgba(232,57,42,0.25); } 50% { text-shadow: 0 0 56px rgba(232,57,42,0.5); } }`}</style>

    {/* Eyebrow */}
    <div style={{ textAlign: "center", padding: "14px 0 4px" }}>
      <div style={{ fontSize: F.tiny, fontWeight: 700, color: C.textMuted, letterSpacing: 4, textTransform: "uppercase" }}>Smart Match · Indicative ROI</div>
    </div>

    {/* Two co-headlines, side by side */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 14 }}>
      <div style={{ textAlign: "center", padding: "26px 18px", background: C.surface, borderRadius: 22, border: `1px solid ${C.accent}30` }}>
        <div style={{ fontSize: F.hero, fontWeight: 800, color: C.accent, lineHeight: 1, letterSpacing: "-3px", animation: "glow 3s ease-in-out infinite" }}>
          <AnimVal value={r.netSaving} format={fmtK} />
        </div>
        <div style={{ fontSize: F.h3, color: C.textMid, marginTop: 14 }}>net cash saving / year</div>
      </div>
      <div style={{ textAlign: "center", padding: "26px 18px", background: C.surface, borderRadius: 22, border: `1px solid ${C.accent}30` }}>
        <div style={{ fontSize: F.hero, fontWeight: 800, color: C.accent, lineHeight: 1, letterSpacing: "-3px" }}>
          <AnimVal value={r.timeSavedWeek} format={v => fmtNum(v)} />
        </div>
        <div style={{ fontSize: F.h3, color: C.textMid, marginTop: 14 }}>hrs admin time saved / week</div>
      </div>
    </div>

    {/* Guardrail */}
    {r.exceedsSpend && <div style={{ marginBottom: 14, padding: "14px 20px", background: C.accentSoft, border: `1px solid ${C.accent}`, borderRadius: 14, fontSize: F.small, color: C.text, lineHeight: 1.5 }}>
      <strong>Check your inputs.</strong> The modelled saving exceeds your estimated agency spend — try a lower displacement or a lower agency fill rate.
    </div>}

    {/* Secondary row */}
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
      {[
        { label: "Payback", value: fmtMonths(r.paybackMonths) },
        { label: "Gross benefit", value: <AnimVal value={r.grossBenefit} format={fmtK} /> },
        { label: "ROI (net)", value: <>{r.implausibleRoi ? "⚠ " : ""}<AnimVal value={r.roiPct} format={v => `${fmtNum(v)}%`} /></> },
        { label: "Agency premium displaced", value: <AnimVal value={r.agencySaving} format={fmtK} /> },
      ].map((s, i) => <div key={i} style={{ flex: "1 1 220px", padding: "16px 20px", background: C.surface2, borderRadius: 14, border: `1px solid ${C.borderLight}` }}>
        <div style={{ fontSize: F.tiny, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
        <div style={{ fontSize: F.h2, fontWeight: 800, color: C.text }}>{s.value}</div>
      </div>)}
    </div>

    {/* KPI tiles */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
      <KpiTile iconKey="dollar" label="Agency premium displaced" value={<AnimVal value={r.agencySaving} format={fmtK} />} sub="hard cash — agency vs bank gap" />
      <KpiTile iconKey="clock" label="Admin time saving" value={<AnimVal value={r.adminSaving} format={fmtK} />} sub="roster team time, valued" />
      <KpiTile iconKey="calendar" label="Payback" value={fmtMonths(r.paybackMonths)} sub="platform cost ÷ monthly benefit" />
      <KpiTile iconKey="check" label="Net saving" value={<AnimVal value={r.netSaving} format={fmtK} />} sub="after platform cost" />
    </div>

    {/* Modelling-stance slider (live) */}
    <Card style={{ marginBottom: 28 }}>
      <CTitle iconKey="search">Modelling stance</CTitle>
      <div style={{ fontSize: F.small, color: C.textMid, lineHeight: 1.6, marginBottom: 18 }}>
        How much of today's agency activity do you assume better bank utilisation moves onto your own bank? Drag to flex the model and watch every figure recompute.
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: F.body, fontWeight: 600, color: C.textMid }}>Agency displacement</span>
        <span style={{ fontSize: F.h1, fontWeight: 800, color: C.accent }}>{displacement}%</span>
      </div>
      <input type="range" min={5} max={30} step={1} value={displacement} onChange={e => setDisplacement(Number(e.target.value))} style={{ width: "100%", cursor: "pointer", accentColor: C.accent }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: F.tiny, color: C.textMuted, marginTop: 8 }}>
        <span>Conservative</span><span>Moderate</span><span>Optimistic</span>
      </div>
      <div style={{ marginTop: 16, padding: "16px 20px", background: C.accentSoft, borderRadius: 14, border: `1px solid ${C.accent}30` }}>
        <div style={{ fontSize: F.body, fontWeight: 800, color: C.accent, marginBottom: 6 }}>{st.key}</div>
        <div style={{ fontSize: F.small, color: C.textMid, lineHeight: 1.6 }}>{st.note}</div>
      </div>
    </Card>

    {/* Capacity panel — explicitly NOT a cash saving */}
    <Card style={{ marginBottom: 28, borderLeft: `3px solid ${C.amber}` }}>
      <CTitle iconKey="calendar" color={C.amber}>Capacity — not a cash saving</CTitle>
      <div style={{ fontSize: F.small, color: C.textMid, lineHeight: 1.6, marginBottom: 16 }}>
        Filling more shifts from your own bank is real operational value — but it is coverage, not cash. We keep it well away from the saving above.
      </div>
      <Row label="Additional temp duties / yr filled by your own bank (off agency)" value={<AnimVal value={r.displaced} format={fmtNum} />} />
      <Row label="Bank backfill cost (spend, not saving)" value={<AnimVal value={r.capacityValue} format={fmtK} />} />
      <Row label="Agency reliance reduced" value={<>{fmtPct1(r.fillNow)} → <span style={{ color: C.good, fontWeight: 800 }}>{fmtPct1(r.fillAfter)}</span></>} />
      <div style={{ marginTop: 14, fontSize: F.small, color: C.textMuted, fontStyle: "italic", lineHeight: 1.6 }}>
        This is where "utilisation uplift" belongs — coverage, not cash.
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
            Filling a bank shift is itself <strong style={{ color: C.text }}>expenditure</strong> — only the gap between an agency shift and the equivalent bank shift (the premium) is cash released. The premium here is <strong style={{ color: C.text }}>20%</strong>, a contested figure at shift level; the model is most credible on your own trust's rates.
          </p>
          <p>
            <strong style={{ color: C.text }}>Admin time saving</strong> uses a per-manager model: each roster manager recovers a conservative <strong style={{ color: C.text }}>1 hour/day</strong> across 225 working days, valued at a loaded £18/hour (the client's 2.5 hours/day would be an optimistic upper bound). The same hours feed the "time saved per week" co-headline.
          </p>
          <p>
            Pay assumptions use <strong style={{ color: C.text }}>2025/26 NHS Agenda for Change midpoints</strong> (a band-mix weighted blended bank pay), 1,957.5 AfC hours/year, 8-hour shifts and a 20% bank on-cost (on-cost affects duty counts, not the cash headline). Defaults are deliberately conservative.
          </p>
          <p style={{ marginBottom: 0 }}>
            Outputs are <strong style={{ color: C.text }}>indicative</strong> and are recomputed live as you move the modelling-stance slider above.
          </p>
        </div>
      </Collapsible>
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
      <div style={{ marginTop: 12, fontSize: F.tiny, color: C.textMuted, fontStyle: "italic", lineHeight: 1.6 }}>
        Staff experience — fewer last-minute gaps, more choice for your own people — is a real benefit, but we keep it as a qualitative note and out of the ROI.
      </div>
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
