import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { C, F, W, H, KIOSK_STEPS, fmtK, fmtNum } from './theme';
import { SplashScreen } from './components/SplashScreen';
import { BackgroundParticles } from './components/BackgroundParticles';
import { calc, DEFAULTS, platformCostFor, stance } from './calc/engine';
import { newId, flushSync, syncEnabled } from './stats/sync';
import { StepIndicator, NavButtons, PageTransition } from './components';
import { BankStep, AgencyStep, TeamStep, StanceStep } from './steps';
import { ResultsPage } from './results/ResultsPage';

/* ────────────────────────────────────────────────────────────────────────
   COMPLETION TRACKING + ADMIN STATS (localStorage-backed)
   Reveal: single tap on RLDatix logo on splash
   Reset: PIN-protected. Set VITE_ADMIN_PIN at build time (e.g. in the deploy
   environment); falls back to 2580 (vertical line on a phone keypad) if unset.
   ──────────────────────────────────────────────────────────────────────── */
const STATS_KEY = 'smartmatch-kiosk-stats';
const STATS_BACKUP_KEY = 'smartmatch-kiosk-stats.bak';   // mirror copy; recovers the store if the primary is lost/corrupt. The store is never auto-wiped.
const STATS_VERSION = 2;
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '2580'; // build-time env, not source-committed

// Numeric fields for which we keep a running lifetime sum + count, so cumulative
// totals and averages stay exact even after old raw rows roll off the cap below.
const AGG_FIELDS = ['netSaving', 'agencySaving', 'adminSaving', 'grossBenefit', 'displaced',
  'timeSavedWeek', 'capacityValue', 'roiMultiple', 'paybackMonths', 'agencySpend',
  'platformCost', 'bankPool', 'agencyFillRate', 'numManagers', 'displacement'];
const SESSION_CAP = 2000;   // raw rows kept (for the rolling 24h count); lifetime figures live in `agg`, so this cap never drops a headline stat.

function newAgg() {
  return { n: 0, sums: {}, counts: {}, stance: { Conservative: 0, Expected: 0, Optimistic: 0 }, adminObserved: 0, adminIncluded: 0 };
}

// Fold one completed session into the running aggregate (used both live and when
// migrating an older store that only kept raw rows).
function accumulate(agg, s) {
  for (const f of AGG_FIELDS) {
    const v = s[f];
    if (typeof v === 'number' && isFinite(v)) {
      agg.sums[f] = (agg.sums[f] || 0) + v;
      agg.counts[f] = (agg.counts[f] || 0) + 1;
    }
  }
  if (s.stance && agg.stance[s.stance] != null) agg.stance[s.stance] += 1;
  if (typeof s.includeAdmin === 'boolean') {
    agg.adminObserved = (agg.adminObserved || 0) + 1;
    if (s.includeAdmin) agg.adminIncluded = (agg.adminIncluded || 0) + 1;
  }
  agg.n = (agg.n || 0) + 1;
}

function readRaw(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.sessions)) return null;   // ignore (don't delete) anything malformed
    return data;
  } catch (e) { return null; }
}

// Rebuild the running-aggregate block from raw rows, so a v1 store (raw rows only)
// upgrades to v2 without losing its cumulative history.
function ensureAgg(data) {
  if (data.agg && data.agg.sums && data.agg.counts && data.agg.stance) return data;
  const agg = newAgg();
  for (const s of (data.sessions || [])) accumulate(agg, s);
  data.agg = agg;
  return data;
}

// Load the store, preferring the primary copy and falling back to the backup.
// Crucially it NEVER deletes: a corrupt/half-written copy is skipped, not wiped —
// so an interrupted write (e.g. an overnight reboot mid-save) can't lose history.
function loadStore() {
  let data = readRaw(STATS_KEY);
  let healed = false;
  if (!data) { data = readRaw(STATS_BACKUP_KEY); healed = !!data; }
  if (!data) return { v: STATS_VERSION, total: 0, sessions: [], agg: newAgg(), first: null, last: null };
  data = ensureAgg(data);
  if (typeof data.total !== 'number') data.total = data.agg.n || data.sessions.length;
  if (healed) { try { localStorage.setItem(STATS_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ } }
  return data;
}

// Write both copies (primary first, then mirror) so at least one valid copy always exists.
function writeStore(data) {
  const payload = JSON.stringify(data);
  try { localStorage.setItem(STATS_KEY, payload); } catch (e) { /* quota / storage disabled */ }
  try { localStorage.setItem(STATS_BACKUP_KEY, payload); } catch (e) { /* ignore */ }
}

function recordCompletion(session) {
  try {
    const data = loadStore();
    const row = { id: newId(), synced: false, ts: Date.now(), ...session };
    data.v = STATS_VERSION;
    data.sessions.push(row);
    data.total = (data.total || 0) + 1;
    if (data.first == null) data.first = row.ts;
    data.last = row.ts;
    accumulate(data.agg, row);
    if (data.sessions.length > SESSION_CAP) data.sessions = data.sessions.slice(-SESSION_CAP);
    writeStore(data);
    flushSync(data, writeStore);   // push to the shared backend if configured (no-op otherwise)
  } catch (e) { /* ignore */ }
}

function resetStats() {
  try { localStorage.removeItem(STATS_KEY); } catch (e) { /* ignore */ }
  try { localStorage.removeItem(STATS_BACKUP_KEY); } catch (e) { /* ignore */ }
}

// Ask the browser to keep our storage durable (exempt from automatic eviction
// under storage pressure). Best-effort; unsupported browsers simply no-op.
function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist && navigator.storage.persisted) {
      navigator.storage.persisted().then(p => { if (!p) navigator.storage.persist().catch(() => {}); }).catch(() => {});
    }
  } catch (e) { /* ignore */ }
}

// Totals + lifetime cumulative impact + lifetime averages across all sessions.
function computeStats() {
  const data = loadStore();
  const { sessions, total, agg } = data;
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const today = sessions.filter(s => s.ts >= oneDayAgo).length;
  const last = data.last || (sessions.length ? sessions[sessions.length - 1].ts : null);

  // Cumulative (lifetime) read from the running aggregate, so it survives rolloff.
  const cum = {
    netSaving: agg.sums.netSaving || 0,
    agencySaving: agg.sums.agencySaving || 0,
    adminSaving: agg.sums.adminSaving || 0,
    displaced: agg.sums.displaced || 0,
    timeSavedWeek: agg.sums.timeSavedWeek || 0,
  };

  // Lifetime average of a field, over the sessions that actually carried it (so
  // fields added in a later build aren't dragged down by older rows lacking them).
  const avg = (f, dp = 0) => {
    const c = agg.counts[f] || 0;
    if (!c) return null;
    const m = (agg.sums[f] || 0) / c;
    return dp ? +m.toFixed(dp) : Math.round(m);
  };
  const averages = {
    netSaving: avg('netSaving'), agencySaving: avg('agencySaving'),
    roiMultiple: avg('roiMultiple', 2), paybackMonths: avg('paybackMonths', 2),
    bankPool: avg('bankPool'), agencyFillRate: avg('agencyFillRate', 1),
    numManagers: avg('numManagers', 1), displacement: avg('displacement', 1),
    agencySpend: avg('agencySpend'),
  };
  const adminPct = agg.adminObserved ? Math.round(100 * (agg.adminIncluded || 0) / agg.adminObserved) : null;
  const stanceDist = agg.stance || { Conservative: 0, Expected: 0, Optimistic: 0 };
  const pending = syncEnabled ? sessions.filter(s => s && s.id && s.synced !== true).length : 0;

  return { total, today, last, cum, averages, adminPct, stanceDist, avgBankPool: averages.bankPool || 0, pending };
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

function AvgTile({ label, value, color }) {
  return (
    <div style={{ padding: '14px 16px', background: C.bg, borderRadius: 12, border: '1px solid ' + C.borderLight }}>
      <div style={{ fontSize: 11, color: C.textMuted }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || C.text, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function StanceLegend({ color, label, n }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: color, display: 'inline-block' }} />
      <span style={{ fontSize: 12, color: C.textMid }}>{label}</span>
      <span style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{n}</span>
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
  const sd = stats.stanceDist || { Conservative: 0, Expected: 0, Optimistic: 0 };
  const stanceTotal = sd.Conservative + sd.Expected + sd.Optimistic;

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

        {/* Average per completed session (from lifetime running aggregate) */}
        {stats.total > 0 && <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 10 }}>Average per completed session (indicative)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <AvgTile label="Net cash saving" color={C.accent} value={stats.averages.netSaving == null ? '—' : fmtK(stats.averages.netSaving)} />
            <AvgTile label="ROI multiple" color={C.accent} value={stats.averages.roiMultiple == null ? '—' : stats.averages.roiMultiple.toFixed(2) + '×'} />
            <AvgTile label="Payback" color={C.good} value={stats.averages.paybackMonths == null ? '—' : Math.round(stats.averages.paybackMonths * 365 / 12).toLocaleString('en-GB') + ' days'} />
            <AvgTile label="Bank workforce modelled" color={C.text} value={stats.averages.bankPool == null ? '—' : fmtNum(stats.averages.bankPool)} />
            <AvgTile label="Agency fill entered" color={C.text} value={stats.averages.agencyFillRate == null ? '—' : stats.averages.agencyFillRate.toFixed(1) + '%'} />
            <AvgTile label="Confidence level chosen" color={C.text} value={stats.averages.displacement == null ? '—' : stats.averages.displacement.toFixed(1) + '%'} />
            <AvgTile label="Temp staffing team size" color={C.text} value={stats.averages.numManagers == null ? '—' : stats.averages.numManagers.toFixed(1)} />
            <AvgTile label="Agency premium saving" color={C.accent} value={stats.averages.agencySaving == null ? '—' : fmtK(stats.averages.agencySaving)} />
            <AvgTile label="Admin time included" color={C.amber} value={stats.adminPct == null ? '—' : stats.adminPct + '%'} />
          </div>
        </div>}

        {/* Confidence stance distribution */}
        {stanceTotal > 0 && <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 10 }}>Confidence stance chosen</div>
          <div style={{ display: 'flex', height: 26, borderRadius: 8, overflow: 'hidden', border: '1px solid ' + C.borderLight }}>
            {sd.Conservative > 0 && <div style={{ width: (100 * sd.Conservative / stanceTotal) + '%', background: C.accent }} />}
            {sd.Expected > 0 && <div style={{ width: (100 * sd.Expected / stanceTotal) + '%', background: C.blue }} />}
            {sd.Optimistic > 0 && <div style={{ width: (100 * sd.Optimistic / stanceTotal) + '%', background: C.amber }} />}
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 8, flexWrap: 'wrap' }}>
            <StanceLegend color={C.accent} label="Conservative" n={sd.Conservative} />
            <StanceLegend color={C.blue} label="Expected" n={sd.Expected} />
            <StanceLegend color={C.amber} label="Optimistic" n={sd.Optimistic} />
          </div>
        </div>}

        {stats.total === 0 && <div style={{ padding: '24px', background: C.bg, borderRadius: 12, border: '1px solid ' + C.borderLight, textAlign: 'center', color: C.textMuted, fontSize: 14, marginBottom: 18 }}>
          No sessions recorded yet.
        </div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {syncEnabled
            ? <div style={{ fontSize: 11, color: C.textMuted }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: stats.pending ? C.amber : C.good, marginRight: 7 }} />
                Shared sync on{stats.pending ? ` · ${stats.pending} pending` : ' · up to date'}
              </div>
            : <span />}
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

// Idle warning shown ~60s before the kiosk resets to the attract splash, so an
// in-progress session is not wiped without notice. Any tap/keypress dismisses it
// (the document-level activity listeners re-arm the timer); the button is an
// explicit affordance for the same.
function IdleWarning({ seconds, onStay }) {
  return <div role="alertdialog" aria-label="Session about to reset" aria-live="assertive" style={{ position: 'fixed', inset: 0, background: 'rgba(11,20,36,0.93)', zIndex: 99990, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: '48px 56px', maxWidth: 640, textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
      <div style={{ fontSize: 34, fontWeight: 800, color: C.text, marginBottom: 14 }}>Are you still there?</div>
      <div style={{ fontSize: 19, color: C.textMid, lineHeight: 1.5, marginBottom: 6 }}>To keep your figures private for the next visitor, this screen returns to the start in</div>
      <div style={{ fontSize: 64, fontWeight: 800, color: C.accent, margin: '6px 0 26px', fontVariantNumeric: 'tabular-nums' }}>{Math.max(0, seconds)}s</div>
      <button onClick={onStay} style={{ padding: '20px 52px', borderRadius: 16, border: 'none', background: C.accent, color: '#04201A', fontSize: 20, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>I'm still here</button>
    </div>
  </div>;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [stanceTouched, setStanceTouched] = useState(false);   // no confidence box highlighted until the user picks one
  const [kioskStep, setKioskStep] = useState(0);
  const [calibrating, setCalibrating] = useState(false);
  const [adminVisible, setAdminVisible] = useState(false);
  const [idleWarn, setIdleWarn] = useState(false);
  const [idleSecs, setIdleSecs] = useState(60);
  const armIdleRef = useRef(() => {});

  // Quick variant inputs (+ the modelling-stance displacement flexed live on Results).
  const [bankPool, setBankPool] = useState(DEFAULTS.bankPool);
  const [agencyFillRate, setAgencyFillRate] = useState(DEFAULTS.agencyFillRate);
  const [numManagers, setNumManagers] = useState(DEFAULTS.numManagers);
  const [displacement, setDisplacement] = useState(DEFAULTS.displacement);
  const [includeAdmin, setIncludeAdmin] = useState(false);  // temporary-staffing-team time in the cash total (off by default; secondary)

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
    recordCompletion({
      flow: "quick",
      netSaving: r.netSaving, agencySaving: r.agencySaving, adminSaving: r.adminSaving,
      grossBenefit: r.grossBenefit, displaced: r.displaced, timeSavedWeek: r.timeSavedWeek,
      capacityValue: r.capacityValue, roiMultiple: r.roiMultiple, paybackMonths: r.paybackMonths,
      agencySpend: r.agencySpend, platformCost: r.platformCost,
      bankPool, agencyFillRate, numManagers, displacement, includeAdmin,
      stance: stance(displacement).key,
    });
  }, [RESULTS_STEP, r, bankPool, agencyFillRate, numManagers, displacement, includeAdmin]);

  const handleAdjust = useCallback(() => setKioskStep(0), []);

  const resetAll = useCallback(() => {
    setBankPool(DEFAULTS.bankPool); setAgencyFillRate(DEFAULTS.agencyFillRate);
    setNumManagers(DEFAULTS.numManagers); setDisplacement(DEFAULTS.displacement);
    setIncludeAdmin(false); setStanceTouched(false);
  }, []);

  // Results "Start over": back to the attract splash, fully reset (next visitor).
  const handleStartOver = useCallback(() => {
    setShowSplash(true); setKioskStep(0); setCalibrating(false); resetAll();
  }, [resetAll]);

  const renderStep = () => {
    switch (kioskStep) {
      case 0: return <BankStep bankPool={bankPool} setBankPool={setBankPool} />;
      case 1: return <AgencyStep agencyFillRate={agencyFillRate} setAgencyFillRate={setAgencyFillRate} />;
      case 2: return <TeamStep numManagers={numManagers} setNumManagers={setNumManagers} includeAdmin={includeAdmin} setIncludeAdmin={setIncludeAdmin} />;
      case 3: return <StanceStep displacement={displacement} chosen={stanceTouched} setDisplacement={chooseStance} />;
      case 4: return <ResultsPage r={rQuick} displacement={displacement} chosen={stanceTouched} setDisplacement={chooseStance} onAdjust={handleAdjust} onStartOver={handleStartOver} />;
      default: return null;
    }
  };

  // Ask the browser for durable storage once, so kiosk stats aren't evicted
  // under storage pressure. (Does not override an OS/browser "clear on exit"
  // policy or an ephemeral profile — those are fixed in the kiosk launch config.)
  // Also flush any sessions queued while the shared backend was unreachable.
  useEffect(() => {
    requestPersistentStorage();
    if (syncEnabled) { try { flushSync(loadStore(), writeStore); } catch (e) { /* ignore */ } }
  }, []);

  // Idle handling: after 14 min of no activity show a 60s countdown warning,
  // then reset to the attract splash at 15 min. Any tap/keypress (or the
  // "I'm still here" button) re-arms the timer and dismisses the warning, so a
  // session is never wiped silently (audit #23).
  useEffect(() => {
    if (showSplash) { setIdleWarn(false); return; }
    const IDLE_MS = 15 * 60 * 1000, WARN_MS = 60 * 1000;
    let warnId, resetId, tickId;
    const clearTimers = () => { clearTimeout(warnId); clearTimeout(resetId); clearInterval(tickId); };
    const goToSplash = () => { clearTimers(); setIdleWarn(false); setShowSplash(true); setKioskStep(0); setCalibrating(false); resetAll(); };
    const arm = () => {
      clearTimers();
      setIdleWarn(false);
      warnId = setTimeout(() => {
        setIdleWarn(true);
        let s = Math.round(WARN_MS / 1000); setIdleSecs(s);
        tickId = setInterval(() => { s -= 1; setIdleSecs(s); }, 1000);
      }, IDLE_MS - WARN_MS);
      resetId = setTimeout(goToSplash, IDLE_MS);
    };
    armIdleRef.current = arm;
    arm();
    document.addEventListener('touchstart', arm, { passive: true });
    document.addEventListener('mousedown', arm);
    document.addEventListener('keydown', arm);
    return () => {
      clearTimers();
      document.removeEventListener('touchstart', arm);
      document.removeEventListener('mousedown', arm);
      document.removeEventListener('keydown', arm);
    };
  }, [showSplash, resetAll]);

  if (showSplash) return <>
    <SplashScreen onStart={() => setShowSplash(false)} onAdminReveal={() => setAdminVisible(true)} />
    {adminVisible && <AdminOverlay onClose={() => setAdminVisible(false)} />}
  </>;

  if (calibrating) {
    return <div style={{ fontFamily: "'DM Sans', sans-serif", background: C.bg, width: W, minHeight: H, height: '100vh', color: C.text, position: "relative", zIndex: 0 }}>
      <BackgroundParticles />
      <CalibratingScreen onDone={handleCalibrationDone} />
      {adminVisible && <AdminOverlay onClose={() => setAdminVisible(false)} />}
      {idleWarn && <IdleWarning seconds={idleSecs} onStay={() => armIdleRef.current()} />}
    </div>;
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: C.bg, width: W, minHeight: H, color: C.text, lineHeight: 1.55, display: "flex", flexDirection: "column", position: "relative", zIndex: 0 }}>
      <BackgroundParticles />
      <div style={{ padding: "40px 56px 0", position: "relative", zIndex: 1 }}>
        <StepIndicator steps={steps} current={kioskStep} onJump={setKioskStep} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 56px 32px", position: "relative", zIndex: 1 }}>
        <PageTransition step={kioskStep}>{renderStep()}</PageTransition>
      </div>
      <NavButtons step={kioskStep} totalSteps={steps.length}
        onBack={() => setKioskStep(p => p - 1)} onNext={() => setKioskStep(p => p + 1)}
        onCalculate={handleCalculate} />
      {adminVisible && <AdminOverlay onClose={() => setAdminVisible(false)} />}
      {idleWarn && <IdleWarning seconds={idleSecs} onStay={() => armIdleRef.current()} />}
    </div>
  );
}
