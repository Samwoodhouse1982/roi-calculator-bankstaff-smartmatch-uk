/* ────────────────────────────────────────────────────────────────────────
   RLDatix Smart Match: Workforce ROI calculator, plain JS.

   No framework, no build step, no JSX. Identical methodology, engine, step
   flow and wording to the React build: they share src/calc/engine.js,
   src/theme.js, src/dataLayer.js and src/lead/core.js verbatim, so the
   figures, the PDF and the HubSpot submission cannot differ between them.

   State is a plain object. Navigating rebuilds the current screen; within
   the results screen the figures are patched in place. That is the whole
   architecture.
   ──────────────────────────────────────────────────────────────────────── */
import { h, fill } from './dom';
import { C, F, GUTTER, MAXW, KIOSK_STEPS, fmtK, fmtNum } from '../src/theme';
import { calc, DEFAULTS, platformCostFor, stance } from '../src/calc/engine';
import { buildData, publishData } from '../src/dataLayer';
import { StepIndicator, NavButtons } from './ui';
import { BankStep, AgencyStep, TeamStep, StanceStep } from './steps';
import { ResultsPage } from './results';
import { AdminLeads } from './lead';
import rldatixLogo from '../src/assets/rldatix-logo.png';

// True when running inside an iframe (cross-origin parents throw on access).
const EMBEDDED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

function postToHost(msg) {
  if (!EMBEDDED) return;
  try { window.parent.postMessage(msg, '*'); } catch (e) { /* host gone; ignore */ }
}

// The web version lands on the Moderate stance (26%) for a stronger first
// impression, and seeds the bank pool at a mid-size trust. The engine's own
// DEFAULTS stay the conservative baseline the golden tests are pinned to;
// these only set the UI's starting and reset values.
const START_DISPLACEMENT = 26;
const START_BANKPOOL = 2000;

const initialState = () => ({
  bankPool: START_BANKPOOL,
  agencyFillRate: DEFAULTS.agencyFillRate,
  numManagers: DEFAULTS.numManagers,
  displacement: START_DISPLACEMENT,
  includeAdmin: null,   // required Yes/No before leaving step 3; null = undecided
  agencySpend: null,    // optional actual spend; null = use the per-worker estimate
  stanceTouched: false, // no confidence preset is highlighted until one is picked
});

/* Static start screen. The white wordmark asset is rendered through a CSS
   mask so it takes the brand navy on the light background. */
function StartScreen(onStart) {
  return h('div', { style: { maxWidth: 760, margin: '0 auto', padding: `clamp(48px, 9vh, 110px) ${GUTTER} clamp(36px, 6vh, 70px)`, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' } },
    h('div', { style: { fontSize: F.tiny, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase', color: C.accentMid, marginBottom: 28 } }, 'RLDatix | BankStaff+'),
    h('h1', { style: { fontSize: 'clamp(1.9rem, 5.2vw, 3rem)', fontWeight: 800, lineHeight: 1.15, color: C.text, margin: '0 0 20px', letterSpacing: '-0.5px' } },
      'Measure your ROI from', h('br'), 'Smart Match AI'),
    h('div', { style: { width: 120, height: 5, borderRadius: 3, margin: '0 auto 26px', background: `linear-gradient(90deg, ${C.accentMid}, ${C.seafoam})` } }),
    h('p', { style: { fontSize: F.body, color: C.textMid, lineHeight: 1.65, margin: '0 auto 12px', maxWidth: 640 } },
      'Smart Match, a new BankStaff+ feature, automatically connects your bank workforce with vacant shifts through Loop, to improve fill rates, lower agency usage, and reduce the administrative burden.'),
    h('p', { style: { fontSize: F.body, color: C.text, fontWeight: 600, margin: '0 auto 36px', maxWidth: 640 } },
      'See how much your organisation could save with Smart Match.'),
    h('button', { type: 'button', style: { padding: '16px 56px', borderRadius: 999, border: 'none', background: C.accent, color: '#fff', fontSize: F.h3, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1 }, onClick: onStart }, 'Get started →'),
    h('div', { role: 'img', 'aria-label': 'RLDatix', style: { width: 120, height: 24, marginTop: 'clamp(36px, 7vh, 70px)', background: C.navy, opacity: 0.75, WebkitMaskImage: `url(${rldatixLogo})`, maskImage: `url(${rldatixLogo})`, WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskPosition: 'center', maskPosition: 'center' } }),
    h('div', { style: { fontSize: F.tiny, color: C.textMuted, marginTop: 10 } }, 'Smart Match · Bank-Staff Utilisation ROI'));
}

function CalibratingScreen(onDone) {
  const labels = ['Reading your bank pool', 'Modelling agency displacement', 'Valuing released admin time', 'Building your ROI'];
  const bar = h('div', { style: { height: '100%', width: '0%', background: `linear-gradient(90deg, ${C.accent}, ${C.accentMid})`, borderRadius: 3, transition: 'width .5s ease-out' } });
  const sub = h('div', { style: { fontSize: F.body, color: C.textMuted, marginBottom: 36, textAlign: 'center' } }, 'Analysing inputs...');
  const rows = labels.map(label => {
    const dot = h('div', { style: { width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: C.border, border: '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .3s' } });
    const text = h('span', { style: { fontSize: F.body, fontWeight: 400, color: C.textMuted, transition: 'all .3s' } }, label);
    const row = h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, opacity: 0.2, transform: 'translateX(-8px)', transition: 'all .4s cubic-bezier(0.16, 1, 0.3, 1)' } }, dot, text);
    return { row, dot, text };
  });

  const paint = step => {
    rows.forEach(({ row, dot, text }, i) => {
      const done = step > i, active = step === i;
      row.style.opacity = done ? '1' : active ? '0.9' : '0.2';
      row.style.transform = (done || active) ? 'translateX(0)' : 'translateX(-8px)';
      dot.style.background = done ? C.accent : active ? C.accent + '30' : C.border;
      dot.style.border = active ? '2px solid ' + C.accent : '2px solid transparent';
      fill(dot, done ? h('span', { style: { color: '#fff', fontSize: 15, fontWeight: 800 } }, '✓')
        : active ? h('div', { style: { width: 8, height: 8, borderRadius: 4, background: C.accent } }) : '');
      text.style.fontWeight = active ? '700' : '400';
      text.style.color = done ? C.accent : active ? C.text : C.textMuted;
    });
    sub.textContent = 'Analysing ' + (step < 2 ? 'inputs' : 'workforce impact') + '...';
  };
  paint(0);

  const timers = [
    setTimeout(() => { paint(1); bar.style.width = '25%'; }, 500),
    setTimeout(() => { paint(2); bar.style.width = '50%'; }, 1100),
    setTimeout(() => { paint(3); bar.style.width = '75%'; }, 1700),
    setTimeout(() => { bar.style.width = '100%'; }, 2200),
    setTimeout(onDone, 2500),
  ];

  const el = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '12vh 20px 80px', minHeight: '70vh' } },
    h('style', null, '@keyframes calSpin { to { transform: rotate(360deg); } } @keyframes calPulse { 0%,100% { opacity:.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.02); } }'),
    h('div', { style: { position: 'relative', width: 84, height: 84, marginBottom: 36 } },
      h('div', { style: { position: 'absolute', inset: 0, border: '4px solid ' + C.border, borderRadius: '50%' } }),
      h('div', { style: { position: 'absolute', inset: 0, border: '4px solid transparent', borderTopColor: C.accent, borderRightColor: C.accent, borderRadius: '50%', animation: 'calSpin .8s linear infinite' } }),
      h('div', { style: { position: 'absolute', inset: 14, border: '3px solid transparent', borderTopColor: C.accentMid, borderRadius: '50%', animation: 'calSpin 1.4s linear infinite reverse' } })),
    h('div', { style: { fontSize: F.h1, fontWeight: 800, color: C.accent, marginBottom: 10, animation: 'calPulse 2s ease-in-out infinite', textAlign: 'center' } }, 'Calibrating your model'),
    sub,
    h('div', { style: { width: 420, maxWidth: '80%', height: 6, background: C.border, borderRadius: 3, marginBottom: 32, overflow: 'hidden' } }, bar),
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, width: 420, maxWidth: '80%' } }, ...rows.map(x => x.row)));
  el._cancel = () => timers.forEach(clearTimeout);
  return el;
}

export function mount(root) {
  root.textContent = '';        // clears the no-JS fallback that lives in #root
  let state = initialState();
  let screen = 'start';          // start | steps | calibrating | admin
  let step = 0;
  let current = null;            // the mounted screen node, for teardown
  let first = true;              // do not steal focus on the very first paint

  const steps = KIOSK_STEPS;
  const RESULTS_STEP = steps.length - 1;

  const compute = (d = state.displacement) => calc({
    bankPool: state.bankPool, agencyFillRate: state.agencyFillRate, numManagers: state.numManagers,
    displacement: d, includeAdmin: state.includeAdmin, agencySpend: state.agencySpend,
    platformCost: platformCostFor(state.bankPool),
  });

  /* Data layer: republish on every change so a host page can read
     window.smartMatchROIData (see DATA-LAYER-REFERENCE.md). Never blocks. */
  const publish = () => {
    publishData(buildData(compute(), {
      bankPool: state.bankPool, agencyFillRate: state.agencyFillRate, numManagers: state.numManagers,
      displacement: state.displacement, includeAdmin: state.includeAdmin, agencySpend: state.agencySpend,
      calcAt: d => compute(d),
    }));
  };

  const set = (key, value) => { state[key] = value; publish(); syncNav(); };

  const shell = h('div', { style: { fontFamily: "'DM Sans Variable', 'DM Sans', sans-serif", background: C.bg, width: '100%', minHeight: EMBEDDED ? null : '100vh', color: C.text, lineHeight: 1.55, position: 'relative', zIndex: 0 } });

  /* A screen change replaces the whole view, so without this a screen-reader
     or keyboard user is left where they were, on a button that no longer
     exists. tabindex="-1" makes the region focusable programmatically only,
     so it never joins the tab order. */
  const body = h('div', { tabindex: '-1', style: { outline: 'none' } });

  /* Results are computed after a pause and land off-screen for anyone not
     watching the page. A polite live region announces the headline once. */
  const announcer = h('div', {
    role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true',
    style: { position: 'absolute', width: 1, height: 1, margin: -1, padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 },
  });
  shell.appendChild(announcer);
  shell.appendChild(body);
  root.appendChild(shell);

  let navEl = null;
  const syncNav = () => {
    if (screen !== 'steps' || !navEl) return;
    // Only step 3's Next is conditional, on the required admin-time decision.
    const btn = navEl.querySelector('button:last-of-type');
    if (step === 2 && btn) {
      const blocked = state.includeAdmin == null;
      btn.disabled = blocked;
      btn.style.background = blocked ? C.border : C.accent;
      btn.style.color = blocked ? C.textMuted : '#fff';
      btn.style.cursor = blocked ? 'not-allowed' : 'pointer';
    }
  };

  const go = next => { step = next; render(); };

  const startOver = () => { state = initialState(); screen = 'start'; step = 0; render(); };

  function render() {
    if (current && current._cancel) current._cancel();
    let view;

    if (screen === 'admin') {
      view = AdminLeads(() => { window.location.hash = ''; });
    } else if (screen === 'start') {
      view = StartScreen(() => { screen = 'steps'; step = 0; render(); });
    } else if (screen === 'calibrating') {
      view = h('div', { style: { position: 'relative', zIndex: 1 } },
        CalibratingScreen(() => { screen = 'steps'; step = RESULTS_STEP; render(); }));
      current = view.firstChild;
    } else if (step === RESULTS_STEP) {
      view = h('div', { style: { maxWidth: MAXW, margin: '0 auto', position: 'relative', zIndex: 1 } },
        h('div', { style: { padding: `clamp(18px, 3vw, 36px) ${GUTTER} 0` } }, StepIndicator(steps, step, go)),
        h('div', { style: { padding: `0 ${GUTTER} 8px` } }, ResultsPage({
          r0: compute(), displacement: state.displacement, chosen: state.stanceTouched,
          recalc: d => compute(d),
          onDisplacement: d => { state.displacement = d; state.stanceTouched = true; publish(); },
          onAdjust: () => go(0),
          onStartOver: startOver,
          leadContext: { bankPool: state.bankPool, agencyFillRate: state.agencyFillRate, numManagers: state.numManagers, displacement: state.displacement, includeAdmin: state.includeAdmin, agencySpend: state.agencySpend, stance: stance(state.displacement).key },
        })));
    } else {
      const page = [BankStep, AgencyStep, TeamStep, StanceStep][step](state, set);
      page.style.animation = 'kSlideUp .4s cubic-bezier(0.16, 1, 0.3, 1)';
      navEl = NavButtons({
        step, totalSteps: steps.length,
        nextDisabled: step === 2 && state.includeAdmin == null,
        onBack: () => go(step - 1),
        onNext: () => go(step + 1),
        onCalculate: () => { screen = 'calibrating'; render(); },
        onHome: startOver,
      });
      view = h('div', { style: { maxWidth: MAXW, margin: '0 auto', position: 'relative', zIndex: 1 } },
        h('div', { style: { padding: `clamp(18px, 3vw, 36px) ${GUTTER} 0` } }, StepIndicator(steps, step, go)),
        h('div', { style: { padding: `0 ${GUTTER} 8px` } }, page),
        navEl);
    }

    fill(body, view);
    if (screen !== 'calibrating') current = null;

    // Move focus to the new screen, and announce the result when there is one.
    if (!first) body.focus({ preventScroll: true });
    first = false;
    if (screen === 'steps' && step === RESULTS_STEP) {
      const res = compute();
      announcer.textContent = res.netSaving > 0
        ? `Results ready. Potential annual cash saving ${fmtK(res.netSaving)}, and ${fmtNum(res.timeSavedWeek)} hours released each week.`
        : `Results ready. No net cash saving at this scale. ${fmtNum(res.timeSavedWeek)} hours released each week.`;
    } else {
      announcer.textContent = '';
    }

    // On screen change scroll back to the top: inside the page when standalone,
    // via the host when embedded (the iframe is full height, so only the host
    // page can actually scroll).
    window.scrollTo({ top: 0, behavior: 'auto' });
    postToHost({ type: 'smartmatch-roi-scroll-top' });
  }

  // #admin-leads reviews locally stored lead-form submissions. Hash-driven, so
  // it needs no UI affordance.
  const onHash = () => {
    const admin = window.location.hash === '#admin-leads';
    if (admin && screen !== 'admin') { screen = 'admin'; render(); }
    else if (!admin && screen === 'admin') { screen = 'start'; render(); }
  };
  window.addEventListener('hashchange', onHash);
  if (window.location.hash === '#admin-leads') screen = 'admin';

  // Iframe embed: report our content height to the host whenever it changes,
  // so the host can size the iframe with no inner scrollbar. Measured on the
  // mounted root, not the document: scrollHeight on documentElement is defined
  // as at least the viewport height, which makes the frame ratchet and never
  // shrink again.
  if (EMBEDDED && typeof ResizeObserver !== 'undefined') {
    let raf = 0;
    const post = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => postToHost({ type: 'smartmatch-roi-resize', height: Math.ceil(shell.getBoundingClientRect().height) }));
    };
    new ResizeObserver(post).observe(shell);
    post();
  }

  render();
  publish();
}
