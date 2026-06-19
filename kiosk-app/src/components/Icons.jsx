import React from 'react';

// Stroke-based SVG icon wrapper - 24x24 viewBox, round caps/joins
const I = ({ size = 24, stroke = "currentColor", sw = 1.8, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {children}
  </svg>
);

// ══════════════════════════════════════════════
// PROVIDER TYPES
// ══════════════════════════════════════════════

// Critical Access / Rural - small clinic with pitched roof and medical cross
export const IconHospital = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M2 21h20" />
  <rect x="4" y="11" width="16" height="10" rx="1" />
  <path d="M4 11l8-7 8 7" />
  <path d="M12 14v4M10 16h4" />
</I>;

// Community Hospital - two-storey building with windows, entrance, cross
export const IconCommunity = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M2 21h20" />
  <rect x="3" y="8" width="18" height="13" rx="1" />
  <path d="M3 14h18" />
  <path d="M12 3v5M10 5.5h4" />
  <path d="M7 11h2M15 11h2" />
  <path d="M7 17h2M15 17h2" />
  <rect x="10" y="16" width="4" height="5" rx="0.5" />
</I>;

// Regional Medical Center - tall central tower with two shorter wings
export const IconRegional = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M2 21h20" />
  <rect x="7" y="4" width="10" height="17" rx="1" />
  <rect x="2" y="10" width="5" height="11" rx="1" />
  <rect x="17" y="10" width="5" height="11" rx="1" />
  <path d="M12 7v4M10.5 9h3" />
  <path d="M10 14h4M10 17h4" />
  <path d="M4 14h1M4 17h1M19 14h1M19 17h1" />
</I>;

// Academic Medical Center - graduation cap
export const IconAcademic = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M12 3L2 9l10 6 10-6-10-6z" />
  <path d="M6 11.5v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
  <path d="M20 9v7" />
</I>;

// IDN - three hospital buildings connected by lines
export const IconIDN = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M1 21h22" />
  <rect x="1" y="12" width="6" height="9" rx="1" />
  <path d="M4 15v2M3 16h2" />
  <rect x="9" y="6" width="6" height="15" rx="1" />
  <path d="M12 9v2.5M11 10.25h2" />
  <rect x="17" y="12" width="6" height="9" rx="1" />
  <path d="M20 15v2M19 16h2" />
  <path d="M7 16h2M15 16h2" />
</I>;

// ══════════════════════════════════════════════
// FACILITY TYPES
// ══════════════════════════════════════════════

// Ambulatory Surgery Center - medical facility with cross
export const IconSurgery = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <rect x="3" y="4" width="18" height="17" rx="2" />
  <path d="M3 8h18" />
  <path d="M12 12v6M9 15h6" />
</I>;

// Physician Practices - stethoscope (clean U-shape with chest piece)
export const IconPhysician = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M7 3v3a5 5 0 005 5h0a5 5 0 005-5V3" />
  <path d="M12 11v4a3 3 0 003 3h0a3 3 0 003-3v-2" />
  <circle cx="18" cy="20" r="2.5" />
</I>;

// Urgent Care - shield with medical cross
export const IconUrgentCare = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M12 2l8 4v5c0 5.5-3.5 10-8 12-4.5-2-8-6.5-8-12V6l8-4z" />
  <path d="M12 9v6M9 12h6" />
</I>;

// Imaging Centers - diagnostic monitor with waveform
export const IconImaging = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <rect x="2" y="3" width="20" height="14" rx="2" />
  <path d="M4 12h4l2-3 2 6 2-3h6" />
  <path d="M12 17v2" />
  <path d="M8 21h8" />
</I>;

// Dialysis - IV bag with drip drop
export const IconDialysis = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M12 2v2" />
  <rect x="7" y="4" width="10" height="10" rx="1.5" />
  <path d="M10 7h4M10 10h4" />
  <path d="M12 14v3" />
  <path d="M12 19c-1.5 0-2.5 1-2.5 2s1 2 2.5 2 2.5-1 2.5-2-1-2-2.5-2z" />
</I>;

// Skilled Nursing Facility - person sitting in bed
export const IconSNF = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <circle cx="8" cy="6" r="2.5" />
  <path d="M6 11c0-1 1-2 2-2s2 1 2 2v3H6v-3z" />
  <path d="M3 17h18" />
  <path d="M10 14h8v3" />
  <path d="M3 14v6M21 17v3" />
  <path d="M5 20h2M17 20h2" />
</I>;

// Home Health - house with heart
export const IconHomeHealth = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M3 10l9-7 9 7" />
  <path d="M5 9v11a1 1 0 001 1h12a1 1 0 001-1V9" />
  <path d="M12 13.5c-.8-1.2-2.5-1.5-3-.5s.5 2.5 3 4.5c2.5-2 3.5-3.5 3-4.5s-2.2-.7-3 .5z" />
</I>;

// Behavioral Health - brain outline with heart
export const IconBehavioral = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M12 3c-1.5 0-3 .5-4 1.5s-1.5 2-2 3c-.5 1.5-.5 3 0 4s1 1.5 1 2.5c0 1.5.5 3 1.5 4S10.5 20 12 20" />
  <path d="M12 3c1.5 0 3 .5 4 1.5s1.5 2 2 3c.5 1.5.5 3 0 4s-1 1.5-1 2.5c0 1.5-.5 3-1.5 4S13.5 20 12 20" />
  <path d="M12 12c-.6-.9-1.8-1.1-2.2-.3s.3 1.6 2.2 3c1.9-1.4 2.5-2.2 2.2-3s-1.6-.6-2.2.3z" />
</I>;

// Rehabilitation - person doing arm exercise with dumbbell
export const IconRehab = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <circle cx="10" cy="4" r="2" />
  <path d="M10 6v5" />
  <path d="M10 11l-4 6" />
  <path d="M10 11l4 6" />
  <path d="M6 9h2" />
  <path d="M10 8l6-3" />
  <path d="M14.5 4.5h3" />
  <path d="M16 3v3" />
</I>;

// Long-Term Acute Care - heart with ECG pulse line
export const IconLTACH = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M20 8.5c0-2.5-2-4.5-4.5-4.5-1.5 0-2.8.7-3.5 1.8C11.3 4.7 10 4 8.5 4 6 4 4 6 4 8.5c0 5 8 11.5 8 11.5s8-6.5 8-11.5z" />
  <path d="M4 12h4l1.5-2 2 4 1.5-2H20" />
</I>;

// ══════════════════════════════════════════════
// RESULTS / KPI ICONS
// ══════════════════════════════════════════════

export const IconUnlock = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <rect x="5" y="11" width="14" height="10" rx="2" />
  <path d="M8 11V7a4 4 0 018 0" />
  <circle cx="12" cy="16" r="1" />
</I>;

export const IconClock = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <circle cx="12" cy="12" r="10" />
  <path d="M12 6v6l4 2" />
</I>;

export const IconDollar = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M12 2v20" />
  <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
</I>;

export const IconShield = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M12 2l8 4v5c0 5.25-3.5 9.75-8 11-4.5-1.25-8-5.75-8-11V6l8-4z" />
  <path d="M9 12l2 2 4-4" />
</I>;

export const IconNetwork = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <circle cx="12" cy="5" r="2.5" />
  <circle cx="4.5" cy="19" r="2.5" />
  <circle cx="19.5" cy="19" r="2.5" />
  <path d="M12 7.5v4M7 18l3.5-6.5M17 18l-3.5-6.5" />
</I>;

export const IconGraduation = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M12 3L2 9l10 6 10-6-10-6z" />
  <path d="M6 11.5v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
  <path d="M20 9v7" />
</I>;

export const IconCalendar = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <rect x="3" y="5" width="18" height="16" rx="2" />
  <path d="M8 3v4M16 3v4M3 10h18" />
  <path d="M8 14h2M11 14h2M14 14h2" />
  <path d="M8 17h2M11 17h2" />
</I>;

export const IconLightbulb = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M9 18h6M10 21h4" />
  <path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z" />
</I>;

export const IconCheck = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <circle cx="12" cy="12" r="10" />
  <path d="M8 12l3 3 5-6" />
</I>;

export const IconSearch = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <circle cx="11" cy="11" r="7" />
  <path d="M16 16l5 5" />
</I>;

// ══════════════════════════════════════════════
// LOOKUP MAP
// ══════════════════════════════════════════════

export const ICONS = {
  hospital: IconHospital,
  community: IconCommunity,
  regional: IconRegional,
  academic: IconAcademic,
  idn: IconIDN,
  surgery: IconSurgery,
  physician: IconPhysician,
  urgentCare: IconUrgentCare,
  imaging: IconImaging,
  dialysis: IconDialysis,
  snf: IconSNF,
  homeHealth: IconHomeHealth,
  behavioral: IconBehavioral,
  rehab: IconRehab,
  ltach: IconLTACH,
  unlock: IconUnlock,
  clock: IconClock,
  dollar: IconDollar,
  shield: IconShield,
  network: IconNetwork,
  graduation: IconGraduation,
  calendar: IconCalendar,
  lightbulb: IconLightbulb,
  check: IconCheck,
  search: IconSearch,
};

export function Icon({ name, size = 24, stroke = "currentColor" }) {
  const Comp = ICONS[name];
  return Comp ? <Comp size={size} stroke={stroke} /> : null;
}
