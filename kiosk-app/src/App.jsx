import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { C, F, GUTTER, MAXW, KIOSK_STEPS } from './theme';
import { calc, DEFAULTS, platformCostFor, stance } from './calc/engine';
import { StepIndicator, NavButtons, PageTransition } from './components';
import { BankStep, AgencyStep, TeamStep, StanceStep } from './steps';
import { ResultsPage } from './results/ResultsPage';
import { AdminLeads } from './components/LeadCapture';
import rldatixLogo from './assets/rldatix-logo.png';

/* ────────────────────────────────────────────────────────────────────────
   RLD Smart Match — WEB version of the kiosk calculator.
   Same methodology, engine and step flow as the touchscreen build; the
   kiosk-only chrome (attract splash, idle-timeout reset, admin stats/PIN)
   is removed, the layout is fluid/mobile-responsive, and the page is
   embeddable in an iframe (auto-resize via postMessage — see the
   embed-snippet.html shipped alongside the build).
   Lead records saved by the results-page form can be reviewed at #admin-leads.
   ──────────────────────────────────────────────────────────────────────── */

// True when running inside an iframe (cross-origin parents throw on access).
const EMBEDDED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

function postToHost(msg) {
  if (!EMBEDDED) return;
  try { window.parent.postMessage(msg, '*'); } catch (e) { /* host gone; ignore */ }
}

/* Static start screen — the kiosk splash's content (eyebrow, title, intro,
   start button, RLDatix wordmark) without any of its animation: no particles,
   no pulse, no radial launch wipe. The white logo asset is rendered through a
   CSS mask so it takes the brand navy on the light background. */
function StartScreen({ onStart }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: `clamp(48px, 9vh, 110px) ${GUTTER} clamp(36px, 6vh, 70px)`, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: F.tiny, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase', color: C.accentMid, marginBottom: 28 }}>RLDatix | BankStaff+</div>
      <h1 style={{ fontSize: 'clamp(1.9rem, 5.2vw, 3rem)', fontWeight: 800, lineHeight: 1.15, color: C.text, margin: '0 0 20px', letterSpacing: '-0.5px' }}>
        Measure your ROI from<br />Smart Match AI
      </h1>
      <div style={{ width: 120, height: 5, borderRadius: 3, margin: '0 auto 26px', background: `linear-gradient(90deg, ${C.accentMid}, ${C.seafoam})` }} />
      <p style={{ fontSize: F.body, color: C.textMid, lineHeight: 1.65, margin: '0 auto 12px', maxWidth: 640 }}>
        Smart Match, a new BankStaff+ feature, automatically connects your bank workforce with vacant shifts through Loop, to improve fill rates, lower agency usage, and reduce the administrative burden.
      </p>
      <p style={{ fontSize: F.body, color: C.text, fontWeight: 600, margin: '0 auto 36px', maxWidth: 640 }}>
        See how much your organisation could save with Smart Match.
      </p>
      <button onClick={onStart} style={{
        padding: '16px 56px', borderRadius: 999, border: 'none', background: C.accent, color: '#fff',
        fontSize: F.h3, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1,
      }}>Get started →</button>
      <div role="img" aria-label="RLDatix" style={{
        width: 120, height: 24, marginTop: 'clamp(36px, 7vh, 70px)', background: C.navy, opacity: 0.75,
        WebkitMaskImage: `url(${rldatixLogo})`, maskImage: `url(${rldatixLogo})`,
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain', maskSize: 'contain',
        WebkitMaskPosition: 'center', maskPosition: 'center',
      }} />
      <div style={{ fontSize: F.tiny, color: C.textMuted, marginTop: 10 }}>Smart Match · Bank-Staff Utilisation ROI</div>
    </div>
  );
}

function CalibratingScreen({ onDone }) {
  const [step, setStep] = useState(0);
  const [barW, setBarW] = useState(0);
  const steps = ['Reading your bank pool', 'Modelling agency displacement', 'Valuing released admin time', 'Building your ROI'];
  useEffect(() => {
    const t = [
      setTimeout(() => { setStep(1); setBarW(25); }, 500),
      setTimeout(() => { setStep(2); setBarW(50); }, 1100),
      setTimeout(() => { setStep(3); setBarW(75); }, 1700),
      setTimeout(() => setBarW(100), 2200),
      setTimeout(onDone, 2500),
    ];
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '12vh 20px 80px', minHeight: '70vh' }}>
      <style>{`
        @keyframes calSpin { to { transform: rotate(360deg); } }
        @keyframes calPulse { 0%,100% { opacity:.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.02); } }
      `}</style>
      <div style={{ position: 'relative', width: 84, height: 84, marginBottom: 36 }}>
        <div style={{ position: 'absolute', inset: 0, border: '4px solid ' + C.border, borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, border: '4px solid transparent', borderTopColor: C.accent, borderRightColor: C.accent, borderRadius: '50%', animation: 'calSpin .8s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 14, border: '3px solid transparent', borderTopColor: C.accentMid, borderRadius: '50%', animation: 'calSpin 1.4s linear infinite reverse' }} />
      </div>
      <div style={{ fontSize: F.h1, fontWeight: 800, color: C.accent, marginBottom: 10, animation: 'calPulse 2s ease-in-out infinite', textAlign: 'center' }}>Calibrating your model</div>
      <div style={{ fontSize: F.body, color: C.textMuted, marginBottom: 36, textAlign: 'center' }}>{'Analysing ' + (step < 2 ? 'inputs' : 'workforce impact') + '...'}</div>
      <div style={{ width: 420, maxWidth: '80%', height: 6, background: C.border, borderRadius: 3, marginBottom: 32, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: barW + '%', background: 'linear-gradient(90deg, ' + C.accent + ', ' + C.accentMid + ')', borderRadius: 3, transition: 'width .5s ease-out' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 420, maxWidth: '80%' }}>
        {steps.map((label, i) => {
          const done = step > i, active = step === i;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: done ? 1 : active ? 0.9 : 0.2, transform: done || active ? 'translateX(0)' : 'translateX(-8px)', transition: 'all .4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: done ? C.accent : active ? C.accent + '30' : C.border, border: active ? '2px solid ' + C.accent : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .3s' }}>
                {done && <span style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>{'✓'}</span>}
                {active && <div style={{ width: 8, height: 8, borderRadius: 4, background: C.accent }} />}
              </div>
              <span style={{ fontSize: F.body, fontWeight: active ? 700 : 400, color: done ? C.accent : active ? C.text : C.textMuted, transition: 'all .3s' }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// The web version lands on the Moderate stance (26%) for a stronger first impression.
// The engine's DEFAULTS.displacement stays the conservative 13% baseline used by
// the model and the golden tests; this only sets the UI's starting/reset value.
const START_DISPLACEMENT = 26;

// Seed the bank-staff pool slider at 2000 (a mid-size trust); every figure
// recomputes from it. The engine's DEFAULTS.bankPool (660) is left as the
// golden tests' fixed baseline; this only sets the UI's starting/reset value.
const START_BANKPOOL = 2000;

export default function App() {
  const [showStart, setShowStart] = useState(true);            // static landing screen (kiosk splash, sans animation)
  const [stanceTouched, setStanceTouched] = useState(false);   // no confidence box highlighted until the user picks one
  const [kioskStep, setKioskStep] = useState(0);
  const [calibrating, setCalibrating] = useState(false);
  const [adminLeads, setAdminLeads] = useState(typeof window !== 'undefined' && window.location.hash === '#admin-leads');

  // Quick variant inputs (+ the modelling-stance displacement flexed live on Results).
  const [bankPool, setBankPool] = useState(START_BANKPOOL);
  const [agencyFillRate, setAgencyFillRate] = useState(DEFAULTS.agencyFillRate);
  const [numManagers, setNumManagers] = useState(DEFAULTS.numManagers);
  const [displacement, setDisplacement] = useState(START_DISPLACEMENT);
  const [includeAdmin, setIncludeAdmin] = useState(null);  // temporary-staffing-team time in the cash total; null = undecided (a required Yes/No before leaving Step 3)

  // Agency spend is not asked for (casual web visitors won't know it); the engine
  // derives it from bank size (£2,700/registered worker) as its fallback.
  const rQuick = useMemo(() => calc({ bankPool, agencyFillRate, numManagers, displacement, includeAdmin, platformCost: platformCostFor(bankPool) }),
    [bankPool, agencyFillRate, numManagers, displacement, includeAdmin]);
  const r = rQuick;
  const chooseStance = useCallback((v) => { setDisplacement(v); setStanceTouched(true); }, []);
  const steps = KIOSK_STEPS;
  const RESULTS_STEP = steps.length - 1;

  const handleCalculate = useCallback(() => setCalibrating(true), []);
  const handleCalibrationDone = useCallback(() => {
    setCalibrating(false);
    setKioskStep(RESULTS_STEP);
  }, [RESULTS_STEP]);

  const handleAdjust = useCallback(() => setKioskStep(0), []);

  const resetAll = useCallback(() => {
    setBankPool(START_BANKPOOL); setAgencyFillRate(DEFAULTS.agencyFillRate);
    setNumManagers(DEFAULTS.numManagers); setDisplacement(START_DISPLACEMENT);
    setIncludeAdmin(null); setStanceTouched(false);
  }, []);

  // "Start over": back to the start screen with defaults.
  const handleStartOver = useCallback(() => {
    setShowStart(true); setKioskStep(0); setCalibrating(false); resetAll();
  }, [resetAll]);

  // #admin-leads reviews locally stored lead-form submissions (ported from the
  // Galen/EPR calculator's admin view). Hash-driven so it needs no UI affordance.
  useEffect(() => {
    const onHash = () => setAdminLeads(window.location.hash === '#admin-leads');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Iframe embed: report our content height to the host page whenever it
  // changes, so the host can size the iframe with no inner scrollbar.
  useEffect(() => {
    if (!EMBEDDED) return;
    let raf = 0;
    const post = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        postToHost({ type: 'smartmatch-roi-resize', height: h });
      });
    };
    const ro = new ResizeObserver(post);
    ro.observe(document.documentElement);
    ro.observe(document.body);
    post();
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  // On step change scroll back to the top — inside the page when standalone,
  // via the host when embedded (the iframe is full-height, so only the host
  // page can actually scroll).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    postToHost({ type: 'smartmatch-roi-scroll-top' });
  }, [kioskStep, calibrating, showStart]);

  const renderStep = () => {
    switch (kioskStep) {
      case 0: return <BankStep bankPool={bankPool} setBankPool={setBankPool} />;
      case 1: return <AgencyStep agencyFillRate={agencyFillRate} setAgencyFillRate={setAgencyFillRate} />;
      case 2: return <TeamStep numManagers={numManagers} setNumManagers={setNumManagers} includeAdmin={includeAdmin} setIncludeAdmin={setIncludeAdmin} />;
      case 3: return <StanceStep displacement={displacement} chosen={stanceTouched} setDisplacement={chooseStance} />;
      case 4: return <ResultsPage r={rQuick} displacement={displacement} chosen={stanceTouched} setDisplacement={chooseStance} onAdjust={handleAdjust} onStartOver={handleStartOver}
        leadContext={{ bankPool, agencyFillRate, numManagers, displacement, includeAdmin, stance: stance(displacement).key }} />;
      default: return null;
    }
  };

  const shell = { fontFamily: "'DM Sans Variable', 'DM Sans', sans-serif", background: C.bg, width: '100%', minHeight: EMBEDDED ? undefined : '100vh', color: C.text, lineHeight: 1.55, position: 'relative', zIndex: 0 };

  if (adminLeads) {
    return <div style={shell}><AdminLeads onClose={() => { window.location.hash = ''; }} /></div>;
  }

  if (showStart) {
    return <div style={shell}><StartScreen onStart={() => setShowStart(false)} /></div>;
  }

  if (calibrating) {
    return <div style={shell}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <CalibratingScreen onDone={handleCalibrationDone} />
      </div>
    </div>;
  }

  return (
    <div style={shell}>
      <div style={{ maxWidth: MAXW, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ padding: `clamp(18px, 3vw, 36px) ${GUTTER} 0` }}>
          <StepIndicator steps={steps} current={kioskStep} onJump={setKioskStep} />
        </div>
        <div style={{ padding: `0 ${GUTTER} 8px` }}>
          <PageTransition step={kioskStep}>{renderStep()}</PageTransition>
        </div>
        <NavButtons step={kioskStep} totalSteps={steps.length}
          nextDisabled={kioskStep === 2 && includeAdmin == null}
          onBack={() => setKioskStep(p => p - 1)} onNext={() => setKioskStep(p => p + 1)}
          onCalculate={handleCalculate} onHome={handleStartOver} />
      </div>
    </div>
  );
}
