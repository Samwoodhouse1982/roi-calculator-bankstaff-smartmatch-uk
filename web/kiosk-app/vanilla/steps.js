/* ────────────────────────────────────────────────────────────────────────
   The four input screens, ported from the React build's steps/index.jsx.

   Copy discipline is unchanged: one job per element, a one-line lead
   question, the control, one line of fine print. All detail and caveats live
   in the (i) tooltips and are never repeated on screen.
   ──────────────────────────────────────────────────────────────────────── */
import { h, setStyle } from './dom';
import { Card, SectionTitle, Lead, Helper, TouchSlider, Stepper, InfoTip, ToggleRow, DecisionRow } from './ui';
import { C, F, fmt, fmtNum, BANK_MIN, BANK_MAX, bankScale } from '../src/theme';
import { platformCostFor, stance, SIMPLE_BLENDED_BANK_PAY, AFC_DIVISOR, BANK_ONCOST, AGENCY_SPEND_PER_REGISTERED_BANK_WORKER_GBP } from '../src/calc/engine';

// STEP 0. Your bank register: the single input; agency spend and everything else scale from it.
export function BankStep(state, set) {
  const baseHr = (SIMPLE_BLENDED_BANK_PAY / AFC_DIVISOR).toFixed(2);
  const allInHr = ((SIMPLE_BLENDED_BANK_PAY / AFC_DIVISOR) * (1 + BANK_ONCOST)).toFixed(2);
  const fee = h('strong', { style: { color: C.accent } }, `${fmt(platformCostFor(state.bankPool))}/yr`);

  return h('div', null,
    SectionTitle(1, 'Your bank register'),
    Lead('How many workers are on your bank register in Optima? These are the people you can offer temporary shifts to before turning to an agency.'),
    Card({},
      TouchSlider({
        label: 'Registered bank workers',
        value: state.bankPool, min: BANK_MIN, max: BANK_MAX, scale: bankScale, format: fmtNum,
        onChange: v => { set('bankPool', v); fee.textContent = `${fmt(platformCostFor(v))}/yr`; },
        tip: 'Everyone on your bank register, INCLUDING substantive staff who also pick up bank shifts, not just dedicated bank-only workers. Counting only bank-only workers would understate the opportunity. A rough figure is fine.',
      }),
      Helper('Slide to adjust your number of bank staff who use Optima. Better utilisation of this pool is the mechanism that displaces expensive agency spend.'),
      h('div', { style: { marginTop: 16, padding: '14px 18px', background: C.accentSoft, borderRadius: 12, fontSize: F.small, color: C.textMid, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 8 } },
        h('span', null, 'BankStaff+ licence at this size: ', fee),
        InfoTip('Smart Match licence pricing, ex VAT, banded by the number of workers on your bank register. Your return and payback figures are measured against this annual fee.')),
      h('div', { style: { marginTop: 10, fontSize: F.tiny, color: C.textMuted, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 8 } },
        h('span', null, `Shift costs: 2026/27 NHS Agenda for Change band-mix (~£${Math.round(SIMPLE_BLENDED_BANK_PAY / 1000)}k blended), ${Math.round(BANK_ONCOST * 100)}% employer on-cost included.`),
        InfoTip(`Base Agenda for Change pay of £${baseHr}/hr plus a ${Math.round(BANK_ONCOST * 100)}% employer on-cost (employer National Insurance and pension) gives £${allInHr}/hr all-in. ${Math.round(BANK_ONCOST * 100)}% sits below the full ~30% NHS employer rate because bank-only workers often opt out of the pension. On-costs change the modelled shift counts, not the cash saving, and are counted once, never added again.`))));
}

// STEP 1. Agency: current agency fill rate %, plus an optional actual-agency-spend override.
export function AgencyStep(state, set) {
  const estimate = Math.round(state.bankPool * AGENCY_SPEND_PER_REGISTERED_BANK_WORKER_GBP);
  const fmtM = v => v >= 1000000 ? `£${(v / 1000000 >= 100 ? (v / 1000000).toFixed(0) : (v / 1000000).toFixed(1).replace(/\.0$/, ''))}m` : fmt(v);
  // Slider range adapts to the bank-size estimate, so the control keeps good
  // resolution for a small community trust (~£2m) or a large ICS (~£30m) alike,
  // capped at £50m for the very largest Trusts (type a higher figure if needed).
  // Capped at £50m so the control keeps resolution for ordinary trusts, except
  // that it must always clear the estimate itself: at the top of the price list
  // (100,000 workers) ~£2,700 a worker puts that estimate at £270m, and a slider
  // that stopped at £50m would silently pin the thumb at its maximum.
  const want = Math.max(estimate * 1.5, Math.min(estimate * 3, 50000000));
  const sliderMax = Math.max(10000000, Math.ceil(want / 5000000) * 5000000);
  const sliderStep = Math.max(100000, Math.round(sliderMax / 200 / 100000) * 100000);

  const panel = h('div', { style: { marginTop: 24, padding: '18px 22px', background: C.surface2, borderRadius: 16, border: `1px solid ${C.accent}55` } });

  /* The override area is rebuilt whenever the toggle flips: off shows the
     estimate we would use, on shows a text field and a slider that stay in
     step with each other. */
  const renderOverride = () => {
    const known = state.agencySpend != null;
    const body = h('div', null);
    if (!known) {
      body.appendChild(Helper('We currently estimate ', h('strong', { style: { color: C.accent } }, `${fmtM(estimate)}/yr`), ' from your bank size. Toggle on to use your own figure.'));
    } else {
      const big = h('span', { style: { fontSize: F.h2, fontWeight: 800, color: C.accent } }, fmtM(state.agencySpend));
      const field = h('input', {
        type: 'text', inputmode: 'numeric', value: state.agencySpend.toLocaleString('en-GB'),
        'aria-label': 'Your total annual agency spend in pounds',
        style: { flex: '1 1 160px', maxWidth: 240, padding: '12px 14px', fontSize: F.body, fontWeight: 700, borderRadius: 12, border: `1px solid ${C.border}`, fontFamily: 'inherit', color: C.text, background: '#fff' },
      });
      const slider = h('input', {
        type: 'range', min: 0, max: sliderMax, step: sliderStep, value: Math.min(state.agencySpend, sliderMax),
        'aria-label': 'Set your annual agency spend with the slider',
        style: { width: '100%', cursor: 'pointer', accentColor: C.accent },
      });
      const sync = v => { set('agencySpend', v); big.textContent = fmtM(v); };
      field.addEventListener('input', e => {
        const raw = e.target.value.replace(/[^\d]/g, '');
        const v = raw === '' ? 0 : Math.min(999999999, Number(raw));
        field.value = v.toLocaleString('en-GB');
        slider.value = Math.min(v, sliderMax);
        sync(v);
      });
      slider.addEventListener('input', e => {
        const v = Number(e.target.value);
        field.value = v.toLocaleString('en-GB');
        sync(v);
      });
      body.appendChild(h('div', { style: { marginTop: 16 } },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 } },
          h('span', { style: { fontSize: F.small, fontWeight: 600, color: C.textMid } }, 'Your total annual agency spend'), big),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 } },
          h('span', { style: { fontSize: F.h3, fontWeight: 700, color: C.accent } }, '£'), field,
          h('span', { style: { fontSize: F.small, color: C.textMuted } }, '/ yr')),
        slider,
        h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: F.tiny, color: C.textMuted, marginTop: 6 } },
          h('span', null, '£0'), h('span', null, 'drag to set, or type an exact figure above'), h('span', null, `${fmtM(sliderMax)}+`)),
        Helper(`This figure anchors your cash saving; the fill rate above only shapes the reliance narrative. Estimate at your bank size was ${fmtM(estimate)}/yr.`)));
    }
    return body;
  };

  let override = renderOverride();
  panel.appendChild(ToggleRow({
    on: state.agencySpend != null,
    label: 'I know our annual agency spend',
    tip: 'Your total annual agency staffing spend across the roles your bank register covers (all staff groups, whole register, not bank-only). This is the anchor for the cash saving, so a real figure makes the result far more accurate. Leave off and we estimate it from your bank size at ~£2,700 per registered worker.',
    onToggle: on => {
      set('agencySpend', on ? estimate : null);
      const next = renderOverride();
      panel.replaceChild(next, override);
      override = next;
    },
  }));
  panel.appendChild(override);

  return h('div', null,
    SectionTitle(2, 'Agency reliance'),
    Lead('What share of your temporary duties currently goes to agency rather than your own bank?'),
    Card({},
      TouchSlider({
        label: 'Current agency fill rate',
        value: state.agencyFillRate, min: 0, max: 30, step: 0.1,
        format: v => `${Math.round(v * 10) / 10}%`,
        onChange: v => set('agencyFillRate', v),
        tip: 'The proportion of temporary shifts filled by agency staff. This drives the agency-reliance reduction shown on your results (the cash saving is anchored to your agency spend, premium and confidence level, not to this rate). Defaults to 8.3%, the national average drawn from RLDatix data.',
      }),
      Helper('The default 8.3% is the national average; set your own if you know it.'),
      panel));
}

// STEP 2. Your team: size of the temporary staffing team.
export function TeamStep(state, set) {
  return h('div', null,
    SectionTitle(3, 'Your temporary staffing team'),
    Lead('How many people book, chase and reconcile temporary shifts day to day? This sets the "hours released each week" figure on your results.'),
    Card({},
      Stepper({
        label: 'Temporary staffing team',
        value: state.numManagers, min: 0, max: 60, step: 1,
        onChange: v => set('numManagers', v),
        tip: "Count the people who do the day-to-day booking, chasing and reconciling of temporary shifts: your bank / temporary staffing coordinators, officers and administrators. Managers who don't do the day-to-day entry aren't counted.",
      }),
      Helper('Count coordinators, officers and administrators, not the managers above them.'),
      h('div', { style: { marginTop: 24, padding: '18px 22px', background: C.surface2, borderRadius: 16, border: `1px solid ${C.accent}55` } },
        DecisionRow({
          value: state.includeAdmin,
          onChange: v => set('includeAdmin', v),
          label: 'Also add this recovered time to the cash saving?',
          yesLabel: 'Yes, add it',
          noLabel: 'No, show separately',
          tip: 'A secondary choice. Pick Yes to value the team\'s recovered time (a conservative 1.0 h/day at a loaded £18/h) and add it to the headline cash saving; pick No to keep it shown separately. Either way, the hours released still show on your results.',
        }))));
}

// STEP 3. Confidence: the modelling stance, set upfront and editable again on Results.
export function StanceStep(state, set) {
  const pct = h('span', { style: { fontSize: F.h1, fontWeight: 800, color: C.accent } }, `${state.displacement}%`);
  const noteTitle = h('div', { style: { fontSize: F.body, fontWeight: 800, color: C.accent, marginBottom: 6 } });
  const noteBody = h('div', { style: { fontSize: F.small, color: C.textMid, lineHeight: 1.6 } });
  const noteBox = h('div', { style: { marginTop: 20, padding: '18px 22px', background: C.accentSoft, borderRadius: 14, border: `1px solid ${C.accent}30`, display: state.stanceTouched ? 'block' : 'none' } }, noteTitle, noteBody);

  const presets = [['Conservative', 13], ['Moderate', 26], ['Optimistic', 50]];
  const btnStyle = on => ({
    flex: 1, padding: '20px 8px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.accent : C.surface2,
    color: on ? '#fff' : C.textMid, fontWeight: 700, fontSize: F.body,
    display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
  });
  const buttons = presets.map(([lbl, v]) => h('button', { type: 'button', style: btnStyle(state.stanceTouched && state.displacement === v) },
    lbl, h('span', { style: { fontSize: F.small, fontWeight: 600, opacity: 0.8 } }, `${v}%`)));
  const slider = h('input', {
    type: 'range', 'aria-label': 'Agency work moved to your bank (%)', min: 13, max: 50, step: 1, value: state.displacement,
    'aria-valuetext': `${state.displacement}% (${stance(state.displacement).key})`,
    style: { width: '100%', cursor: 'pointer', accentColor: C.accent },
  });

  const refresh = v => {
    set('displacement', v);
    set('stanceTouched', true);
    pct.textContent = `${v}%`;
    slider.value = v;
    slider.setAttribute('aria-valuetext', `${v}% (${stance(v).key})`);
    presets.forEach(([, pv], i) => setStyle(buttons[i], btnStyle(state.displacement === pv)));
    const st = stance(v);
    noteTitle.textContent = st.key;
    noteBody.textContent = st.note;
    noteBox.style.display = 'block';
  };
  presets.forEach(([, v], i) => buttons[i].addEventListener('click', () => refresh(v)));
  slider.addEventListener('input', e => refresh(Number(e.target.value)));
  if (state.stanceTouched) { const st = stance(state.displacement); noteTitle.textContent = st.key; noteBody.textContent = st.note; }

  return h('div', null,
    SectionTitle(4, 'Your confidence level'),
    Lead("How much of today's agency work do you expect to move to your own bank? You can change this on the results screen."),
    Card({},
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
        h('span', { style: { fontSize: F.body, fontWeight: 600, color: C.textMid } }, 'Agency work moved to your bank'), pct),
      h('div', { style: { display: 'flex', gap: 10, marginBottom: 16 } }, ...buttons),
      slider,
      h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: F.tiny, color: C.textMuted, marginTop: 8 } },
        h('span', null, '13% · conservative'), h('span', null, '26% · moderate'), h('span', null, '50% · optimistic')),
      noteBox));
}
