export const C = {
  bg: "#0E1726", surface: "#1B2B4B", surface2: "#22335A", border: "#2C4070", borderLight: "#243454",
  text: "#EEF1F7", textMid: "#A9B6CE", textMuted: "#7E8CA8",
  accent: "#00D4AA", accentMid: "#00FFC8", accentSoft: "#0A2A22", good: "#36C28B", amber: "#F0A848",
  blue: "#5B8DEF", };
export const F = { hero: 104, h1: 40, h2: 28, h3: 22, body: 18, small: 16, tiny: 14, label: 15 };
export const W = 1080, H = 1920;
export const fmt = n => "£" + Math.round(n || 0).toLocaleString("en-GB");
export const fmtK = n => { n = n || 0; return n >= 1e6 ? `£${(n/1e6).toFixed(2)}m` : n >= 1000 ? `£${Math.round(n/1000).toLocaleString("en-GB")}k` : fmt(n); };
export const fmtNum = n => Math.round(n || 0).toLocaleString("en-GB");
export const KIOSK_STEPS = ["Your bank", "Agency", "Your team", "Confidence", "Results"];
