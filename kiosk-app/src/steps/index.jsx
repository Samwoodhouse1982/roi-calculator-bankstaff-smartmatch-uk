import React from 'react';
import { C, F, fmtNum } from '../theme';
import { Card, SectionTitle, TouchSlider, Stepper, InfoTip } from '../components';

/* ────────────────────────────────────────────────────────────────────────
   Smart Match — three simple inputs (plus the modelling-stance slider that
   lives on the Results screen). Each step is one clear question with a short
   helper line. Teal accent, navy surfaces, en-GB throughout.
   ──────────────────────────────────────────────────────────────────────── */

function Helper({ children }) {
  return <div style={{ fontSize: F.small, color: C.textMid, lineHeight: 1.6, marginTop: 4 }}>{children}</div>;
}

function Lead({ children }) {
  return <div style={{ fontSize: F.body, color: C.textMid, lineHeight: 1.6, marginBottom: 28, maxWidth: 760 }}>{children}</div>;
}

// STEP 0 — Your bank: bank staff pool size
export function BankStep({ bankPool, setBankPool }) {
  return <div>
    <SectionTitle number={1}>Your bank staff pool</SectionTitle>
    <Lead>How many people sit on your staff bank — the workers you can call on to fill temporary shifts before you reach for an agency?</Lead>
    <Card>
      <TouchSlider
        label="Bank staff pool size"
        value={bankPool}
        min={50}
        max={3000}
        step={10}
        onChange={setBankPool}
        format={fmtNum}
        tip="The total number of registered workers on your staff bank — substantive staff doing extra shifts plus dedicated bank-only workers. A rough figure is fine; you can adjust it later."
      />
      <Helper>Drag to set the size of your bank. Better utilisation of this pool is the mechanism that displaces expensive agency spend.</Helper>
    </Card>
  </div>;
}

// STEP 1 — Agency: current agency fill rate %
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
        step={0.5}
        onChange={setAgencyFillRate}
        format={v => `${v}%`}
        tip="The proportion of temporary shifts filled by agency staff. Each agency shift carries a premium over the equivalent bank shift — that premium is what improved bank utilisation displaces."
      />
      <Helper>Share of temp duties currently filled by agency.</Helper>
    </Card>
  </div>;
}

// STEP 2 — Your team: number of admin / roster managers
export function TeamStep({ numManagers, setNumManagers }) {
  return <div>
    <SectionTitle number={3}>Your roster team</SectionTitle>
    <Lead>How many people spend their time booking, chasing and reconciling temporary shifts? Smart Match gives these colleagues back time.</Lead>
    <Card>
      <Stepper
        label="Admin / roster managers"
        value={numManagers}
        min={0}
        max={60}
        step={1}
        onChange={setNumManagers}
        tip="Count the people whose job is filling and managing temporary shifts: Roster Managers, Bank Staff Administrators, and Temp / Agency Managers."
      />
      <Helper>
        Include <strong style={{ color: C.text }}>Roster Managers</strong>, <strong style={{ color: C.text }}>Bank Staff Administrators</strong> and <strong style={{ color: C.text }}>Temp / Agency Managers</strong> — anyone whose day is spent placing and reconciling shifts.
      </Helper>
    </Card>
  </div>;
}
