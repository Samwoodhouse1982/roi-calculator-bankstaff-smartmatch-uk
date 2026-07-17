// LIGHT theme — the RLDatix web-calculator design system (deep teal + seafoam
// on white), matching the main-branch Smart Match web build and the Galen ROI
// suite so the calculator sits comfortably on rldatix.com. Colours only: the
// kiosk build's dark palette lives on the smartmatch-touchscreen branch.
export const C = {
  bg: "#EEF7F2", bgGrad1: "#E8F2EF", bgGrad2: "#F5FAF8",
  surface: "#FFFFFF", surface2: "#F0F7F5", border: "#D4E0DD", borderLight: "#E8EFEC",
  text: "#0F4146", textMid: "#3D5A5E", textMuted: "#5F787C",
  accent: "#0F4146", accentMid: "#1A8A7A", accentSoft: "#E8FAF6", accentPale: "#F3FBF9",
  navy: "#0F4146", navyMid: "#1A5459", good: "#1A8A7A", amber: "#8A6508",
  seafoam: "#34DEC2",
  // Alias keys (teal/seafoam family) so existing components that import them don't break.
  accentLight: "#D6F7EE",
  green: "#1A8A7A", greenPale: "#EEF7F1",
  teal: "#0F4146", tealLight: "#D6F7EE", tealPale: "#E8FAF6",
  rose: "#93405A", rosePale: "#FAF0F4",
  blue: "#2E7BA6", purple: "#6E5AA8",
};
// Fluid web typography. The kiosk build used fixed px sizes tuned for a
// 1080×1920 touchscreen; this web variant scales each step between a phone
// floor and a desktop ceiling. Every component reads fontSize from F, so this
// one table makes the whole app responsive. (F values are CSS strings — do
// not use them in arithmetic.)
export const F = {
  hero: "clamp(2.4rem, 7.5vw, 4rem)",
  h1: "clamp(1.45rem, 3.4vw, 1.9rem)",
  h2: "clamp(1.2rem, 2.6vw, 1.5rem)",
  h3: "clamp(1.05rem, 2.2vw, 1.25rem)",
  body: "clamp(0.92rem, 1.7vw, 1.02rem)",
  small: "clamp(0.85rem, 1.5vw, 0.92rem)",
  tiny: "clamp(0.76rem, 1.35vw, 0.82rem)",
  label: "clamp(0.82rem, 1.5vw, 0.88rem)",
};
// Fluid horizontal gutter (was a fixed 56px on the kiosk) and content max width.
export const GUTTER = "clamp(16px, 4vw, 44px)";
export const MAXW = 900;
export const fmt = n => "£" + Math.round(n || 0).toLocaleString("en-GB");
export const fmtK = n => { n = n || 0; return n >= 1e6 ? `£${(n/1e6).toFixed(2)}m` : n >= 1000 ? `£${Math.round(n/1000).toLocaleString("en-GB")}k` : fmt(n); };
export const fmtNum = n => Math.round(n || 0).toLocaleString("en-GB");
export const KIOSK_STEPS = ["Your bank", "Agency", "Your team", "Confidence", "Results"];
