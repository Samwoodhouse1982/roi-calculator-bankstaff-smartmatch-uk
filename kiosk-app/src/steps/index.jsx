import React from 'react';
import { C, F, fmt, fmtNum } from '../theme';
import { Card, SectionTitle, TouchSlider, Stepper, InfoTip, ToggleRow } from '../components';
import { platformCostFor, stance, SIMPLE_BLENDED_BANK_PAY, AFC_DIVISOR, BANK_ONCOST } from '../calc/engine';

/* ────────────────────────────────────────────────────────────────────────
   Smart Match: three simple inputs (plus the modelling-stance slider that
   lives on the Results screen). Each step is one clear question with a short
   helper line. Teal accent, navy surfaces, en-GB throughout.
   ──────────────────────────────────────────────────────────────────────── */

function Helper({ children }) {
  return <div style={{ fontSize: F.small, color: C.textMid, lineHeight: 1.6, marginTop: 4 }}>{children}</div>;
}

function Lead({ children }) {
  return <div style={{ fontSize: F.body, color: C.textMid, lineHeight: 1.6, marginBottom: 28, maxWidth: 760 }}>{children}</div>;
}

// STEP 0. Your bank: bank staff pool size
export function BankStep({ bankPool, setBankPool }) {
  return <div>
    <SectionTitle number={1}>Your bank staff pool</SectionTitle>
    <Lead>How many people sit on your staff bank, the workers you can call on to fill temporary shifts before you reach for an agency?</Lead>
    <Card>
      <TouchSlider
        label="Bank staff pool size"
        value={bankPool}
        min={50}
        max={12000}
        step={10}
        onChange={setBankPool}
        format={fmtNum}
        tip="The total number of registered workers on your staff bank, substantive staff doing extra shifts plus dedicated bank-only workers. A rough figure is fine; you can adjust it later."
      />
      <Helper>Drag to set the size of your bank. Better utilisation of this pool is the mechanism that displaces expensive agency spend.</Helper>
      <div style={{ marginTop: 16, padding: "14px 18px", background: C.accentSoft, borderRadius: 12, fontSize: F.small, color: C.textMid, lineHeight: 1.5 }}>
        Smart Match licence at this size: <strong style={{ color: C.accent }}>{fmt(platformCostFor(bankPool))}/yr</strong> <span style={{ color: C.textMuted }}>(G-Cloud pricing, ex VAT; this sets your ROI)</span>
      </div>
      <div style={{ marginTop: 10, fontSize: F.tiny, color: C.textMuted, lineHeight: 1.5 }}>
        Bank shift costs use <strong style={{ color: C.textMid }}>2026/27 NHS Agenda for Change band-mix midpoints</strong> (~£{Math.round(SIMPLE_BLENDED_BANK_PAY / 1000)}k blended, £{((SIMPLE_BLENDED_BANK_PAY / AFC_DIVISOR) * (1 + BANK_ONCOST)).toFixed(2)}/hr loaded); medics use the SAS scale.
      </div>
    </Card>
  </div>;
}

// STEP 1. Agency: current agency fill rate %
export function AgencyStep({ agencyFillRate, setAgencyFillRate }) {
  return <div>
    <SectionTitle number={2}>Agency reliance</SectionTitle>
    <Lead>Of all the temporary duties you fill each year, what share currently goes to an agency rather than your own bank?</Lead>
    <Card>
      <TouchSlider
        label="Current agency fill rate"
        value={agencyFillRate}
        min={0}
        max={30}
        step={0.1}
        onChange={setAgencyFillRate}
        format={v => `${Math.round(v * 10) / 10}%`}
        tip="The proportion of temporary shifts filled by agency staff. Each agency shift carries a premium over the equivalent bank shift; that premium is what improved bank utilisation displaces. Defaults to 8.3%, the agreed national average drawn from nationally available RLDatix data."
      />
      <Helper>Share of temp duties currently filled by agency. Default 8.3% based on national average of NHS organisations; set your own for a tailored figure.</Helper>
    </Card>
  </div>;
}

// STEP 2. Your team: size of the temporary staffing team
export function TeamStep({ numManagers, setNumManagers, includeAdmin, setIncludeAdmin }) {
  return <div>
    <SectionTitle number={3}>Your temporary staffing team</SectionTitle>
    <Lead>How many people spend their time booking, chasing and reconciling temporary shifts? Smart Match gives these colleagues back time, and this sets the "hours released each week" figure on your results.</Lead>
    <Card>
      <Stepper
        label="Temporary staffing team"
        value={numManagers}
        min={0}
        max={60}
        step={1}
        onChange={setNumManagers}
        tip="Count the people who do the day-to-day booking, chasing and reconciling of temporary shifts, your bank / temporary staffing coordinators, officers and administrators. Managers who don't do the day-to-day entry aren't counted."
      />
      <Helper>
        Include your <strong style={{ color: C.text }}>bank / temporary staffing coordinators</strong>, <strong style={{ color: C.text }}>officers</strong> and <strong style={{ color: C.text }}>administrators</strong>, anyone whose day is spent placing and reconciling shifts, not the managers above them.
      </Helper>
      <div style={{ marginTop: 24, padding: "18px 22px", background: C.surface2, borderRadius: 16, border: `1px solid ${C.accent}55` }}>
        <ToggleRow
          on={includeAdmin}
          onToggle={setIncludeAdmin}
          label="Also add this recovered time to the cash saving"
          tip="Off by default, a secondary recommendation. Turn this on to value the team's recovered time (a conservative 1.0 h/day at a loaded £18/h) and add it to the headline cash saving. Either way, the hours released show on your results."
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
    <Lead>How much of today's agency use do you expect better bank utilisation to displace onto your own bank? Choose the outlook that fits your evidence; you can change it on the results screen.</Lead>
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: F.body, fontWeight: 600, color: C.textMid }}>Agency work moved to your bank</span>
        <span style={{ fontSize: F.h1, fontWeight: 800, color: C.accent }}>{displacement}%</span>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[["Conservative", 13], ["Expected", 26], ["Optimistic", 50]].map(([lbl, v]) => {
          const on = chosen && displacement === v;
          return <button key={v} onClick={() => setDisplacement(v)} style={{
            flex: 1, padding: "20px 8px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
            border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.accent : C.surface2,
            color: on ? "#fff" : C.textMid, fontWeight: 700, fontSize: F.body,
            display: "flex", flexDirection: "column", gap: 4, alignItems: "center"
          }}>{lbl}<span style={{ fontSize: F.small, fontWeight: 600, opacity: 0.8 }}>{v}%</span></button>;
        })}
      </div>
      <input type="range" aria-label="Agency work moved to your bank (%)" min={8} max={50} step={1} value={displacement} onChange={e => setDisplacement(Number(e.target.value))} style={{ width: "100%", cursor: "pointer", accentColor: C.accent }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: F.tiny, color: C.textMuted, marginTop: 8 }}>
        <span>8% · conservative</span><span>26% · expected</span><span>50% · optimistic</span>
      </div>
      {chosen && <div style={{ marginTop: 20, padding: "18px 22px", background: C.accentSoft, borderRadius: 14, border: `1px solid ${C.accent}30` }}>
        <div style={{ fontSize: F.body, fontWeight: 800, color: C.accent, marginBottom: 6 }}>{st.key}</div>
        <div style={{ fontSize: F.small, color: C.textMid, lineHeight: 1.6 }}>{st.note}</div>
      </div>}
    </Card>
  </div>;
}
