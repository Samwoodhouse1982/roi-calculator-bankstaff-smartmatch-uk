import React from 'react';
import { C, F, fmt, fmtK, fmtNum } from '../theme';
import { Card, SectionTitle, BigChoice, TouchSlider, Stepper, ToggleRow } from '../components';
import { BigNumberField } from '../components/NumPad';
import { Icon } from '../components/Icons';
import { ORG_TYPES, AFC_BANDS, stance, scaleGroupsTo, agencySpendFromTurnover } from '../calc/engine';

/* ────────────────────────────────────────────────────────────────────────
   Detailed / commercial wizard: three touch steps then the shared results.
   Big sliders/steppers for quick setting; tap any value to type it exactly
   on the on-screen keypad (BigNumberField).
   ──────────────────────────────────────────────────────────────────────── */

function Lead({ children }) {
  return <div style={{ fontSize: F.body, color: C.textMid, lineHeight: 1.6, marginBottom: 28, maxWidth: 900 }}>{children}</div>;
}
function CTitle({ iconKey, children }) {
  return <div style={{ fontSize: F.body, fontWeight: 700, color: C.textMid, marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
    {iconKey && <Icon name={iconKey} size={24} stroke={C.accent} />} {children}
  </div>;
}
function StanceButtons({ displacement, setDisplacement }) {
  return <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
    {[["Conservative", 13], ["Pilot", 26], ["Optimistic", 50]].map(([lbl, v]) => {
      const on = displacement === v;
      return <button key={v} onClick={() => setDisplacement(v)} style={{ flex: 1, padding: "16px 8px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.accent : C.surface2, color: on ? "#fff" : C.textMid, fontWeight: 700, fontSize: F.small, display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>{lbl}<span style={{ fontSize: F.tiny, fontWeight: 600, opacity: 0.8 }}>{v}%</span></button>;
    })}
  </div>;
}

// STEP D0. Organisation profile
export function OrgStep({ preset, onPickPreset, groups, setGroups, turnover, setTurnover }) {
  const opts = Object.entries(ORG_TYPES).map(([k, p]) => ({ key: k, label: p.label, desc: p.desc, iconKey: p.iconKey }));
  const totalHead = groups.reduce((s, g) => s + Number(g.headcount || 0), 0);
  const totalSpend = groups.reduce((s, g) => s + Number(g.agencySpend || 0), 0);
  return <div>
    <SectionTitle number={1}>Your organisation profile</SectionTitle>
    <Lead>Pick the closest profile, then set your size. We pre-fill a realistic staff-group mix and agency spend for that type; adjust the two headline figures and we rescale the groups to match. You fine-tune each group on the next screen.</Lead>
    <BigChoice options={opts} value={preset} onChange={onPickPreset} />
    <Card style={{ marginTop: 22 }}>
      <CTitle iconKey="network">Size of your organisation</CTitle>
      <BigNumberField label="Total bank headcount" value={totalHead} min={50} max={12000} step={10} onChange={v => setGroups(scaleGroupsTo(groups, "headcount", v))} format={fmtNum} tip="Approximate number of workers on your staff bank across all groups. Drag, or tap to type an exact figure. Scales for large systems (e.g. Leeds ~5,000, Sussex ~10,000). We rescale the staff-group mix to match; fine-tune per group next." />
      <BigNumberField label="Total annual agency spend" prefix="£" value={totalSpend} min={0} max={80000000} step={100000} onChange={v => setGroups(scaleGroupsTo(groups, "agencySpend", v))} format={fmtK} tip="Your trust's total yearly temporary-staffing agency spend. This is the anchor for the saving, so it matters most. We rescale each group's spend proportionally; fine-tune per group next." />
      <BigNumberField label="Annual turnover (£, optional)" prefix="£" value={turnover} min={0} max={5000000000} step={10000000} onChange={v => setTurnover(v)} format={fmtK} tip="Your trust's annual operating turnover (optional). Sets agency intensity — agency as a % of turnover — which tailors the headline. You can also estimate a typical agency spend from it." />
      {turnover > 0 && (() => { const pct = (totalSpend / turnover) * 100; const key = pct < 1 ? "low" : (pct <= 4 ? "typical" : "high"); const lbl = { low: "low-agency / mature bank", typical: "typical reliance", high: "high reliance" }[key]; return (
        <div style={{ marginTop: 14, padding: "14px 18px", background: C.accentSoft, borderRadius: 12, fontSize: F.small, color: C.textMid, lineHeight: 1.6 }}>
          Agency is <strong style={{ color: C.text }}>{pct.toFixed(1)}% of turnover</strong> — {lbl}.{" "}
          <button onClick={() => setGroups(scaleGroupsTo(groups, "agencySpend", Math.round(agencySpendFromTurnover(turnover, preset))))} style={{ border: "none", background: "none", color: C.accent, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: 0, textDecoration: "underline" }}>Estimate agency spend from turnover →</button>
        </div>
      ); })()}
    </Card>
  </div>;
}

// STEP D1. Staff groups & agency exposure
export function GroupsStep({ groups, setGroups, perGroupPremium, premium }) {
  const setG = (i, key, val) => setGroups(gs => gs.map((g, j) => j === i ? { ...g, [key]: val } : g));
  const removeGroup = (i) => setGroups(gs => gs.length > 1 ? gs.filter((_, j) => j !== i) : gs);
  const addGroup = () => setGroups(gs => [...gs, { id: "g" + Date.now(), role: "New staff group", band: "Band 5", bankPay: 34592, headcount: 50, agencySpend: 500000 }]);
  const totalHead = groups.reduce((s, g) => s + Number(g.headcount || 0), 0);
  const totalSpend = groups.reduce((s, g) => s + Number(g.agencySpend || 0), 0);
  return <div>
    <SectionTitle number={2}>Your staff groups</SectionTitle>
    <Lead>Fine-tune each group's bank headcount, annual agency spend (the anchor for the saving) and bank pay. Drag to set, or tap a value to type it exactly. Add or remove groups to match your trust.</Lead>
    <div style={{ marginTop: -14, marginBottom: 22, fontSize: F.small, color: C.textMid }}>
      Profile total: <strong style={{ color: C.accent }}>{fmtNum(totalHead)}</strong> bank · <strong style={{ color: C.accent }}>{fmtK(totalSpend)}</strong> agency across {groups.length} group{groups.length === 1 ? "" : "s"}.
    </div>
    {groups.map((g, i) => <Card key={g.id} style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: F.tiny, fontWeight: 700, color: C.accent, background: C.accentSoft, padding: "6px 12px", borderRadius: 8 }}>{g.band}</span>
          <span style={{ fontSize: F.h3, fontWeight: 700, color: C.text }}>{g.role}</span>
        </div>
        <button onClick={() => removeGroup(i)} disabled={groups.length <= 1} style={{ width: 50, height: 50, borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface2, color: groups.length <= 1 ? C.textMuted : C.textMid, fontSize: 28, cursor: groups.length <= 1 ? "default" : "pointer", fontFamily: "inherit", opacity: groups.length <= 1 ? 0.4 : 1 }}>×</button>
      </div>
      <BigNumberField label="Bank headcount" value={g.headcount} min={0} max={6000} step={10} onChange={v => setG(i, "headcount", v)} format={fmtNum} />
      <BigNumberField label="Annual agency spend" prefix="£" value={g.agencySpend} min={0} max={20000000} step={50000} onChange={v => setG(i, "agencySpend", v)} format={fmtK} tip="Yearly agency spend for this group, the anchor for the saving." />
      <BigNumberField label="Bank pay (£/yr)" prefix="£" value={g.bankPay} min={18000} max={90000} step={500} onChange={v => setG(i, "bankPay", v)} format={fmt} tip="Actual bank rate preferred; or tap an AfC band below (2026/27 midpoints). Different pay per group is what makes each saving differ." />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
        {AFC_BANDS.map(([lbl, val]) => { const on = g.bankPay === val; return <button key={lbl} onClick={() => { setG(i, "bankPay", val); setG(i, "band", lbl); }} style={{ padding: "10px 14px", borderRadius: 10, border: on ? `2px solid ${C.accent}` : `1px solid ${C.border}`, background: on ? C.accentPale : C.surface2, color: on ? C.accent : C.textMid, fontSize: F.tiny, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{lbl}</button>; })}
      </div>
      {perGroupPremium && <div style={{ marginTop: 24 }}>
        <TouchSlider label="Agency premium (%)" value={g.premium != null ? g.premium : premium} min={0} max={120} step={1} onChange={v => setG(i, "premium", v)} format={v => v + "%"} tip="This group's agency-over-bank premium. Nursing ~35–50%, medics ~80–120% (contested, use your own)." />
      </div>}
    </Card>)}
    <button onClick={addGroup} style={{ width: "100%", padding: 22, borderRadius: 18, border: `2px dashed ${C.accent}`, background: C.accentSoft, color: C.accent, fontSize: F.body, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 2 }}>+ Add a staff group</button>
  </div>;
}

// STEP D2. Assumptions & optional levers
export function AssumptionsStep({ premium, setPremium, perGroupPremium, setPerGroupPremium, displacement, setDisplacement,
                                  platformCost, setPlatformCost, fillRateNow, setFillRateNow, admin, setAdmin, recruit, setRecruit,
                                  displaceableShare, setDisplaceableShare }) {
  const st = stance(displacement);
  return <div>
    <SectionTitle number={3}>Assumptions</SectionTitle>
    <Lead>The official 20% agency premium and a conservative displacement stance are pre-set. Adjust to your trust, and add admin or recruitment levers only if you can substantiate them.</Lead>

    <Card style={{ marginBottom: 18 }}>
      <CTitle iconKey="dollar">Agency premium</CTitle>
      <TouchSlider label={perGroupPremium ? "Default agency premium (%)" : "Agency premium over bank (%)"} value={premium} min={0} max={60} step={1} onChange={setPremium} format={v => v + "%"} tip="House of Commons Library ~20% average; contested at shift level, use your own rate. Applies across all groups unless you set it per group." />
      <ToggleRow on={perGroupPremium} onToggle={setPerGroupPremium} label="Set the agency premium per staff group" tip="Off by default, one official ~20% premium across all groups (the defensible default). Tick to override per group on the staff-groups screen (e.g. higher for medics), where you have trust-specific rates." />
    </Card>

    <Card style={{ marginBottom: 18 }}>
      <CTitle iconKey="search">Displacement stance</CTitle>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: F.body, fontWeight: 600, color: C.textMid }}>Agency displacement</span>
        <span style={{ fontSize: F.h1, fontWeight: 800, color: C.accent }}>{displacement}%</span>
      </div>
      <StanceButtons displacement={displacement} setDisplacement={setDisplacement} />
      <input type="range" min={8} max={50} step={1} value={displacement} onChange={e => setDisplacement(Number(e.target.value))} style={{ width: "100%", cursor: "pointer", accentColor: C.accent }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: F.tiny, color: C.textMuted, marginTop: 8 }}>
        <span>8% · conservative</span><span>26% · pilot</span><span>50% · optimistic</span>
      </div>
      <div style={{ marginTop: 16, padding: "16px 20px", background: C.accentSoft, borderRadius: 14, border: `1px solid ${C.accent}30` }}>
        <div style={{ fontSize: F.body, fontWeight: 800, color: C.accent, marginBottom: 6 }}>{st.key}</div>
        <div style={{ fontSize: F.small, color: C.textMid, lineHeight: 1.6 }}>{st.note}</div>
      </div>
    </Card>

    <Card style={{ marginBottom: 18 }}>
      <CTitle iconKey="calendar">Platform &amp; capacity</CTitle>
      <BigNumberField label="Smart Match licence fee (£/yr)" prefix="£" value={platformCost} min={0} max={100000} step={1000} onChange={setPlatformCost} format={fmt} tip="Auto-set from your bank size using G-Cloud pricing (ex VAT); fully editable. This is the ROI denominator." />
      <TouchSlider label="Current agency fill rate (%)" value={fillRateNow} min={0} max={30} step={0.1} onChange={setFillRateNow} format={v => v + "%"} tip="Defaults to 8.3%, the agreed national average (RLDatix data). Used for the capacity narrative (agency reliance reduced)." />
      <TouchSlider label="Displaceable share of agency (%)" value={Math.round((displaceableShare != null ? displaceableShare : 0.8) * 100)} min={0} max={100} step={5} onChange={v => setDisplaceableShare(Math.min(1, Math.max(0, v / 100)))} format={v => v + "%"} tip="Only part of agency spend can realistically move to bank — excludes break-glass / safety-critical cover and hard-to-fill specialist roles. Displacement applies to this share only (benchmark default 80%)." />
    </Card>

    <Card style={{ marginBottom: 18 }}>
      <ToggleRow on={admin.enabled} onToggle={v => setAdmin(a => ({ ...a, enabled: v }))} label="Include admin time saving in the cash total" tip="Off by default, a secondary recommendation. Time released for your temporary staffing team — bank / temp coordinators, officers and administrators — via self-booking automation. The hours-per-week figure is always shown; turn this on to also add its cash value to the headline." />
      {admin.enabled && <div style={{ marginTop: 20 }}>
        <Stepper label="Temporary staffing team" value={admin.managers} min={0} max={80} step={1} onChange={v => setAdmin(a => ({ ...a, managers: v }))} />
        <TouchSlider label="Hours saved / day each" value={admin.hoursPerDay} min={0} max={4} step={0.25} onChange={v => setAdmin(a => ({ ...a, hoursPerDay: v }))} format={v => v + " h"} tip="Client suggested 2.5 h/day (optimistic). Default 1.0 h is conservative." />
        <TouchSlider label="Loaded hourly rate" value={admin.loadedHourly} min={0} max={60} step={1} onChange={v => setAdmin(a => ({ ...a, loadedHourly: v }))} format={fmt} />
      </div>}
    </Card>

    <Card style={{ marginBottom: 18 }}>
      <ToggleRow on={recruit.enabled} onToggle={v => setRecruit(a => ({ ...a, enabled: v }))} label="Recover recruitment / onboarding waste (optional)" tip="Cost of recruiting and onboarding bank workers who then go under-utilised; Smart Match recovers some by activating idle capacity. Conservative, off by default." />
      {recruit.enabled && <div style={{ marginTop: 20 }}>
        <Stepper label="Under-utilised bank workers" value={recruit.workers} min={0} max={500} step={5} onChange={v => setRecruit(a => ({ ...a, workers: v }))} />
        <BigNumberField label="Recruit + onboard cost each" prefix="£" value={recruit.costPerWorker} min={0} max={20000} step={100} onChange={v => setRecruit(a => ({ ...a, costPerWorker: v }))} format={fmt} />
        <TouchSlider label="Share recovered" value={recruit.recoveryRate} min={0} max={0.5} step={0.05} onChange={v => setRecruit(a => ({ ...a, recoveryRate: v }))} format={v => Math.round(v * 100) + "%"} tip="Fraction of that waste Smart Match recovers. Keep conservative." />
      </div>}
    </Card>
  </div>;
}
