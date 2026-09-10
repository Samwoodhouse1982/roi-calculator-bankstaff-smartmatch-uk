/* ────────────────────────────────────────────────────────────────────────
   The results page, ported from the React build's ResultsPage.jsx.

   One structural difference, and it is an improvement rather than a
   compromise: React rebuilt the whole page whenever the confidence slider
   moved. Here the page is built once and a list of updater functions patches
   the figures in place, so dragging the slider never rebuilds the DOM,
   never interrupts the drag, and never loses focus.
   ──────────────────────────────────────────────────────────────────────── */
import { h, frag, fill, setStyle } from './dom';
import { Icon } from './icons';
import { Card, CTitle, Row, InfoTip, Collapsible } from './ui';
import { LeadCapture } from './lead';
import { C, F, fmt, fmtK, fmtNum } from '../src/theme';
import { stance, ADMIN_HRS_PER_DAY, ADMIN_WORKING_DAYS, ADMIN_LOADED_HOURLY, BANK_ONCOST, AGENCY_SPEND_PER_REGISTERED_BANK_WORKER_GBP } from '../src/calc/engine';

// Responsive grid: side-by-side where there's room, stacked on narrow screens.
const fluidGrid = min => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))` });

const fmtPayback = m => m == null ? 'n/a' : `${Math.round(m * 365 / 12).toLocaleString('en-GB')} days`;
const fmtPct1 = v => `${(Math.round(v * 10) / 10).toLocaleString('en-GB')}%`;
const fmtMultiple = m => m == null ? 'n/a' : (m >= 10 ? Math.round(m) : Math.round(m * 10) / 10) + '×';

/* Counts a number up to its target with ease-out cubic, from whatever is on
   screen now rather than from zero, so a change of confidence rolls the
   figures smoothly instead of snapping back. Returns a setter. */
function counter(el, format, duration = 900) {
  let current = 0, raf = 0;
  return target => {
    if (target == null) return;
    cancelAnimationFrame(raf);
    const from = current, start = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - start) / duration);
      const v = from + (target - from) * (1 - Math.pow(1 - t, 3));
      current = v;
      el.textContent = format ? format(v) : Math.round(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else { current = target; el.textContent = format ? format(target) : Math.round(target); }
    };
    raf = requestAnimationFrame(tick);
  };
}

function KpiTile({ label, value, sub, iconKey, tip }) {
  return h('div', { class: 'kpi-tile', style: { padding: '24px 22px', background: C.surface, borderRadius: 18, border: `1px solid ${C.accent}25` } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
      Icon(iconKey, 26, C.accent),
      h('span', { style: { fontSize: F.tiny, fontWeight: 600, color: C.textMuted } }, label),
      tip && InfoTip(tip)),
    h('div', { style: { fontSize: F.h1, fontWeight: 800, color: C.accent, marginBottom: 4 } }, value),
    sub && h('div', { style: { fontSize: F.tiny, color: C.textMid } }, sub));
}

/* `recalc(d)` returns a fresh engine result at confidence level d. */
export function ResultsPage({ r0, displacement, chosen, recalc, onDisplacement, onAdjust, onStartOver, leadContext }) {
  let r = r0, disp = displacement, touched = chosen;
  const updaters = [];                 // called with the new result on every change
  const track = fn => { updaters.push(fn); return fn; };

  const style = h('style', null, `@keyframes rfade { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
    @keyframes glow { 0%,100% { text-shadow: 0 0 26px rgba(52,222,194,0.35); } 50% { text-shadow: 0 0 46px rgba(52,222,194,0.6); } }
    .kpi-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:14px; }
    .kpi-grid-4 { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; margin-bottom:14px; }
    @media (max-width:640px) { .kpi-grid-3, .kpi-grid-4 { grid-template-columns:1fr; } }
    .kpi-tile { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
    .kpi-tile:hover { transform: translateY(-4px); box-shadow: 0 10px 28px rgba(15,65,70,0.14); border-color: ${C.seafoam}; }
    @media (prefers-reduced-motion: reduce) { .kpi-tile, .kpi-tile:hover { transition:none; transform:none; } }`);

  /* ── Confidence strip ── */
  const presets = [['Conservative', 13], ['Moderate', 26], ['Optimistic', 50]];
  const pillStyle = on => ({
    padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.accent : C.surface2,
    color: on ? '#fff' : C.textMid, fontWeight: 700, fontSize: F.tiny, transition: 'all .15s',
  });
  const pills = presets.map(([lbl, v]) => h('button', { type: 'button', style: pillStyle(touched && disp === v) }, lbl));
  const slider = h('input', { type: 'range', 'aria-label': 'Agency work moved to your bank (%)', min: 13, max: 50, step: 1, value: disp, 'aria-valuetext': `${disp}% (${stance(disp).key})`, style: { flex: '1 1 120px', minWidth: 110, cursor: 'pointer', accentColor: C.accent } });
  const pctOut = h('span', { style: { fontSize: F.small, fontWeight: 800, color: C.accent, minWidth: 42, textAlign: 'right' } }, `${disp}%`);
  const stanceTip = InfoTip('');
  const setStanceTip = st => { const b = stanceTip.querySelector('[role="tooltip"]'); if (b) b.textContent = `${st.key}: ${st.note} Adjust it here and every figure recomputes live.`; };

  const confidence = h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 18 } },
    h('span', { style: { fontSize: F.tiny, fontWeight: 700, color: C.textMid, display: 'inline-flex', alignItems: 'center', gap: 8 } }, 'Confidence level', stanceTip),
    h('div', { style: { display: 'flex', gap: 6 } }, ...pills),
    slider, pctOut);

  /* ── Co-headlines ── */
  const netBig = h('div', { style: { fontSize: F.hero, fontWeight: 800, color: C.accent, lineHeight: 1, letterSpacing: '-3px', animation: 'glow 3s ease-in-out infinite' } });
  const setNet = counter(netBig, fmtK);
  const netSub = h('div', { style: { fontSize: F.small, color: C.textMuted, marginTop: 8, lineHeight: 1.5, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' } });
  const netCard = h('div', { style: { textAlign: 'center', padding: '26px 18px', background: C.surface, borderRadius: 22, border: `1px solid ${C.accent}30` } },
    netBig,
    h('div', { style: { fontSize: F.h3, color: C.textMid, marginTop: 14 } }, 'Potential annual cash saving'),
    netSub);

  const noNetCard = h('div', { style: { textAlign: 'center', padding: '26px 22px', background: C.surface, borderRadius: 22, border: `1px solid ${C.amber}55`, display: 'flex', flexDirection: 'column', justifyContent: 'center' } },
    h('div', { style: { fontSize: F.h1, fontWeight: 800, color: C.amber, lineHeight: 1.1 } }, 'No net cash saving'),
    h('div', { style: { fontSize: F.h3, color: C.textMid, marginTop: 8 } }, 'at this scale'));
  const noNetBody = h('div', { style: { fontSize: F.small, color: C.textMuted, marginTop: 12, lineHeight: 1.55 } });
  noNetCard.appendChild(noNetBody);

  const headlineSlot = h('div', null);
  const hoursBig = h('div', { style: { fontSize: F.hero, fontWeight: 800, color: C.accent, lineHeight: 1, letterSpacing: '-3px' } });
  const setHours = counter(hoursBig, fmtNum);
  const hoursCard = h('div', { style: { textAlign: 'center', padding: '26px 18px', background: C.surface, borderRadius: 22, border: `1px solid ${C.accent}30` } },
    hoursBig,
    h('div', { style: { fontSize: F.h3, color: C.textMid, marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8 } }, 'hours released each week ',
      InfoTip('These hours deliberately stay the same when you change the confidence level: they come from automating the day-to-day booking and matching work itself, whatever share of agency work moves to bank. The confidence level scales only the cash saving. Modelled as team size × 1 hour/day × 5 days.')),
    h('div', { style: { fontSize: F.small, color: C.textMuted, marginTop: 8, lineHeight: 1.5, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' } }, "Time your temporary staffing team gets back each week as Smart Match automates shift booking and matching, scaled to your team's size."));

  const headlines = h('div', { style: { ...fluidGrid(320), gap: 18, marginBottom: 14 } }, headlineSlot, hoursCard);

  track(res => {
    const noNet = res.netSaving <= 0;
    fill(headlineSlot, noNet ? noNetCard : netCard);
    if (noNet) {
      fill(noNetBody, 'The ', h('strong', { style: { color: C.textMid } }, `${fmt(res.platformCost)}/yr`), ' licence fee is larger than the ',
        h('strong', { style: { color: C.textMid } }, fmtK(res.agencySaving)),
        " agency premium you'd displace here. The value at this size is the released capacity and time below; the cash case grows with a larger bank or higher agency reliance.");
    } else {
      setNet(res.netSaving);
      fill(netSub, `What you could save each year by filling more shifts from your own bank instead of agency${res.adminSaving > 0 ? `, plus ${fmtK(res.adminSaving)} of admin time` : ''}, shown as an annual figure after the ${fmt(res.platformCost)}/yr licence fee.`);
    }
    setHours(res.timeSavedWeek);
  });

  /* ── Guardrails ── */
  const banner = (body, borderColour, bg) => h('div', { style: { marginBottom: 14, padding: '14px 20px', background: bg || C.accentSoft, border: `1px solid ${borderColour || C.accent}`, borderRadius: 14, fontSize: F.small, color: C.text, lineHeight: 1.5, display: 'none' } }, body);
  const exceeds = banner(frag(h('strong', null, 'Check your inputs.'), ' The modelled saving exceeds your agency spend. Try a lower premium or a lower confidence level.'));
  const adminOnly = banner(frag(h('strong', null, 'Admin time only.'), ' No agency premium saving is modelled (agency spend is zero), so this figure is the admin-time value on its own.'));
  const implausible = banner(frag(h('strong', { style: { color: C.amber } }, '⚠ Unusually high return.'), " At these inputs the modelled saving is more than 100 times the licence fee, which usually means a figure has been entered wrongly rather than a genuinely large bank. Check your agency spend and licence fee before quoting it."), C.amber + '66', C.surface);
  track(res => {
    const noNet = res.netSaving <= 0;
    exceeds.style.display = res.exceedsSpend ? 'block' : 'none';
    adminOnly.style.display = (res.adminOnly && !noNet) ? 'block' : 'none';
    implausible.style.display = (res.implausibleRoi && !noNet) ? 'block' : 'none';
  });

  /* ── KPI tiles. The admin tile only exists when admin time is in the total,
     so the row is rebuilt when that changes; the figures inside animate. ── */
  const kpiRow = h('div', { class: 'kpi-grid-3' });
  let kpiHasAdmin = null;
  let setPremium, setReturn, paybackVal, returnWrap, retNum;
  track(res => {
    const noNet = res.netSaving <= 0;
    const withAdmin = res.adminSaving > 0;
    if (withAdmin !== kpiHasAdmin) {
      kpiHasAdmin = withAdmin;
      const teamSize = Math.round(res.timeSavedWeek / (ADMIN_HRS_PER_DAY * 5));
      const adminTip = `${teamSize} ${teamSize === 1 ? 'person' : 'people'} × ${ADMIN_HRS_PER_DAY} h/day × ${ADMIN_WORKING_DAYS} working days × £${ADMIN_LOADED_HOURLY}/h (loaded) = ${fmt(res.adminSaving)}`;
      const premiumVal = h('span', { style: { display: 'inline-block' } });
      setPremium = counter(premiumVal, fmtK);
      const adminVal = h('span', { style: { display: 'inline-block' } });
      const setAdmin = withAdmin ? counter(adminVal, fmtK) : null;
      paybackVal = h('span', null);
      retNum = h('span', { style: { display: 'inline-block' } });
      returnWrap = h('span', null, retNum);
      setReturn = counter(retNum, fmtMultiple);
      const tiles = [
        KpiTile({ iconKey: 'pound', label: 'Agency premium avoided', value: premiumVal, sub: 'agency vs bank gap, excluding licence fee' }),
        ...(withAdmin ? [KpiTile({ iconKey: 'clock', label: 'Admin time saving', value: adminVal, sub: 'temp staffing team time, valued', tip: adminTip })] : []),
        KpiTile({ iconKey: 'calendar', label: 'Payback', value: paybackVal, sub: 'to recover the annual licence fee' }),
        KpiTile({ iconKey: 'check', label: 'Return', value: returnWrap, sub: 'net saving ÷ licence fee, per year' }),
      ];
      kpiRow.className = tiles.length === 4 ? 'kpi-grid-4' : 'kpi-grid-3';
      fill(kpiRow, ...tiles);
      if (setAdmin) setAdmin(res.adminSaving);
    }
    setPremium(res.agencySaving);
    paybackVal.textContent = noNet ? 'n/a' : fmtPayback(res.paybackMonths);
    if (res.roiMultiple == null || noNet) { fill(returnWrap, 'n/a'); }
    else { fill(returnWrap, res.implausibleRoi ? '⚠ ' : '', retNum); setReturn(res.roiMultiple); }
  });

  const annualNote = h('div', { style: { textAlign: 'center', fontSize: F.small, color: C.textMuted, lineHeight: 1.5, margin: '0 auto 28px', maxWidth: 760 } },
    'These are annual figures: the saving recurs every year Smart Match is in use.');
  track(res => { annualNote.style.display = res.netSaving <= 0 ? 'none' : 'block'; });

  /* ── How the cash saving is worked out ── */
  const bankRow = h('span', null), agencyRow = h('span', null), gapRow = h('span', null);
  const agencyLabel = h('span', null);
  const summaryLine = h('div', { style: { marginTop: 14, fontSize: F.small, color: C.textMid, lineHeight: 1.6 } });
  const equation = h('div', { style: { marginTop: 12, padding: '14px 18px', background: C.accentSoft, borderRadius: 12, border: `1px solid ${C.accent}30`, fontSize: F.small, color: C.textMid, lineHeight: 1.7 } });
  const footnote = h('div', { style: { marginTop: 14, fontSize: F.tiny, color: C.textMuted, fontStyle: 'italic', lineHeight: 1.6 } });

  const workedOut = Card({ marginBottom: 28, borderLeft: `3px solid ${C.accentMid}` },
    CTitle('pound', 'How the cash saving is worked out', C.accentMid),
    h('div', { style: { fontSize: F.small, color: C.text, lineHeight: 1.7, marginBottom: 14 } },
      'The saving is the ', h('strong', { style: { color: C.accent } }, 'extra'), ' an agency charges for a shift, over what the same shift would cost on your own bank: the premium, not the whole agency bill. We only count it on the shifts you can realistically move from agency to your bank.'),
    Row(h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } }, 'Your own bank (blended rate, all-in) ',
      InfoTip(`Already includes a ${Math.round(BANK_ONCOST * 100)}% employer on-cost (employer NI and pension) on top of raw Agenda for Change pay, below the full ~30% NHS rate because bank-only workers often opt out of the pension. This is the true cost of a bank shift; the saving is the gap between it and the agency rate, so on-costs are counted once, never twice.`)), bankRow),
    Row(agencyLabel, agencyRow),
    Row('Premium displaced = the saving', gapRow, true),
    summaryLine, equation, footnote);

  const rate = (shift, hr) => frag(fmt(shift), h('span', { style: { fontSize: F.tiny, color: C.textMuted, fontWeight: 400 } }, ` /shift · £${(hr || 0).toFixed(2)}/hr`));
  track(res => {
    const hrs = res.shiftHours || 8;
    const bankHr = res.bankShiftCost / hrs, agencyHr = res.agencyShiftCost / hrs;
    const gapShift = res.agencyShiftCost - res.bankShiftCost, gapHr = gapShift / hrs;
    // Round each term first so the displayed premium - licence = net equation adds up exactly.
    const grossR = Math.round(res.agencySaving), adminR = Math.round(res.adminSaving || 0), licR = Math.round(res.platformCost), netR = grossR + adminR - licR;
    fill(bankRow, rate(res.bankShiftCost, bankHr));
    fill(agencyRow, rate(res.agencyShiftCost, agencyHr));
    fill(gapRow, rate(gapShift, gapHr));
    agencyLabel.textContent = res.perGroupPremium ? 'Agency, same shift (your per-group premiums)' : `Agency, same shift (at ${res.premium}% premium)`;
    fill(summaryLine, h('strong', { style: { color: C.text } }, `£${gapHr.toFixed(2)}/hr`), ' on each of ',
      h('strong', { style: { color: C.text } }, fmtNum(res.displaced)), ' shifts moved to bank = ',
      h('strong', { style: { color: C.text } }, fmt(res.agencySaving)), ' gross a year.');
    equation.style.display = res.platformCost > 0 ? 'block' : 'none';
    fill(equation, h('strong', { style: { color: C.text } }, fmt(grossR)), ' premium',
      adminR > 0 ? frag(' + ', h('strong', { style: { color: C.text } }, fmt(adminR)), ' admin time') : '',
      ' − ', h('strong', { style: { color: C.text } }, fmt(licR)), ' licence fee = ',
      h('strong', { style: { color: netR > 0 ? C.accent : C.amber } }, netR >= 0 ? fmt(netR) : '−' + fmt(-netR)),
      ' net', netR > 0 ? ', the headline saving shown at the top.' : ', so the licence fee is larger than the premium at these inputs.');
    fill(footnote, `Bank rate = 2026/27 AfC blended midpoint, already including a ${Math.round(BANK_ONCOST * 100)}% employer on-cost (employer NI and pension, below the full ~30% NHS rate because bank-only workers often opt out of the pension), so on-costs are counted once and never added on top. Premium defaults to ~20%, reflecting figures cited in House of Commons Library research, deliberately conservative; it varies widely by role and shift (nursing ~35-50%, medics ~80-120%), so use your own rates where known.`,
      res.agencySpend != null
        ? (leadContext && leadContext.agencySpend != null
          ? ' Agency spend is the annual figure you supplied, which anchors the saving.'
          : ` Agency spend is estimated from your bank size using FY2025/26 national averages (~${fmt(AGENCY_SPEND_PER_REGISTERED_BANK_WORKER_GBP)} per registered bank worker), which anchors the saving.`)
        : '');
  });

  /* ── Capacity and wider value ── */
  const shiftsVal = h('span', null), backfillVal = h('span', null), relianceVal = h('span', null);
  const setShifts = counter(shiftsVal, fmtNum), setBackfill = counter(backfillVal, fmtK);
  const capacity = Card({ marginBottom: 28, borderLeft: `3px solid ${C.blue}` },
    CTitle('calendar', 'Capacity and wider value', C.blue),
    h('div', { style: { fontSize: F.small, color: C.textMid, lineHeight: 1.6, marginBottom: 16 } },
      'Filling more shifts from your own bank is real operational value: steadier rosters, better continuity of care and less last-minute reliance on agency. It is deliberately kept separate from the cash saving above and is never added to it.'),
    Row('More shifts filled from your own bank each year (off agency)', shiftsVal),
    Row('Bank backfill cost (spend, not saving)', backfillVal),
    Row('Agency reliance reduced', relianceVal),
    h('div', { style: { marginTop: 16, fontSize: F.small, color: C.textMid, lineHeight: 1.7 } },
      "These figures capture cash savings only. Smart Match also supports safer staffing, better continuity of care and a fairer, more flexible experience for your bank workers, real benefits we've deliberately not put a pound figure on."));
  track(res => {
    setShifts(res.displaced); setBackfill(res.capacityValue);
    fill(relianceVal, `${fmtPct1(res.fillNow)} → `, h('span', { style: { color: C.good, fontWeight: 800 } }, fmtPct1(res.fillAfter)));
  });

  /* ── Honest framing (mandatory) ── */
  const honest = Card({ marginBottom: 28, borderLeft: `3px solid ${C.amber}` },
    CTitle('lightbulb', 'How to read these numbers', C.amber),
    h('ul', { style: { margin: 0, paddingLeft: 22, fontSize: F.small, color: C.textMid, lineHeight: 1.75 } },
      h('li', null, 'These figures are ', h('strong', { style: { color: C.text } }, 'indicative'), ', not a guarantee or a quote.'),
      h('li', null, 'The evidence comes from a pilot study, a small ', h('strong', { style: { color: C.text } }, 'two-site vendor sample within a four-trust programme'), ', anonymised here as "a community trust" and "an acute trust". Results are not solely attributable to Smart Match.'),
      h('li', null, 'The ', h('strong', { style: { color: C.text } }, 'agency premium varies by role and shift'), "; the model is most credible when run on your own organisation's rates."),
      h('li', null, 'Better bank ', h('strong', { style: { color: C.text } }, 'utilisation is the mechanism'), '; the cash is the agency premium displaced. Capacity gained is coverage, not cash, and is reported separately above.')),
    h('div', { style: { marginTop: 16, padding: '14px 18px', background: C.surface2, borderRadius: 12, fontSize: F.small, color: C.textMid, lineHeight: 1.65, border: `1px solid ${C.borderLight}` } },
      h('strong', { style: { color: C.text } }, 'Strategically'), ', releasing cash and capacity from temporary staffing supports the ',
      h('strong', { style: { color: C.text } }, 'NHS 10 Year Plan'), ' and Workforce Paper, and the ',
      h('strong', { style: { color: C.text } }, 'Staff Health & Wellbeing CQUIN'), '.'));

  /* ── Methodology ── */
  const methodBody = h('div', { style: { fontSize: F.small, color: C.textMid, lineHeight: 1.75 } },
    h('p', { style: { marginTop: 0 } }, h('strong', { style: { color: C.text } }, 'The cash saving'), ' is the agency premium displaced when improved utilisation moves temp duties off agency onto your own bank:'),
    h('div', { style: { fontFamily: 'ui-monospace, monospace', fontSize: F.small, color: C.text, background: C.bg, padding: '12px 14px', borderRadius: 10, marginBottom: 14, border: `1px solid ${C.borderLight}` } },
      'agency_saving = displaced_duties × bank_shift_cost × premium'),
    h('p', null, 'Filling a bank shift is itself ', h('strong', { style: { color: C.text } }, 'expenditure'), '; only the gap between an agency shift and the equivalent bank shift (the premium) is cash released. The premium here is ', h('strong', { style: { color: C.text } }, '20%'), ", a starting point that varies by role and shift; the model is most credible on your own organisation's rates."),
    h('p', null, h('strong', { style: { color: C.text } }, 'Admin time saving'), ' uses a per-person model: each member of the temporary staffing team recovers a conservative ', h('strong', { style: { color: C.text } }, '1 hour/day'), ' across 225 working days, valued at a loaded £18/hour (some teams report up to 2.5 hours/day; we deliberately use 1). The same hours feed the "time saved per week" co-headline.'),
    h('p', null, 'Pay assumptions use ', h('strong', { style: { color: C.text } }, '2026/27 NHS Agenda for Change midpoints'), ' (+3.3%; a band-mix weighted blended bank pay), 1,957.5 AfC hours/year, 8-hour shifts and a ', h('strong', { style: { color: C.text } }, `${Math.round(BANK_ONCOST * 100)}% employer on-cost (employer NI and pension)`), `, already included in the modelled bank shift costs and never added on top. Pay, hours and on-cost set the modelled shift counts, not the cash saving, which is anchored to agency spend, premium and confidence level. Agency spend is estimated at ~£${AGENCY_SPEND_PER_REGISTERED_BANK_WORKER_GBP.toLocaleString('en-GB')} per registered bank worker (FY2025/26), scaled from your bank size. Rate assumptions are deliberately conservative; the confidence level is yours to set.`),
    h('p', { style: { marginBottom: 0 } }, 'Outputs are ', h('strong', { style: { color: C.text } }, 'indicative'), ' and are recomputed live as you adjust the confidence level above.'));
  const methodology = Card({ marginBottom: 28, borderLeft: `3px solid ${C.seafoam}` }, Collapsible('How we calculated this', methodBody));

  /* ── Actions ── */
  const actions = h('div', { style: { display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', padding: '8px 0 32px' } },
    h('button', { type: 'button', style: { padding: '14px 32px', borderRadius: 14, border: `2px solid ${C.accent}`, background: 'transparent', color: C.accent, fontSize: F.body, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }, onClick: onAdjust }, '← Adjust inputs'),
    h('button', { type: 'button', style: { padding: '14px 32px', borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface, color: C.textMid, fontSize: F.body, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }, onClick: onStartOver }, 'Start over ↻'));

  const page = h('div', { style: { animation: 'rfade .5s ease-out' } },
    style,
    h('div', { style: { textAlign: 'center', padding: '14px 0 4px' } },
      h('div', { style: { fontSize: F.tiny, fontWeight: 700, color: C.textMuted, letterSpacing: 4, textTransform: 'uppercase' } }, 'Smart Match · Indicative ROI')),
    confidence, headlines, exceeds, adminOnly, kpiRow, implausible, annualNote,
    LeadCapture(() => r, () => ({ ...leadContext, displacement: disp, stance: stance(disp).key })), workedOut, capacity, honest, methodology, actions);

  /* Recompute and patch, without rebuilding anything. */
  const apply = v => {
    disp = v; touched = true;
    r = recalc(v);
    pctOut.textContent = `${disp}%`;
    slider.value = disp;
    slider.setAttribute('aria-valuetext', `${disp}% (${stance(disp).key})`);
    presets.forEach(([, pv], i) => setStyle(pills[i], pillStyle(disp === pv)));
    setStanceTip(stance(disp));
    updaters.forEach(fn => fn(r));
    onDisplacement(disp);
  };
  pills.forEach((p, i) => p.addEventListener('click', () => apply(presets[i][1])));
  slider.addEventListener('input', e => apply(Number(e.target.value)));

  setStanceTip(stance(disp));
  updaters.forEach(fn => fn(r));
  return page;
}
