import React, { useState, useRef, useEffect } from 'react';
import { C, F } from '../theme';
import { Icon } from './Icons';

export function Card({ children, style }) {
  return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: "36px 40px 32px", ...style }}>{children}</div>;
}

export function StepIndicator({ steps, current, onJump }) {
  return <div style={{ display: "flex", gap: 10, marginBottom: 36 }}>
    {steps.map((label, i) => {
      const active = current === i, done = current > i;
      return <div key={i} role={done ? "button" : undefined} tabIndex={done ? 0 : undefined}
        aria-label={done ? `Go back to: ${label}` : undefined}
        onKeyDown={done ? (e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onJump(i); } }) : undefined}
        style={{ flex: 1, cursor: done ? "pointer" : "default" }} onClick={() => done && onJump(i)}>
        <div style={{ height: 8, borderRadius: 4, background: active ? C.accent : done ? C.accent + "60" : C.border, transition: "background .4s" }} />
        <div style={{ fontSize: F.tiny, fontWeight: active ? 700 : 500, marginTop: 10, color: active ? C.accent : done ? C.textMid : C.textMuted, textAlign: "center" }}>{label}</div>
      </div>;
    })}
  </div>;
}

const STEP_CONTEXT = [
  // 0 - Your bank
  { title: "Why this matters", text: "The size of your staff bank sets the scale of the opportunity. Better utilisation of this pool is the mechanism that moves temporary work off agency and onto your own bank, and the agency premium you displace is the cash saving." },
  // 1 - Agency
  { title: "Why this matters", text: "Your current agency fill rate tells us how much temporary work is being paid at a premium today. Each agency shift costs more than the equivalent bank shift; improving utilisation displaces some of that premium back into your budget." },
  // 2 - Your team
  { title: "Why this matters", text: "The people who book, chase and reconcile temporary shifts spend real hours on admin. Smart Match gives a conservative slice of that time back per person, which we value as cash and also show as hours saved per week." },
  // 3 - Confidence / optimism
  { title: "Why this matters", text: "This sets how much of today's agency work you expect to move onto your own bank. Conservative is the cautious choice; Expected matches what one site achieved; Optimistic assumes more. It flexes every figure, and you can revisit it on the results screen." },
];

export function NavButtons({ step, totalSteps, onBack, onNext, onCalculate, onHome, context = STEP_CONTEXT }) {
  if (step >= totalSteps - 1) return null;
  const ctx = context[step];
  return <div style={{ borderTop: `1px solid ${C.border}` }}>
    {ctx && <div style={{ margin: "20px 56px 0", padding: "16px 20px", background: `${C.accent}08`, border: `1px solid ${C.accent}20`, borderRadius: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}><Icon name="lightbulb" size={20} stroke={C.accent} /></span>
      <div>
        <div style={{ fontSize: F.tiny, fontWeight: 700, color: C.accent, marginBottom: 4 }}>{ctx.title}</div>
        <div style={{ fontSize: F.tiny, color: C.textMid, lineHeight: 1.6 }}>{ctx.text}</div>
      </div>
    </div>}
    <div style={{ padding: "16px 56px 40px", display: "flex", gap: 20, alignItems: "center" }}>
      {step > 0 && <button onClick={onBack} style={{ padding: "24px 44px", borderRadius: 18, border: `1px solid ${C.border}`, background: C.surface, color: C.textMid, fontSize: F.body, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>}
      {step === 0 && onHome && <button onClick={onHome} aria-label="Home" style={{ padding: "22px 34px", borderRadius: 18, border: `1px solid ${C.border}`, background: C.surface, color: C.textMid, fontSize: F.body, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 12 }}><Icon name="home" size={22} stroke={C.textMid} /> Home</button>}
      <div style={{ flex: 1 }} />
      {step < totalSteps - 2 ? (
        <button onClick={onNext} style={{ padding: "24px 64px", borderRadius: 18, border: "none", background: C.accent, color: "#fff", fontSize: F.h3, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Next →</button>
      ) : (
        <button onClick={onCalculate} style={{ padding: "24px 64px", borderRadius: 18, border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.accentMid})`, color: "#fff", fontSize: F.h2, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 28px rgba(0,212,170,0.4)" }}>Calculate ROI →</button>
      )}
    </div>
  </div>;
}

export function PageTransition({ children, step }) {
  return <div key={step} style={{ animation: "kSlideUp .4s cubic-bezier(0.16, 1, 0.3, 1)" }}>
    <style>{`
      @keyframes kSlideUp {
        0% { opacity: 0; transform: translateY(40px) scale(0.97); filter: blur(4px); }
        60% { opacity: 1; filter: blur(0); }
        100% { transform: translateY(0) scale(1); }
      }
    `}</style>
    {children}
  </div>;
}

export function TouchSlider({ label, value, min, max, step = 1, onChange, format, tip }) {
  return <div style={{ marginBottom: 24 }}>
    {label && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: F.body, fontWeight: 600, color: C.textMid }}>{label}</span>
        {tip && <InfoTip text={tip} />}
      </div>
      <span style={{ fontSize: F.h1, fontWeight: 800, color: C.accent }}>{format ? format(value) : value}</span>
    </div>}
    <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: "100%", cursor: "pointer", accentColor: C.accent }} />
  </div>;
}

export function Stepper({ label, value, min = 0, max = 999, step = 1, onChange, tip }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: F.body, fontWeight: 600, color: C.textMid }}>{label}</span>
      {tip && <InfoTip text={tip} />}
    </div>
    <button onClick={() => onChange(Math.max(min, value - step))} style={{ width: 64, height: 64, borderRadius: 16, border: `1px solid ${C.border}`, background: C.surface, color: C.textMid, fontSize: 32, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>−</button>
    <span style={{ fontSize: F.h1, fontWeight: 800, color: C.accent, minWidth: 90, textAlign: "center" }}>{value}</span>
    <button onClick={() => onChange(Math.min(max, value + step))} style={{ width: 64, height: 64, borderRadius: 16, border: `1px solid ${C.border}`, background: C.surface, color: C.textMid, fontSize: 32, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>+</button>
  </div>;
}

export function InfoTip({ text }) {
  const [show, setShow] = useState(false);
  const iconRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, placeAbove: false });

  // When the tooltip opens, measure the icon's viewport position and decide
  // whether to render the bubble above or below it. Avoids being obscured by
  // the kiosk's header bar at the top of the viewport.
  useEffect(() => {
    if (!show || !iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const W = 400; // bubble width
    const ESTIMATED_H = 260; // bubble approx height
    const M = 14; // margin between icon and bubble
    const SAFE_TOP = 100; // header height safety margin
    const SAFE_BOTTOM = 60;

    const spaceBelow = window.innerHeight - rect.bottom - SAFE_BOTTOM;
    const spaceAbove = rect.top - SAFE_TOP;
    const placeAbove = spaceBelow < ESTIMATED_H && spaceAbove > spaceBelow;

    let top, left;
    if (placeAbove) {
      // Anchor bubble bottom to (rect.top - M), so top = rect.top - M - height.
      // We don't know height yet, so use translateY(-100%) on the bubble.
      top = rect.top - M;
    } else {
      top = rect.bottom + M;
    }
    left = rect.left + rect.width / 2 - W / 2;
    // Clamp horizontally so the bubble stays on screen
    left = Math.max(20, Math.min(left, window.innerWidth - W - 20));

    setPos({ top, left, placeAbove });
  }, [show]);

  return <span ref={iconRef} style={{ position: "relative", display: "inline-flex" }}>
    <span onClick={() => setShow(!show)} style={{ width: 40, height: 40, borderRadius: "50%", background: C.border, color: C.textMid, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: F.body, fontWeight: 700, cursor: "pointer" }}>i</span>
    {show && <>
      <div onClick={() => setShow(false)} style={{ position: "fixed", inset: 0, zIndex: 99996 }} />
      <span style={{
        position: "fixed",
        top: pos.top, left: pos.left,
        transform: pos.placeAbove ? "translateY(-100%)" : "none",
        background: C.surface2, color: C.text,
        fontSize: F.small, lineHeight: 1.6, padding: "20px 24px",
        borderRadius: 18, width: 400, maxWidth: "calc(100vw - 40px)",
        boxShadow: "0 12px 48px rgba(0,0,0,.6)",
        zIndex: 99997, border: `1px solid ${C.border}`,
        animation: "kfade .2s ease-out"
      }}>{text}</span>
    </>}
  </span>;
}

export function SectionTitle({ number, children }) {
  return <div style={{ fontSize: F.h2, fontWeight: 700, color: C.textMid, marginBottom: 28, display: "flex", alignItems: "center", gap: 16 }}>
    <span style={{ width: 52, height: 52, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: F.h3, fontWeight: 800, flexShrink: 0 }}>{number}</span>
    {children}
  </div>;
}

export function ToggleRow({ on, onToggle, label, tip }) {
  return <div role="switch" aria-checked={on} aria-label={label} tabIndex={0}
    onClick={() => onToggle(!on)}
    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(!on); } }}
    style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer", marginTop: 6, outlineOffset: 4 }}>
    <div style={{ width: 58, height: 34, borderRadius: 17, background: on ? C.accent : C.border, position: "relative", transition: "background .2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: on ? 27 : 3, width: 28, height: 28, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
    </div>
    <span style={{ fontSize: F.body, fontWeight: 600, color: C.text }}>{label}</span>
    {tip && <InfoTip text={tip} />}
  </div>;
}

