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

// Academic Medical Center - graduation cap

// IDN - three hospital buildings connected by lines

// ══════════════════════════════════════════════
// FACILITY TYPES
// ══════════════════════════════════════════════

// Ambulatory Surgery Center - medical facility with cross

// Physician Practices - stethoscope (clean U-shape with chest piece)
export const IconPhysician = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M7 3v3a5 5 0 005 5h0a5 5 0 005-5V3" />
  <path d="M12 11v4a3 3 0 003 3h0a3 3 0 003-3v-2" />
  <circle cx="18" cy="20" r="2.5" />
</I>;

// Urgent Care - shield with medical cross

// Imaging Centers - diagnostic monitor with waveform

// Dialysis - IV bag with drip drop

// Skilled Nursing Facility - person sitting in bed

// Home Health - house with heart

// Home - plain house with a door
export const IconHome = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M3 10l9-7 9 7" />
  <path d="M5 9v11a1 1 0 001 1h12a1 1 0 001-1V9" />
  <path d="M9.5 21v-6h5v6" />
</I>;

// Behavioral Health - brain outline with heart
export const IconBehavioral = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M12 3c-1.5 0-3 .5-4 1.5s-1.5 2-2 3c-.5 1.5-.5 3 0 4s1 1.5 1 2.5c0 1.5.5 3 1.5 4S10.5 20 12 20" />
  <path d="M12 3c1.5 0 3 .5 4 1.5s1.5 2 2 3c.5 1.5.5 3 0 4s-1 1.5-1 2.5c0 1.5-.5 3-1.5 4S13.5 20 12 20" />
  <path d="M12 12c-.6-.9-1.8-1.1-2.2-.3s.3 1.6 2.2 3c1.9-1.4 2.5-2.2 2.2-3s-1.6-.6-2.2.3z" />
</I>;

// Rehabilitation - person doing arm exercise with dumbbell

// Long-Term Acute Care - heart with ECG pulse line

// ══════════════════════════════════════════════
// RESULTS / KPI ICONS
// ══════════════════════════════════════════════


export const IconClock = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <circle cx="12" cy="12" r="10" />
  <path d="M12 6v6l4 2" />
</I>;

export const IconPound = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <path d="M18 7c0-5.333-8-5.333-8 0" />
  <path d="M10 7v14" />
  <path d="M6 21h12" />
  <path d="M6 13h10" />
</I>;


export const IconNetwork = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <circle cx="12" cy="5" r="2.5" />
  <circle cx="4.5" cy="19" r="2.5" />
  <circle cx="19.5" cy="19" r="2.5" />
  <path d="M12 7.5v4M7 18l3.5-6.5M17 18l-3.5-6.5" />
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

export const IconMail = ({ size, stroke }) => <I size={size} stroke={stroke}>
  <rect x="3" y="5" width="18" height="14" rx="2" />
  <path d="M3 7l9 6 9-6" />
</I>;

// ══════════════════════════════════════════════
// LOOKUP MAP
// ══════════════════════════════════════════════

export const ICONS = {
  hospital: IconHospital,
  community: IconCommunity,
  physician: IconPhysician,
  home: IconHome,
  behavioral: IconBehavioral,
  clock: IconClock,
  pound: IconPound,
  network: IconNetwork,
  calendar: IconCalendar,
  lightbulb: IconLightbulb,
  check: IconCheck,
  search: IconSearch,
  mail: IconMail,
};

export function Icon({ name, size = 24, stroke = "currentColor" }) {
  const Comp = ICONS[name];
  return Comp ? <Comp size={size} stroke={stroke} /> : null;
}
