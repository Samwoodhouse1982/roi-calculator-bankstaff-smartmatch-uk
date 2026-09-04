/* ────────────────────────────────────────────────────────────────────────
   Lead capture, plain-JS view.

   Everything this form DOES (the HubSpot configuration and submission, the
   PDF report, the local backup) comes from ../src/lead/core.js, shared
   verbatim with the React build. This file is only markup and field state,
   so the two builds cannot drift on the form GUID, the fields sent, or the
   report the visitor receives.
   ──────────────────────────────────────────────────────────────────────── */
import { h } from './dom';
import { Icon } from './icons';
import { C, F, fmtK, fmtNum } from '../src/theme';
import { ROLE_OPTIONS, readSubmissions, clearSubmissions, submissionsCSV, submitLead } from '../src/lead/core';

/* `getR` and `getContext` are read at submit time, not at render time: the
   visitor can move the confidence slider after this form is on screen, and
   the report they receive must be the figures they are looking at. */
export function LeadCapture(getR, getContext) {
  const lead = { name: '', email: '', org: '', role: '' };
  let sending = false;

  // Light fields on the navy card: near-white so they read as inputs, dark text.
  const inputStyle = {
    flex: '1 1 200px', minWidth: 150, padding: '11px 14px', borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.92)',
    color: C.text, fontSize: F.small, outline: 'none', fontFamily: 'inherit',
  };

  const field = (key, attrs) => {
    const el = h('input', { ...attrs, style: inputStyle });
    el.addEventListener('input', e => { lead[key] = e.target.value; refresh(); });
    return el;
  };

  const name = field('name', { type: 'text', placeholder: 'Your name *', 'aria-label': 'Your name (required)', autocomplete: 'name' });
  const email = field('email', { type: 'email', placeholder: 'Work email *', 'aria-label': 'Work email (required)', autocomplete: 'email' });
  const org = field('org', { type: 'text', placeholder: 'Organisation', 'aria-label': 'Organisation', autocomplete: 'organization' });

  const role = h('select', { 'aria-label': 'Your role', style: { ...inputStyle, color: C.textMuted } },
    h('option', { value: '', style: { color: C.text } }, 'Your role'),
    ...ROLE_OPTIONS.map(o => h('option', { value: o, style: { color: C.text } }, o)));
  role.addEventListener('change', e => { lead.role = e.target.value; role.style.color = lead.role ? C.text : C.textMuted; });

  const button = h('button', { type: 'button' }, 'Download PDF report');
  const refresh = () => {
    const ready = lead.name && lead.email;
    Object.assign(button.style, {
      padding: '14px 32px', background: ready ? '#fff' : 'rgba(255,255,255,0.15)',
      color: ready ? C.navy : 'rgba(255,255,255,0.4)',
      border: 'none', borderRadius: '999px', fontSize: F.body, fontWeight: '800',
      cursor: ready && !sending ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
    });
    button.disabled = !ready || sending;
  };
  refresh();

  const card = h('div', { style: { marginBottom: 28, padding: 'clamp(18px, 3vw, 28px)', borderRadius: 18, background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 100%)`, border: 'none' } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 } },
      Icon('download', 22, C.seafoam),
      h('h3', { style: { fontSize: F.h3, fontWeight: 800, margin: 0, color: '#fff' } }, 'Get your report')),
    h('p', { style: { fontSize: F.small, color: 'rgba(255,255,255,0.75)', marginTop: 6, marginBottom: 18 } }, 'Download a formatted summary ready to share with your team or board.'),
    h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 } }, name, email),
    h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 } }, org, role),
    button,
    h('p', { style: { fontSize: F.tiny, color: 'rgba(255,255,255,0.55)', marginTop: 12, marginBottom: 0 } }, "By submitting your details, you agree to share your name and email address so we can reach out to see if we can help with your programme. Details are processed in line with RLDatix's privacy notice."));

  button.addEventListener('click', async () => {
    if (!lead.name || !lead.email || sending) return;
    sending = true;
    button.textContent = 'Generating report...';
    refresh();
    await submitLead(getR(), lead, getContext());
    sending = false;
    card.replaceWith(h('div', { style: { marginBottom: 28, padding: '26px 28px', borderRadius: 18, background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 100%)`, border: 'none', textAlign: 'center' } },
      h('div', { style: { fontSize: F.h3, fontWeight: 800, color: C.seafoam, marginBottom: 8 } }, `Thanks, ${lead.name.split(' ')[0]}, your report has downloaded.`),
      h('div', { style: { fontSize: F.small, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 } }, "An RLDatix BankStaff specialist can validate these figures against your organisation's own bank and agency rates. We'll be in touch.")));
  });

  return card;
}

/* ── #admin-leads: review + CSV-export locally stored submissions ─────────
   Records live only in this browser's localStorage (per device); HubSpot
   remains the system of record. */
export function AdminLeads(onClose) {
  let records = readSubmissions();

  const cell = { padding: '10px 12px', fontSize: F.tiny, color: C.textMid, borderBottom: `1px solid ${C.borderLight}`, textAlign: 'left', whiteSpace: 'nowrap' };
  const wrap = h('div', { style: { maxWidth: 1000, margin: '0 auto', padding: 'clamp(20px, 4vw, 48px)' } });

  const exportCSV = () => {
    const a = h('a', { href: URL.createObjectURL(new Blob([submissionsCSV(records)], { type: 'text/csv' })), download: 'smartmatch-roi-leads-' + new Date().toISOString().split('T')[0] + '.csv' });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  const clearAll = () => {
    if (!window.confirm('Permanently delete all ' + records.length + ' local lead records? This cannot be undone (HubSpot copies are unaffected).')) return;
    clearSubmissions(); records = []; render();
  };

  const btn = (label, on, enabled, style) => {
    const el = h('button', { type: 'button', style: { padding: '10px 20px', borderRadius: 10, fontSize: F.tiny, fontFamily: 'inherit', cursor: enabled ? 'pointer' : 'default', ...style } }, label);
    el.disabled = !enabled;
    if (enabled) el.addEventListener('click', on);
    return el;
  };

  function render() {
    wrap.textContent = '';
    wrap.appendChild(h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 } },
      h('div', null,
        h('div', { style: { fontSize: F.tiny, fontWeight: 700, color: C.accent, letterSpacing: 3, textTransform: 'uppercase' } }, 'Admin · local records'),
        h('h2', { style: { fontSize: F.h2, fontWeight: 800, color: C.text, margin: '4px 0 0' } }, `Lead form submissions (${records.length})`),
        h('p', { style: { fontSize: F.tiny, color: C.textMuted, marginTop: 6 } }, 'Stored in this browser only, as a backup; HubSpot holds the canonical copies. Remove ', h('code', null, '#admin-leads'), ' from the URL to return.')),
      h('div', { style: { display: 'flex', gap: 10 } },
        btn('Export CSV', exportCSV, !!records.length, { border: 'none', background: records.length ? C.accent : C.border, color: records.length ? '#fff' : C.textMuted, fontWeight: 700 }),
        btn('Clear', clearAll, !!records.length, { border: `1px solid ${C.border}`, background: 'transparent', color: records.length ? C.textMid : C.textMuted, fontWeight: 600 }),
        btn('Close', onClose, true, { border: `1px solid ${C.border}`, background: C.surface, color: C.textMid, fontWeight: 600 }))));

    if (!records.length) {
      wrap.appendChild(h('div', { style: { padding: 48, textAlign: 'center', background: C.surface, borderRadius: 14, border: `1px dashed ${C.border}`, color: C.textMuted, fontSize: F.small } },
        'No submissions yet. Records appear here as users complete the lead form in this browser.'));
      return;
    }
    wrap.appendChild(h('div', { style: { overflowX: 'auto', background: C.surface, borderRadius: 14, border: `1px solid ${C.borderLight}` } },
      h('table', { style: { borderCollapse: 'collapse', width: '100%' } },
        h('thead', null, h('tr', null, ...['When', 'Name', 'Email', 'Organisation', 'Role', 'Net saving', 'Hrs/wk']
          .map(t => h('th', { style: { ...cell, color: C.textMuted, fontWeight: 700 } }, t)))),
        h('tbody', null, ...records.map(rec => h('tr', null,
          h('td', { style: cell }, new Date(rec.timestamp).toLocaleString('en-GB')),
          h('td', { style: { ...cell, color: C.text, fontWeight: 600 } }, (rec.lead && rec.lead.name) || '-'),
          h('td', { style: cell }, (rec.lead && rec.lead.email) || '-'),
          h('td', { style: cell }, (rec.lead && rec.lead.org) || '-'),
          h('td', { style: cell }, (rec.lead && rec.lead.role) || '-'),
          h('td', { style: { ...cell, color: C.accent, fontWeight: 700 } }, rec.results && rec.results.netSaving != null ? fmtK(rec.results.netSaving) : '-'),
          h('td', { style: cell }, rec.results && rec.results.timeSavedWeek != null ? fmtNum(rec.results.timeSavedWeek) : '-')))))));
  }

  render();
  return wrap;
}
