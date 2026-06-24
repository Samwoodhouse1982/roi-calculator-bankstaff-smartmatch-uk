import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { C, F, W, H, KIOSK_STEPS, fmtK, fmtNum } from './theme';
import { SplashScreen } from './components/SplashScreen';
import { BackgroundParticles } from './components/BackgroundParticles';
import { calc, calcDetailed, DEFAULTS, DETAILED_DEFAULTS, buildOrg } from './calc/engine';
import { StepIndicator, NavButtons, PageTransition, BigChoice } from './components';
import { BankStep, AgencyStep, TeamStep } from './steps';
import { OrgStep, GroupsStep, AssumptionsStep } from './steps/detailed';
import { ResultsPage } from './results/ResultsPage';

/* ────────────────────────────────────────────────────────────────────────
   COMPLETION TRACKING + ADMIN STATS (localStorage-backed)
   Reveal: single tap on RLDatix logo on splash
   Reset: PIN-protected (default 2580 - vertical line on phone keypad)
   ──────────────────────────────────────────────────────────────────────── */
const STATS_KEY = 'smartmatch-kiosk-stats';
const ADMIN_PIN = '2580'; // 4-digit numeric. Change to your preferred PIN.

function recordCompletion(session) {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const data = raw ? JSON.parse(raw) : { sessions: [], total: 0 };
    data.sessions.push({ ts: Date.now(), ...session });
    data.total = (data.total || 0) + 1;
    if (data.sessions.length > 1000) data.sessions = data.sessions.slice(-1000);
    localStorage.setItem(STATS_KEY, JSON.stringify(data));
  } catch (e) { /* ignore */ }
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { sessions: [], total: 0 };
    const data = JSON.parse(raw);
    if (!Array.isArray(data.sessions)) {
      localStorage.removeItem(STATS_KEY);
      return { sessions: [], total: 0 };
    }
    return { sessions: data.sessions, total: data.total || 0 };
  } catch (e) {
    try { localStorage.removeItem(STATS_KEY); } catch (e2) {}
    return { sessions: [], total: 0 };
  }
}

function resetStats() {
  try { localStorage.removeItem(STATS_KEY); } catch (e) { /* ignore */ }
}

// Compute aggregated stats: totals + cumulative impact across all sessions.
function computeStats() {
  const { sessions, total } = loadSessions();
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const today = sessions.filter(s => s.ts >= oneDayAgo).length;
  const last = sessions.length ? sessions[sessions.length - 1].ts : null;

  const cum = sessions.reduce((acc, s) => ({
    netSaving: acc.netSaving + (s.netSaving || 0),
    agencySaving: acc.agencySaving + (s.agencySaving || 0),
    adminSaving: acc.adminSaving + (s.adminSaving || 0),
    displaced: acc.displaced + (s.displaced || 0),
    timeSavedWeek: acc.timeSavedWeek + (s.timeSavedWeek || 0),
  }), { netSaving: 0, agencySaving: 0, adminSaving: 0, displaced: 0, timeSavedWeek: 0 });

  const avgBankPool = sessions.length ? Math.round(sessions.reduce((s, x) => s + (x.bankPool || 0), 0) / sessions.length) : 0;

  return { total, today, last, cum, avgBankPool };
}

function PinKeypad({ onSubmit, onCancel, error }) {
  const [pin, setPin] = useState('');
  const handleDigit = (d) => {
    if (pin.length < 4) {
      const next = pin + d;
      setPin(next);
      if (next.length === 4) setTimeout(() => onSubmit(next), 150);
    }
  };
  const handleClear = () => setPin('');
  useEffect(() => { if (error) setPin(''); }, [error]);
  return (
    <div style={{ background: C.surface, padding: '36px 40px', borderRadius: 24, border: '1px solid ' + C.border, maxWidth: 420 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.amber, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>Restricted</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 6 }}>Enter PIN to reset stats</div>
      <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 24 }}>Resetting stats cannot be undone.</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 22, height: 28 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 18, height: 18, borderRadius: '50%',
            background: i < pin.length ? C.accent : 'transparent',
            border: '2px solid ' + (i < pin.length ? C.accent : C.border),
            transition: 'all .15s'
          }} />
        ))}
      </div>
      {error && <div style={{ textAlign: 'center', fontSize: 13, color: C.accent, fontWeight: 600, marginBottom: 14 }}>Incorrect PIN. Try again.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        {['1','2','3','4','5','6','7','8','9'].map(d => (
          <button key={d} onClick={() => handleDigit(d)} style={{
            padding: '20px 0', borderRadius: 14, border: '1px solid ' + C.border,
            background: C.bg, color: C.text, fontSize: 24, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'background .1s'
          }}>{d}</button>
        ))}
        <button onClick={handleClear} style={{
          padding: '20px 0', borderRadius: 14, border: '1px solid ' + C.border,
          background: C.bg, color: C.textMuted, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit'
        }}>Clear</button>
        <button onClick={() => handleDigit('0')} style={{
          padding: '20px 0', borderRadius: 14, border: '1px solid ' + C.border,
          background: C.bg, color: C.text, fontSize: 24, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit'
        }}>0</button>
        <button onClick={onCancel} style={{
          padding: '20px 0', borderRadius: 14, border: '1px solid ' + C.border,
          background: C.bg, color: C.textMuted, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit'
        }}>Cancel</button>
      </div>
    </div>
  );
}

function AdminOverlay({ onClose }) {
  const [stats, setStats] = useState(computeStats());
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const refresh = () => setStats(computeStats());
  useEffect(() => {
    const id = setInterval(refresh, 1500);
    return () => clearInterval(id);
  }, []);
  const handlePinSubmit = (entered) => {
    if (entered === ADMIN_PIN) {
      setPinError(false);
      setPinOpen(false);
      setConfirmReset(true);
    } else {
      setPinError(true);
    }
  };
  const handleConfirmReset = () => { resetStats(); setConfirmReset(false); refresh(); };
  const lastStr = stats.last ? new Date(stats.last).toLocaleString('en-GB') : 'never';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,36,0.94)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, overflow: 'auto' }}>
      {pinOpen ? (
        <PinKeypad onSubmit={handlePinSubmit} onCancel={() => { setPinOpen(false); setPinError(false); }} error={pinError} />
      ) : confirmReset ? (
        <div style={{ background: C.surface, padding: '36px 40px', borderRadius: 24, border: '1px solid ' + C.accent, maxWidth: 480 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>Final confirmation</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 12 }}>Reset all kiosk stats?</div>
          <div style={{ fontSize: 14, color: C.textMid, marginBottom: 24, lineHeight: 1.6 }}>This will permanently delete <strong style={{ color: C.text }}>{stats.total}</strong> recorded session{stats.total === 1 ? '' : 's'}. This action cannot be undone.</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button onClick={() => setConfirmReset(false)} style={{ padding: '12px 22px', borderRadius: 12, border: '1px solid ' + C.border, background: 'transparent', color: C.textMid, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={handleConfirmReset} style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: C.accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Yes, delete all stats</button>
          </div>
        </div>
      ) : (
      <div style={{ background: C.surface, padding: '36px 40px', borderRadius: 24, border: '1px solid ' + C.border, width: '100%', maxWidth: 720 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: 3, textTransform: 'uppercase' }}>Kiosk Stats</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.text, marginTop: 4 }}>ROI models run</div>
          </div>
          <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: C.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
        </div>

        {/* Top row: total + 24h */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
          <div style={{ padding: '18px 20px', background: C.bg, borderRadius: 14, border: '1px solid ' + C.borderLight }}>
            <div style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>All time</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: C.accent, lineHeight: 1.1, marginTop: 4 }}>{stats.total}</div>
          </div>
          <div style={{ padding: '18px 20px', background: C.bg, borderRadius: 14, border: '1px solid ' + C.borderLight }}>
            <div style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>Last 24 hours</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: C.accent, lineHeight: 1.1, marginTop: 4 }}>{stats.today}</div>
          </div>
        </div>

        {/* Cumulative impact */}
        {stats.total > 0 && <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 10 }}>Cumulative across all sessions (indicative)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div style={{ padding: '14px 16px', background: C.bg, borderRadius: 12, border: '1px solid ' + C.borderLight }}>
              <div style={{ fontSize: 11, color: C.textMuted }}>Net cash saving shown</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.accent, marginTop: 4 }}>{fmtK(stats.cum.netSaving)}</div>
            </div>
            <div style={{ padding: '14px 16px', background: C.bg, borderRadius: 12, border: '1px solid ' + C.borderLight }}>
              <div style={{ fontSize: 11, color: C.textMuted }}>Agency premium displaced</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.accent, marginTop: 4 }}>{fmtK(stats.cum.agencySaving)}</div>
            </div>
            <div style={{ padding: '14px 16px', background: C.bg, borderRadius: 12, border: '1px solid ' + C.borderLight }}>
              <div style={{ fontSize: 11, color: C.textMuted }}>Admin saving shown</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.amber, marginTop: 4 }}>{fmtK(stats.cum.adminSaving)}</div>
            </div>
            <div style={{ padding: '14px 16px', background: C.bg, borderRadius: 12, border: '1px solid ' + C.borderLight }}>
              <div style={{ fontSize: 11, color: C.textMuted }}>Temp duties displaced</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.good, marginTop: 4 }}>{fmtNum(stats.cum.displaced)}</div>
            </div>
            <div style={{ padding: '14px 16px', background: C.bg, borderRadius: 12, border: '1px solid ' + C.borderLight }}>
              <div style={{ fontSize: 11, color: C.textMuted }}>Avg bank workforce modelled</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginTop: 4 }}>{fmtNum(stats.avgBankPool)}</div>
            </div>
            <div style={{ padding: '14px 16px', background: C.bg, borderRadius: 12, border: '1px solid ' + C.borderLight }}>
              <div style={{ fontSize: 11, color: C.textMuted }}>Last completion</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 8, lineHeight: 1.4 }}>{lastStr}</div>
            </div>
          </div>
        </div>}

        {stats.total === 0 && <div style={{ padding: '24px', background: C.bg, borderRadius: 12, border: '1px solid ' + C.borderLight, textAlign: 'center', color: C.textMuted, fontSize: 14, marginBottom: 18 }}>
          No sessions recorded yet.
        </div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setPinOpen(true)} disabled={stats.total === 0} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid ' + C.border, background: 'transparent', color: stats.total === 0 ? C.textMuted : C.textMid, fontSize: 12, fontWeight: 600, cursor: stats.total === 0 ? 'default' : 'pointer', fontFamily: 'inherit', opacity: stats.total === 0 ? 0.4 : 1 }}>Reset stats (PIN required)</button>
        </div>
      </div>
      )}
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
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @keyframes calSpin { to { transform: rotate(360deg); } }
        @keyframes calPulse { 0%,100% { opacity:.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.02); } }
      `}</style>
      <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 48 }}>
        <div style={{ position: 'absolute', inset: 0, border: '4px solid ' + C.border, borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, border: '4px solid transparent', borderTopColor: C.accent, borderRightColor: C.accent, borderRadius: '50%', animation: 'calSpin .8s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 16, border: '3px solid transparent', borderTopColor: C.accentMid, borderRadius: '50%', animation: 'calSpin 1.4s linear infinite reverse' }} />
      </div>
      <div style={{ fontSize: F.h1, fontWeight: 800, color: C.accent, marginBottom: 12, animation: 'calPulse 2s ease-in-out infinite', textAlign: 'center' }}>Calibrating your model</div>
      <div style={{ fontSize: F.body, color: C.textMuted, marginBottom: 44, textAlign: 'center' }}>{'Analysing ' + (step < 2 ? 'inputs' : 'workforce impact') + '...'}</div>
      <div style={{ width: 420, maxWidth: '80%', height: 6, background: C.border, borderRadius: 3, marginBottom: 40, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: barW + '%', background: 'linear-gradient(90deg, ' + C.accent + ', ' + C.accentMid + ')', borderRadius: 3, transition: 'width .5s ease-out' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 420, maxWidth: '80%' }}>
        {steps.map((label, i) => {
          const done = step > i, active = step === i;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: done ? 1 : active ? 0.9 : 0.2, transform: done || active ? 'translateX(0)' : 'translateX(-8px)', transition: 'all .4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: done ? C.accent : active ? C.accent + '30' : C.border, border: active ? '2px solid ' + C.accent : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .3s' }}>
                {done && <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>{'✓'}</span>}
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

const DETAILED_STEPS = ["Organisation", "Staff groups", "Assumptions", "Results"];
const DETAILED_CONTEXT = [
  { title: "Why this matters", text: "Your organisation type sets a realistic starting shape (typical staff groups, bank headcounts and agency spend) which you then refine to your own trust on the next screen." },
  { title: "Why this matters", text: "Agency spend per staff group is the anchor for the saving. The cash released is the agency premium you stop paying when improved bank utilisation covers those duties, not the whole shift." },
  { title: "Why this matters", text: "A single official ~20% premium and a conservative displacement stance keep the headline defensible. Admin and recruitment levers are optional and off until you can substantiate them." },
];

/* The very first choice after the splash: which calculator to run. */
function ModeChooser({ onChoose }) {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: C.bg, width: W, minHeight: H, color: C.text, position: "relative", zIndex: 0, overflow: "hidden" }}>
      <BackgroundParticles />
      <div style={{ position: "relative", zIndex: 1, padding: "150px 72px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontSize: F.small, fontWeight: 700, color: C.accent, letterSpacing: 6, textTransform: "uppercase", marginBottom: 18 }}>Smart Match · Workforce ROI</div>
          <h1 style={{ fontSize: 68, fontWeight: 800, color: C.text, margin: "0 0 20px", letterSpacing: "-1.5px" }}>Choose your calculator</h1>
          <p style={{ fontSize: F.h3, color: C.textMid, maxWidth: 840, margin: "0 auto", lineHeight: 1.6 }}>
            Two ways to model the cash your trust could release by moving temporary work off agency and onto your own bank.
          </p>
        </div>
        <BigChoice value={null} onChange={onChoose} options={[
          { key: "quick", iconKey: "clock", label: "Quick estimate", desc: "Three simple inputs: bank pool, agency reliance, roster team. A fast, conservative headline in under a minute. Ideal for events and a first look.", tag: "Best for operational managers" },
          { key: "detailed", iconKey: "network", label: "Detailed / commercial", desc: "Model agency spend by staff group, with per-group pay and AfC bands, an editable premium and optional admin & recruitment levers. For a guided commercial conversation.", tag: "Best for Finance leads & Workforce Directors" },
        ]} />
      </div>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [flow, setFlow] = useState(null);          // null = chooser · "quick" · "detailed"
  const [kioskStep, setKioskStep] = useState(0);
  const [calibrating, setCalibrating] = useState(false);
  const [adminVisible, setAdminVisible] = useState(false);

  // Quick variant inputs (+ the modelling-stance displacement flexed live on Results).
  const [bankPool, setBankPool] = useState(DEFAULTS.bankPool);
  const [agencyFillRate, setAgencyFillRate] = useState(DEFAULTS.agencyFillRate);
  const [numManagers, setNumManagers] = useState(DEFAULTS.numManagers);
  const [displacement, setDisplacement] = useState(DEFAULTS.displacement);
  const [includeAdmin, setIncludeAdmin] = useState(true);   // roster-manager time in the cash total (on by default)

  // Detailed / commercial variant inputs.
  const [dPreset, setDPreset] = useState("acute");
  const [dGroups, setDGroups] = useState(() => buildOrg("acute"));
  const [dPremium, setDPremium] = useState(DETAILED_DEFAULTS.premium);
  const [dDisp, setDDisp] = useState(DETAILED_DEFAULTS.displacement);
  const [dPerGroup, setDPerGroup] = useState(false);
  const [dPlatform, setDPlatform] = useState(DETAILED_DEFAULTS.platformCost);
  const [dFill, setDFill] = useState(DETAILED_DEFAULTS.fillRateNow);
  const [dAdmin, setDAdmin] = useState(DETAILED_DEFAULTS.admin);
  const [dRecruit, setDRecruit] = useState(DETAILED_DEFAULTS.recruit);

  const rQuick = useMemo(() => calc({ bankPool, agencyFillRate, numManagers, displacement, includeAdmin }),
    [bankPool, agencyFillRate, numManagers, displacement, includeAdmin]);
  const rDet = useMemo(() => calcDetailed({ groups: dGroups, premium: dPremium, displacement: dDisp, perGroupPremium: dPerGroup, platformCost: dPlatform, admin: dAdmin, recruit: dRecruit, fillRateNow: dFill }),
    [dGroups, dPremium, dDisp, dPerGroup, dPlatform, dAdmin, dRecruit, dFill]);
  const isDetailed = flow === "detailed";
  const r = isDetailed ? rDet : rQuick;
  const steps = isDetailed ? DETAILED_STEPS : KIOSK_STEPS;
  const RESULTS_STEP = steps.length - 1;

  const pickPreset = useCallback((k) => { setDPreset(k); setDGroups(buildOrg(k)); }, []);

  const handleCalculate = useCallback(() => setCalibrating(true), []);
  const handleCalibrationDone = useCallback(() => {
    setCalibrating(false);
    setKioskStep(RESULTS_STEP);
    recordCompletion({
      flow, netSaving: r.netSaving, agencySaving: r.agencySaving, adminSaving: r.adminSaving,
      displaced: r.displaced, timeSavedWeek: r.timeSavedWeek,
      bankPool: isDetailed ? r.totHead : bankPool,
    });
  }, [RESULTS_STEP, flow, isDetailed, r, bankPool]);

  const handleAdjust = useCallback(() => setKioskStep(0), []);

  const resetQuick = useCallback(() => {
    setBankPool(DEFAULTS.bankPool); setAgencyFillRate(DEFAULTS.agencyFillRate);
    setNumManagers(DEFAULTS.numManagers); setDisplacement(DEFAULTS.displacement); setIncludeAdmin(true);
  }, []);
  const resetDetailed = useCallback(() => {
    setDPreset("acute"); setDGroups(buildOrg("acute")); setDPremium(DETAILED_DEFAULTS.premium);
    setDDisp(DETAILED_DEFAULTS.displacement); setDPerGroup(false); setDPlatform(DETAILED_DEFAULTS.platformCost);
    setDFill(DETAILED_DEFAULTS.fillRateNow); setDAdmin(DETAILED_DEFAULTS.admin); setDRecruit(DETAILED_DEFAULTS.recruit);
  }, []);
  const resetAll = useCallback(() => { resetQuick(); resetDetailed(); }, [resetQuick, resetDetailed]);

  // Results "Start over": back to the attract splash, fully reset (next visitor).
  const handleStartOver = useCallback(() => {
    setShowSplash(true); setFlow(null); setKioskStep(0); setCalibrating(false); resetAll();
  }, [resetAll]);
  // Nav "Start over": back to the calculator chooser (lets you switch variant), reset.
  const handleResetInputs = useCallback(() => {
    setFlow(null); setKioskStep(0); setCalibrating(false); resetAll();
  }, [resetAll]);

  const chooseFlow = useCallback((k) => { setFlow(k); setKioskStep(0); }, []);

  const renderStep = () => {
    if (isDetailed) {
      switch (kioskStep) {
        case 0: return <OrgStep preset={dPreset} onPickPreset={pickPreset} groups={dGroups} setGroups={setDGroups} />;
        case 1: return <GroupsStep groups={dGroups} setGroups={setDGroups} perGroupPremium={dPerGroup} premium={dPremium} />;
        case 2: return <AssumptionsStep premium={dPremium} setPremium={setDPremium} perGroupPremium={dPerGroup} setPerGroupPremium={setDPerGroup}
          displacement={dDisp} setDisplacement={setDDisp} platformCost={dPlatform} setPlatformCost={setDPlatform}
          fillRateNow={dFill} setFillRateNow={setDFill} admin={dAdmin} setAdmin={setDAdmin} recruit={dRecruit} setRecruit={setDRecruit} />;
        case 3: return <ResultsPage r={rDet} displacement={dDisp} setDisplacement={setDDisp} onAdjust={handleAdjust} onStartOver={handleStartOver} />;
        default: return null;
      }
    }
    switch (kioskStep) {
      case 0: return <BankStep bankPool={bankPool} setBankPool={setBankPool} />;
      case 1: return <AgencyStep agencyFillRate={agencyFillRate} setAgencyFillRate={setAgencyFillRate} />;
      case 2: return <TeamStep numManagers={numManagers} setNumManagers={setNumManagers} includeAdmin={includeAdmin} setIncludeAdmin={setIncludeAdmin} />;
      case 3: return <ResultsPage r={rQuick} displacement={displacement} setDisplacement={setDisplacement} onAdjust={handleAdjust} onStartOver={handleStartOver} />;
      default: return null;
    }
  };

  // Idle timeout - reset to splash after 15 minutes of no user activity.
  useEffect(() => {
    if (showSplash) return;
    let timeoutId = null;
    const IDLE_MS = 15 * 60 * 1000;
    const goToSplash = () => { setShowSplash(true); setFlow(null); setKioskStep(0); setCalibrating(false); resetAll(); };
    const reset = () => { if (timeoutId) clearTimeout(timeoutId); timeoutId = setTimeout(goToSplash, IDLE_MS); };
    reset();
    document.addEventListener('touchstart', reset, { passive: true });
    document.addEventListener('mousedown', reset);
    document.addEventListener('keydown', reset);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener('touchstart', reset);
      document.removeEventListener('mousedown', reset);
      document.removeEventListener('keydown', reset);
    };
  }, [showSplash, resetAll]);

  if (showSplash) return <>
    <SplashScreen onStart={() => setShowSplash(false)} onAdminReveal={() => setAdminVisible(true)} />
    {adminVisible && <AdminOverlay onClose={() => setAdminVisible(false)} />}
  </>;

  if (flow === null) return <>
    <ModeChooser onChoose={chooseFlow} />
    {adminVisible && <AdminOverlay onClose={() => setAdminVisible(false)} />}
  </>;

  if (calibrating) {
    return <div style={{ fontFamily: "'DM Sans', sans-serif", background: C.bg, width: W, minHeight: H, height: '100vh', color: C.text, position: "relative", zIndex: 0 }}>
      <BackgroundParticles />
      <CalibratingScreen onDone={handleCalibrationDone} />
      {adminVisible && <AdminOverlay onClose={() => setAdminVisible(false)} />}
    </div>;
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: C.bg, width: W, minHeight: H, color: C.text, lineHeight: 1.55, display: "flex", flexDirection: "column", position: "relative", zIndex: 0 }}>
      <BackgroundParticles />
      <div style={{ padding: "40px 56px 0", position: "relative", zIndex: 1 }}>
        {kioskStep === 0 && <button onClick={() => setFlow(null)} style={{ background: "transparent", border: "none", color: C.textMuted, fontSize: F.small, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 14, padding: 0 }}>← Choose a different calculator</button>}
        <StepIndicator steps={steps} current={kioskStep} onJump={setKioskStep} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 56px 32px", position: "relative", zIndex: 1 }}>
        <PageTransition step={kioskStep}>{renderStep()}</PageTransition>
      </div>
      <NavButtons step={kioskStep} totalSteps={steps.length} context={isDetailed ? DETAILED_CONTEXT : undefined}
        onBack={() => setKioskStep(p => p - 1)} onNext={() => setKioskStep(p => p + 1)}
        onCalculate={handleCalculate} onStartOver={handleResetInputs} />
      {adminVisible && <AdminOverlay onClose={() => setAdminVisible(false)} />}
    </div>
  );
}
