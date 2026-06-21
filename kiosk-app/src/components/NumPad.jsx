import React, { useState } from 'react';
import { C, F } from '../theme';
import { InfoTip } from './index';

/* On-screen numeric keypad (modal) — lets a user type an exact figure on a
   touchscreen with no hardware keyboard. */
export function NumPad({ title, initial, prefix = "", onConfirm, onCancel }) {
  const [v, setV] = useState(initial != null && initial !== "" ? String(Math.round(initial)) : "");
  const press = (k) => {
    if (k === "←") setV(s => s.slice(0, -1));
    else if (k === "C") setV("");
    else if (k === "000") setV(s => (s && s !== "0") ? s + "000" : s);
    else setV(s => (s === "0" ? "" : s) + k);
  };
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "←"];
  return <div style={{ position: "fixed", inset: 0, background: "rgba(11,20,36,0.92)", zIndex: 99998, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
    <div style={{ background: C.surface, borderRadius: 28, border: `1px solid ${C.border}`, padding: "40px 44px", width: 580, maxWidth: "92vw" }}>
      <div style={{ fontSize: F.tiny, fontWeight: 700, color: C.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Enter value</div>
      <div style={{ fontSize: F.h2, fontWeight: 800, color: C.text, marginBottom: 18 }}>{title}</div>
      <div style={{ background: C.bg, borderRadius: 16, border: `1px solid ${C.borderLight}`, padding: "22px 24px", marginBottom: 22, textAlign: "right", fontSize: F.h1, fontWeight: 800, color: C.accent, minHeight: 28 }}>
        {prefix}{v ? Number(v).toLocaleString("en-GB") : "0"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
        {keys.map(k => <button key={k} onClick={() => press(k)} style={{ padding: "24px 0", borderRadius: 16, border: `1px solid ${C.border}`, background: C.surface2, color: C.text, fontSize: F.h2, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{k}</button>)}
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "20px", borderRadius: 16, border: `1px solid ${C.border}`, background: "transparent", color: C.textMid, fontSize: F.body, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
        <button onClick={() => onConfirm(Number(v || 0))} style={{ flex: 2, padding: "20px", borderRadius: 16, border: "none", background: C.accent, color: "#fff", fontSize: F.body, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Confirm</button>
      </div>
    </div>
  </div>;
}

/* A slider for quick approximate setting + a tap-to-type button (opens NumPad)
   for exact figures. The displayed value doubles as the "type exact" trigger. */
export function BigNumberField({ label, value, min, max, step, onChange, format, prefix = "", tip }) {
  const [pad, setPad] = useState(false);
  return <div style={{ marginBottom: 26 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: F.body, fontWeight: 600, color: C.textMid }}>{label}</span>
        {tip && <InfoTip text={tip} />}
      </div>
      <button onClick={() => setPad(true)} style={{ display: "flex", alignItems: "center", gap: 10, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "8px 16px", cursor: "pointer", fontFamily: "inherit" }}>
        <span style={{ fontSize: F.h1, fontWeight: 800, color: C.accent }}>{format ? format(value) : value}</span>
        <span style={{ fontSize: F.small, color: C.textMuted }}>✎</span>
      </button>
    </div>
    <input type="range" min={min} max={max} step={step} value={Math.max(min, Math.min(max, value))} onChange={e => onChange(Number(e.target.value))} style={{ width: "100%", cursor: "pointer", accentColor: C.accent }} />
    {pad && <NumPad title={label} initial={value} prefix={prefix} onCancel={() => setPad(false)} onConfirm={v => { onChange(v); setPad(false); }} />}
  </div>;
}
