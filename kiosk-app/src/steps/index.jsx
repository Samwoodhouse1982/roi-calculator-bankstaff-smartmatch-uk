import React from 'react';
import { C, F, fmt, fmtNum } from '../theme';
import { Card, SectionTitle, TouchSlider, Stepper, InfoTip, DecisionRow, ToggleRow } from '../components';
import { platformCostFor, stance, SIMPLE_BLENDED_BANK_PAY, AFC_DIVISOR, BANK_ONCOST, AGENCY_SPEND_PER_REGISTERED_BANK_WORKER_GBP } from '../calc/engine';

/* ────────────────────────────────────────────────────────────────────────
   Smart Match: three simple inputs (plus the modelling-stance slider that
   lives on the Results screen). Copy discipline: one job per element — a
   one-line lead question, the control, one line of fine print; all detail
   and caveats live in the (i) tooltips, never repeated on screen.
   ──────────────────────────────────────────────────────────────────────── */

function Helper({ children }) {
  return <div style={{ fontSize: F.small, color: C.textMid, lineHeight: 1.6, marginTop: 4 }}>{children}</div>;
}

function Lead({ children }) {
  return <div style={{ fontSize: F.body, color: C.textMid, lineHeight: 1.6, marginBottom: 28, maxWidth: 760 }}>{children}</div>;
}

// STEP 0. Your bank register — the single input; agency spend and everything else scale from it.
export function BankStep({ bankPool, setBankPool }) {
  const baseHr = (SIMPLE_BLENDED_BANK_PAY / AFC_DIVISOR).toFixed(2);
  const allInHr = ((SIMPLE_BLENDED_BANK_PAY / AFC_DIVISOR) * (1 + BANK_ONCOST)).toFixed(2);
  return <div>
    <SectionTitle number={1}>Your bank register</SectionTitle>
    <Lead>How many workers are on your bank register in Optima? These are the people you can offer temporary shifts to before turning to an agency.</Lead>
    <Card>
      <TouchSlider
        label="Registered bank workers"
        value={bankPool}
        min={50}
        max={12000}
        step={10}
        onChange={setBankPool}
        format={fmtNum}
        tip="Everyone on your bank register, INCLUDING substantive staff who also pick up bank shifts, not just dedicated bank-only workers. Counting only bank-only workers would understate the opportunity. A rough figure is fine."
      />
      <Helper>Slide to adjust your number of bank staff who use Optima. Better utilisation of this pool is the mechanism that displaces expensive agency spend.</Helper>
      <div style={{ marginTop: 16, padding: "14px 18px", background: C.accentSoft, borderRadius: 12, fontSize: F.small, color: C.textMid, lineHeight: 1.5, display: "flex", alignItems: "center", gap: 8 }}>
        <span>BankStaff+ licence at this size: <strong style={{ color: C.accent }}>{fmt(platformCostFor(bankPool))}/yr</strong></span>
        <InfoTip text="G-Cloud pricing, ex VAT, banded by the number of licensed users. Your return and payback figures are measured against this annual fee." />
      </div>
      <div style={{ marginTop: 10, fontSize: F.tiny, color: C.textMuted, lineHeight: 1.5, display: "flex", alignItems: "center", gap: 8 }}>
        <span>Shift costs: 2026/27 NHS Agenda for Change band-mix (~£{Math.round(SIMPLE_BLENDED_BANK_PAY / 1000)}k blended), {Math.round(BANK_ONCOST * 100)}% employer on-cost included.</span>
        <InfoTip text={`Base Agenda for Change pay of £${baseHr}/hr plus a ${Math.round(BANK_ONCOST * 100)}% employer on-cost (employer National Insurance and pension) gives £${allInHr}/hr all-in. ${Math.round(BANK_ONCOST * 100)}% sits below the full ~30% NHS employer rate because bank-only workers often opt out of the pension. On-costs change the modelled shift counts, not the cash saving, and are counted once, never added again.`} />
      </div>
    </Card>
  </div>;
}

// STEP 1. Agency: current agency fill rate %, plus an optional actual-agency-spend override.
export function AgencyStep({ agencyFillRate, setAgencyFillRate, bankPool, agencySpend, setAgencySpend }) {
  const estimate = Math.round(bankPool * AGENCY_SPEND_PER_REGISTERED_BANK_WORKER_GBP);
  const known = agencySpend != null;
  const fmtM = v => v >= 1000000 ? `£${(v / 1000000 >= 100 ? (v / 1000000).toFixed(0) : (v / 1000000).toFixed(1).replace(/\.0$/, ""))}m` : fmt(v);
  // Slider range adapts to the bank-size estimate, so the control keeps good
  // resolution for a small community trust (~£2m) or a large ICS (~£30m) alike.
  const sliderMax = Math.max(10000000, Math.ceil(estimate * 3 / 5000000) * 5000000);
  const sliderStep = Math.max(100000, Math.round(sliderMax / 200 / 100000) * 100000);
  return <div>
    <SectionTitle number={2}>Agency reliance</SectionTitle>
    <Lead>What share of your temporary duties currently goes to agency rather than your own bank?</Lead>
    <Card>
      <TouchSlider
        label="Current agency fill rate"
        value={agencyFillRate}
        min={0}
        max={30}
        step={0.1}
        onChange={setAgencyFillRate}
        format={v => `${Math.round(v * 10) / 10}%`}
        tip="The proportion of temporary shifts filled by agency staff. This drives the agency-reliance reduction shown on your results (the cash saving is anchored to your agency spend, premium and confidence level, not to this rate). Defaults to 8.3%, the national average drawn from RLDatix data."
      />
      <Helper>The default 8.3% is the national average; set your own if you know it.</Helper>

      {/* Optional: replace the bank-size estimate of agency spend with the real figure. */}
      <div style={{ marginTop: 24, padding: "18px 22px", background: C.surface2, borderRadius: 16, border: `1px solid ${C.accent}55` }}>
        <ToggleRow
          on={known}
          onToggle={() => setAgencySpend(known ? null : estimate)}
          label="I know our annual agency spend"
          tip="Your total annual agency staffing spend across the roles your bank register covers (all staff groups, whole register, not bank-only). This is the anchor for the cash saving, so a real figure makes the result far more accurate. Leave off and we estimate it from your bank size at ~£2,700 per registered worker."
        />
        {!known ? (
          <Helper>We currently estimate <strong style={{ color: C.accent }}>{fmtM(estimate)}/yr</strong> from your bank size. Toggle on to use your own figure.</Helper>
        ) : (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: F.small, fontWeight: 600, color: C.textMid }}>Your total annual agency spend</span>
              <span style={{ fontSize: F.h2, fontWeight: 800, color: C.accent }}>{fmtM(agencySpend)}</span>
            </div>
            {/* Exact figure: comma-grouped text field, no fiddly spinner arrows */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: F.h3, fontWeight: 700, color: C.accent }}>£</span>
              <input
                type="text"
                inputMode="numeric"
                value={agencySpend.toLocaleString("en-GB")}
                onChange={e => { const raw = e.target.value.replace(/[^\d]/g, ""); setAgencySpend(raw === "" ? 0 : Math.min(999999999, Number(raw))); }}
                aria-label="Your total annual agency spend in pounds"
                style={{ flex: "1 1 160px", maxWidth: 240, padding: "12px 14px", fontSize: F.body, fontWeight: 700, borderRadius: 12, border: `1px solid ${C.border}`, fontFamily: "inherit", color: C.text, background: "#fff" }}
              />
              <span style={{ fontSize: F.small, color: C.textMuted }}>/ yr</span>
            </div>
            {/* Quick-set: drag the slider, then fine-tune the number above */}
            <input
              type="range"
              min={0}
              max={sliderMax}
              step={sliderStep}
              value={Math.min(agencySpend, sliderMax)}
              onChange={e => setAgencySpend(Number(e.target.value))}
              aria-label="Set your annual agency spend with the slider"
              style={{ width: "100%", cursor: "pointer", accentColor: C.accent }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: F.tiny, color: C.textMuted, marginTop: 6 }}>
              <span>£0</span><span>drag to set, or type an exact figure above</span><span>{fmtM(sliderMax)}+</span>
            </div>
            <Helper>This figure anchors your cash saving; the fill rate above only shapes the reliance narrative. Estimate at your bank size was {fmtM(estimate)}/yr.</Helper>
          </div>
        )}
      </div>
    </Card>
  </div>;
}

// STEP 2. Your team: size of the temporary staffing team
export function TeamStep({ numManagers, setNumManagers, includeAdmin, setIncludeAdmin }) {
  return <div>
    <SectionTitle number={3}>Your temporary staffing team</SectionTitle>
    <Lead>How many people book, chase and reconcile temporary shifts day to day? This sets the "hours released each week" figure on your results.</Lead>
    <Card>
      <Stepper
        label="Temporary staffing team"
        value={numManagers}
        min={0}
        max={60}
        step={1}
        onChange={setNumManagers}
        tip="Count the people who do the day-to-day booking, chasing and reconciling of temporary shifts: your bank / temporary staffing coordinators, officers and administrators. Managers who don't do the day-to-day entry aren't counted."
      />
      <Helper>Count coordinators, officers and administrators, not the managers above them.</Helper>
      <div style={{ marginTop: 24, padding: "18px 22px", background: C.surface2, borderRadius: 16, border: `1px solid ${C.accent}55` }}>
        <DecisionRow
          value={includeAdmin}
          onChange={setIncludeAdmin}
          label="Also add this recovered time to the cash saving?"
          yesLabel="Yes, add it"
          noLabel="No, show separately"
          tip="A secondary choice. Pick Yes to value the team's recovered time (a conservative 1.0 h/day at a loaded £18/h) and add it to the headline cash saving; pick No to keep it shown separately. Either way, the hours released still show on your results."
        />
      </div>
    </Card>
  </div>;
}

// STEP 3. Confidence / optimism: the modelling stance, set upfront (also editable on Results).
export function StanceStep({ displacement, chosen, setDisplacement }) {
  const st = stance(displacement);
  return <div>
    <SectionTitle number={4}>Your confidence level</SectionTitle>
    <Lead>How much of today's agency work do you expect to move to your own bank? You can change this on the results screen.</Lead>
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: F.body, fontWeight: 600, color: C.textMid }}>Agency work moved to your bank</span>
        <span style={{ fontSize: F.h1, fontWeight: 800, color: C.accent }}>{displacement}%</span>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[["Conservative", 13], ["Moderate", 26], ["Optimistic", 50]].map(([lbl, v]) => {
          const on = chosen && displacement === v;
          return <button key={v} onClick={() => setDisplacement(v)} style={{
            flex: 1, padding: "20px 8px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
            border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.accent : C.surface2,
            color: on ? "#fff" : C.textMid, fontWeight: 700, fontSize: F.body,
            display: "flex", flexDirection: "column", gap: 4, alignItems: "center"
          }}>{lbl}<span style={{ fontSize: F.small, fontWeight: 600, opacity: 0.8 }}>{v}%</span></button>;
        })}
      </div>
      <input type="range" aria-label="Agency work moved to your bank (%)" min={13} max={50} step={1} value={displacement} onChange={e => setDisplacement(Number(e.target.value))} style={{ width: "100%", cursor: "pointer", accentColor: C.accent }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: F.tiny, color: C.textMuted, marginTop: 8 }}>
        <span>13% · conservative</span><span>26% · moderate</span><span>50% · optimistic</span>
      </div>
      {chosen && <div style={{ marginTop: 20, padding: "18px 22px", background: C.accentSoft, borderRadius: 14, border: `1px solid ${C.accent}30` }}>
        <div style={{ fontSize: F.body, fontWeight: 800, color: C.accent, marginBottom: 6 }}>{st.key}</div>
        <div style={{ fontSize: F.small, color: C.textMid, lineHeight: 1.6 }}>{st.note}</div>
      </div>}
    </Card>
  </div>;
}
