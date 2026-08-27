/* ────────────────────────────────────────────────────────────────────────
   Shared UI pieces, ported one for one from the React build's components.

   Each was a component taking props; here each is a function returning a DOM
   node. Where the original held state (the tooltip's open/closed, the
   methodology panel's expanded/collapsed) the state is a local variable in a
   closure and the node is patched directly, which is all the state there was.
   ──────────────────────────────────────────────────────────────────────── */
import { h, frag, setStyle } from './dom';
import { Icon } from './icons';
import { C, F, GUTTER } from '../src/theme';

export function Card(style, ...children) {
  return h('div', { style: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 'clamp(18px, 3vw, 34px)', ...style } }, ...children);
}

export function SectionTitle(number, text) {
  return h('div', { style: { fontSize: F.h2, fontWeight: 700, color: C.textMid, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 14 } },
    h('span', { style: { width: 40, height: 40, borderRadius: '50%', background: C.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: F.h3, fontWeight: 800, flexShrink: 0 } }, number),
    text);
}

export const Helper = (...children) => h('div', { style: { fontSize: F.small, color: C.textMid, lineHeight: 1.6, marginTop: 4 } }, ...children);
export const Lead = (...children) => h('div', { style: { fontSize: F.body, color: C.textMid, lineHeight: 1.6, marginBottom: 28, maxWidth: 760 } }, ...children);

/* The (i) bubble. Positioned on open against the viewport, so it is never
   clipped by the frame edge, and dismissed by a full-screen backdrop.
   Clicks are stopped so a tooltip inside a clickable row cannot toggle it. */
export function InfoTip(text) {
  let show = false, bubble = null, backdrop = null;
  const wrap = h('span', { style: { position: 'relative', display: 'inline-flex' }, onClick: e => e.stopPropagation() });
  const icon = h('span', {
    role: 'button', 'aria-label': 'More information', tabindex: '0',
    style: { width: 28, height: 28, borderRadius: '50%', background: C.border, color: C.textMid, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: F.small, fontWeight: 700, cursor: 'pointer', flexShrink: 0 },
  }, 'i');

  const close = () => {
    show = false;
    if (bubble) { bubble.remove(); bubble = null; }
    if (backdrop) { backdrop.remove(); backdrop = null; }
    icon.setAttribute('aria-expanded', 'false');
  };

  const open = () => {
    show = true;
    icon.setAttribute('aria-expanded', 'true');
    backdrop = h('div', { style: { position: 'fixed', inset: 0, zIndex: 99996 }, onClick: e => { e.stopPropagation(); close(); } });
    bubble = h('span', {
      role: 'tooltip',
      style: {
        position: 'fixed', background: C.surface2, color: C.text,
        fontSize: F.small, lineHeight: 1.6, padding: '20px 24px',
        borderRadius: 16, width: 'min(400px, calc(100vw - 40px))',
        boxShadow: '0 12px 40px rgba(15,65,70,.28)', zIndex: 99997,
        border: `1px solid ${C.border}`,
      },
    }, text);
    document.body.appendChild(backdrop);
    document.body.appendChild(bubble);

    // Decide above or below from the room actually available, then clamp
    // horizontally so the bubble always stays on screen.
    const rect = icon.getBoundingClientRect();
    const W = Math.min(400, window.innerWidth - 40);
    const ESTIMATED_H = 260, M = 14, SAFE_TOP = 100, SAFE_BOTTOM = 60;
    const spaceBelow = window.innerHeight - rect.bottom - SAFE_BOTTOM;
    const spaceAbove = rect.top - SAFE_TOP;
    const placeAbove = spaceBelow < ESTIMATED_H && spaceAbove > spaceBelow;
    setStyle(bubble, {
      top: placeAbove ? rect.top - M : rect.bottom + M,
      left: Math.max(20, Math.min(rect.left + rect.width / 2 - W / 2, window.innerWidth - W - 20)),
      transform: placeAbove ? 'translateY(-100%)' : 'none',
    });
  };

  const toggle = e => { e.stopPropagation(); show ? close() : open(); };
  icon.addEventListener('click', toggle);
  icon.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); } });
  wrap.appendChild(icon);
  return wrap;
}

export function TouchSlider({ label, value, min, max, step = 1, onChange, format, tip }) {
  const out = h('span', { style: { fontSize: F.h1, fontWeight: 800, color: C.accent } }, format ? format(value) : value);
  const input = h('input', {
    type: 'range', 'aria-label': label, min, max, step, value,
    // Screen readers otherwise read the raw number ("2000"), not the figure
    // on screen ("2,000" / "8.3%"). aria-valuetext gives them the real one.
    'aria-valuetext': String(format ? format(value) : value),
    style: { width: '100%', cursor: 'pointer', accentColor: C.accent },
    onInput: e => {
      const v = Number(e.target.value);
      out.textContent = format ? format(v) : v;
      input.setAttribute('aria-valuetext', String(format ? format(v) : v));
      onChange(v);
    },
  });
  return h('div', { style: { marginBottom: 24 } },
    label && h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
        h('span', { style: { fontSize: F.body, fontWeight: 600, color: C.textMid } }, label),
        tip && InfoTip(tip)),
      out),
    input);
}

export function Stepper({ label, value, min = 0, max = 999, step = 1, onChange, tip }) {
  const btn = { width: 46, height: 46, borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.textMid, fontSize: 24, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', flexShrink: 0 };
  const out = h('span', { style: { fontSize: F.h1, fontWeight: 800, color: C.accent, minWidth: 64, textAlign: 'center' } }, value);
  let v = value;
  const set = next => { v = next; out.textContent = v; onChange(v); };
  return h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' } },
    h('div', { style: { flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: 10 } },
      h('span', { style: { fontSize: F.body, fontWeight: 600, color: C.textMid } }, label),
      tip && InfoTip(tip)),
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 14 } },
      h('button', { type: 'button', 'aria-label': 'Decrease', style: btn, onClick: () => set(Math.max(min, v - step)) }, '−'),
      out,
      h('button', { type: 'button', 'aria-label': 'Increase', style: btn, onClick: () => set(Math.min(max, v + step)) }, '+')));
}

export function ToggleRow({ on, onToggle, label, tip }) {
  let state = on;
  const knob = h('div', { style: { position: 'absolute', top: 3, left: state ? 27 : 3, width: 28, height: 28, borderRadius: '50%', background: '#fff', transition: 'left .2s' } });
  const track = h('div', { style: { width: 58, height: 34, borderRadius: 17, background: state ? C.accent : C.border, position: 'relative', transition: 'background .2s', flexShrink: 0 } }, knob);
  const row = h('div', {
    role: 'switch', 'aria-checked': String(state), 'aria-label': label, tabindex: '0',
    style: { display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', marginTop: 6, outlineOffset: 4 },
  }, track, h('span', { style: { fontSize: F.body, fontWeight: 600, color: C.text } }, label), tip && InfoTip(tip));
  const flip = () => {
    state = !state;
    track.style.background = state ? C.accent : C.border;
    knob.style.left = (state ? 27 : 3) + 'px';
    row.setAttribute('aria-checked', String(state));
    onToggle(state);
  };
  row.addEventListener('click', flip);
  row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
  return row;
}

/* A required yes/no decision. Starts neutral (value == null); the user must
   pick a side before the flow will let them continue, so no silent default is
   assumed on their behalf. */
export function DecisionRow({ value, onChange, label, tip, yesLabel = 'Yes', noLabel = 'No' }) {
  let v = value;
  const style = selected => ({
    flex: '1 1 0', padding: '13px 20px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${selected ? C.accent : C.border}`,
    background: selected ? C.accent : C.surface,
    color: selected ? '#fff' : C.textMid, fontWeight: 700, fontSize: F.body,
  });
  const yes = h('button', { type: 'button', role: 'radio', 'aria-checked': String(v === true), style: style(v === true) }, yesLabel);
  const no = h('button', { type: 'button', role: 'radio', 'aria-checked': String(v === false), style: style(v === false) }, noLabel);
  const hint = h('div', { style: { marginTop: 10, fontSize: F.tiny, color: C.textMuted, display: v == null ? 'block' : 'none' } }, 'Choose Yes or No to continue.');
  const pick = next => {
    v = next;
    setStyle(yes, style(v === true)); yes.setAttribute('aria-checked', String(v === true));
    setStyle(no, style(v === false)); no.setAttribute('aria-checked', String(v === false));
    hint.style.display = 'none';
    onChange(v);
  };
  yes.addEventListener('click', () => pick(true));
  no.addEventListener('click', () => pick(false));
  return h('div', null,
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 } },
      h('span', { style: { fontSize: F.body, fontWeight: 600, color: C.text } }, label),
      tip && InfoTip(tip)),
    h('div', { role: 'radiogroup', 'aria-label': label, style: { display: 'flex', gap: 12 } }, yes, no),
    hint);
}

export function StepIndicator(steps, current, onJump) {
  return h('div', { style: { display: 'flex', gap: 10, marginBottom: 36 } },
    ...steps.map((label, i) => {
      const active = current === i, done = current > i;
      const seg = h('div', {
        style: { flex: 1, cursor: done ? 'pointer' : 'default' },
        role: done ? 'button' : null, tabindex: done ? '0' : null,
        'aria-label': done ? `Go back to: ${label}` : null,
        onClick: () => { if (done) onJump(i); },
        onKeydown: e => { if (done && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onJump(i); } },
      },
        h('div', { style: { height: 8, borderRadius: 4, background: active ? C.accent : done ? C.accent + '60' : C.border, transition: 'background .4s' } }),
        h('div', { style: { fontSize: F.tiny, fontWeight: active ? 700 : 500, marginTop: 10, color: active ? C.accent : done ? C.textMid : C.textMuted, textAlign: 'center' } }, label));
      return seg;
    }));
}

const STEP_CONTEXT = [
  { title: 'Why this matters', text: 'The size of your bank sets the scale of the opportunity: the agency premium displaced when work moves onto your own bank is the cash saving.' },
  { title: 'Why this matters', text: 'Your fill rate shows how much temporary work is paid at an agency premium today; better bank utilisation returns part of that premium to your budget.' },
  { title: 'Why this matters', text: 'Smart Match automates booking and matching, handing a conservative slice of time back to each team member, shown as hours per week and valued as cash.' },
  { title: 'Why this matters', text: 'Conservative is the cautious choice, Moderate matches what one pilot site achieved, Optimistic assumes more. Every figure flexes with it.' },
];

export function NavButtons({ step, totalSteps, onBack, onNext, onCalculate, onHome, nextDisabled = false }) {
  if (step >= totalSteps - 1) return null;
  const ctx = STEP_CONTEXT[step];
  const forward = step < totalSteps - 2
    ? h('button', { type: 'button', disabled: nextDisabled, style: { padding: '14px 40px', borderRadius: 14, border: 'none', background: nextDisabled ? C.border : C.accent, color: nextDisabled ? C.textMuted : '#fff', fontSize: F.h3, fontWeight: 700, cursor: nextDisabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }, onClick: onNext }, 'Next →')
    : h('button', { type: 'button', style: { padding: '14px 40px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${C.accent}, ${C.accentMid})`, color: '#fff', fontSize: F.h3, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 24px rgba(15,65,70,0.25)' }, onClick: onCalculate }, 'Calculate ROI →');

  return h('div', { style: { borderTop: `1px solid ${C.border}` } },
    ctx && h('div', { style: { margin: `18px ${GUTTER} 0`, padding: '14px 18px', background: `${C.accent}08`, border: `1px solid ${C.accent}20`, borderRadius: 14, display: 'flex', gap: 12, alignItems: 'flex-start' } },
      h('span', { style: { flexShrink: 0, marginTop: 1 } }, Icon('lightbulb', 20, C.accent)),
      h('div', null,
        h('div', { style: { fontSize: F.tiny, fontWeight: 700, color: C.accent, marginBottom: 4 } }, ctx.title),
        h('div', { style: { fontSize: F.tiny, color: C.textMid, lineHeight: 1.6 } }, ctx.text))),
    h('div', { style: { padding: `14px ${GUTTER} 36px`, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' } },
      step > 0 && h('button', { type: 'button', style: { padding: '13px 26px', borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface, color: C.textMid, fontSize: F.body, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }, onClick: onBack }, '← Back'),
      step === 0 && onHome && h('button', { type: 'button', style: { padding: '12px 22px', borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface, color: C.textMid, fontSize: F.body, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }, onClick: onHome }, Icon('home', 18, C.textMid), ' Start again'),
      h('div', { style: { flex: 1 } }),
      forward));
}

/* The collapsible methodology panel. */
export function Collapsible(title, body) {
  let open = false;
  const caret = h('span', { style: { transition: 'transform .2s', display: 'inline-block' } }, '▶');
  const panel = h('div', { style: { marginTop: 14, display: 'none' } }, body);
  const head = h('div', {
    role: 'button', tabindex: '0', 'aria-expanded': 'false',
    style: { fontSize: F.body, color: C.accent, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, outlineOffset: 4 },
  }, caret, ' ' + title);
  const toggle = () => {
    open = !open;
    panel.style.display = open ? 'block' : 'none';
    caret.style.transform = open ? 'rotate(90deg)' : 'none';
    head.setAttribute('aria-expanded', String(open));
  };
  head.addEventListener('click', toggle);
  head.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  return h('div', null, head, panel);
}

/* A label/value row in the worked-out breakdowns. */
export function Row(label, value, accent) {
  return h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: `1px solid ${C.border}`, gap: 16 } },
    h('span', { style: { fontSize: F.small, color: C.textMid } }, label),
    h('span', { style: { fontSize: F.body, fontWeight: accent ? 800 : 600, color: accent ? C.accent : C.text, textAlign: 'right', whiteSpace: 'nowrap' } }, value));
}

export function CTitle(iconKey, text, color) {
  return h('div', { style: { fontSize: F.body, fontWeight: 700, color: C.textMid, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 } },
    iconKey && Icon(iconKey, 24, color || C.accent), ' ', text);
}

export { frag };
