export const C = {
  bg: "#0E1726", bgGrad1: "#0B1424", bgGrad2: "#16263F",
  surface: "#1B2B4B", surface2: "#22335A", border: "#2C4070", borderLight: "#243454",
  text: "#EEF1F7", textMid: "#A9B6CE", textMuted: "#7E8CA8",
  accent: "#E8392A", accentMid: "#F05C50", accentSoft: "#33181B", accentPale: "#241317",
  navy: "#1B2B4B", navyMid: "#2C4070", good: "#36C28B", amber: "#F0A848",
  // Alias keys mapped to coral/navy so existing components that import them don't break.
  accentLight: "#33181B",
  green: "#36C28B", greenPale: "#13261D",
  teal: "#E8392A", tealLight: "#F05C50", tealPale: "#241317",
  rose: "#E8392A", rosePale: "#33181B",
  blue: "#5B8DEF", purple: "#B07CF0",
};
export const F = { hero: 104, h1: 40, h2: 28, h3: 22, body: 18, small: 16, tiny: 14, label: 15 };
export const W = 1080, H = 1920;
export const fmt = n => "£" + Math.round(n || 0).toLocaleString("en-GB");
export const fmtK = n => { n = n || 0; return n >= 1e6 ? `£${(n/1e6).toFixed(2)}m` : n >= 1000 ? `£${Math.round(n/1000).toLocaleString("en-GB")}k` : fmt(n); };
export const fmtNum = n => Math.round(n || 0).toLocaleString("en-GB");
export const KIOSK_STEPS = ["Your bank", "Agency", "Your team", "Results"];
