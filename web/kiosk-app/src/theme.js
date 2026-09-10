// LIGHT theme — the RLDatix web-calculator design system (deep teal + seafoam
// on white), matching the main-branch Smart Match web build and the wider RLDatix ROI
// suite so the calculator sits comfortably on rldatix.com. Colours only: the
// kiosk build's dark palette lives on the smartmatch-touchscreen branch.
export const C = {
  bg: "#EEF7F2", surface: "#FFFFFF", surface2: "#F0F7F5", border: "#D4E0DD", borderLight: "#E8EFEC",
  text: "#0F4146", textMid: "#3D5A5E", textMuted: "#5F787C",
  accent: "#0F4146", accentMid: "#1A8A7A", accentSoft: "#E8FAF6", navy: "#0F4146", navyMid: "#1A5459", good: "#1A8A7A", amber: "#8A6508",
  seafoam: "#34DEC2",
  blue: "#2E7BA6", };
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
};
// Fluid horizontal gutter (was a fixed 56px on the kiosk) and content max width.
export const GUTTER = "clamp(16px, 4vw, 44px)";
export const MAXW = 900;
export const fmt = n => "£" + Math.round(n || 0).toLocaleString("en-GB");
export const fmtK = n => { n = n || 0; return n >= 1e6 ? `£${(n/1e6).toFixed(2)}m` : n >= 1000 ? `£${Math.round(n/1000).toLocaleString("en-GB")}k` : fmt(n); };
export const fmtNum = n => Math.round(n || 0).toLocaleString("en-GB");
export const KIOSK_STEPS = ["Your bank", "Agency", "Your team", "Confidence", "Results"];

/* Bank-register slider range. The top matches the licence price list, which is
   banded all the way to 100,000 workers, so any organisation the list can price
   can also be modelled here.

   The slider runs on a LOG scale rather than a linear one. Nearly every bank
   register sits below 10,000, and a linear track from 50 to 100,000 would put
   roughly 170 workers under every pixel: the sizes almost everyone needs would
   be squeezed into the first tenth of the slider and be impossible to set. On a
   log track the common range gets half the width (2,000 lands mid-slider) and
   the tens of thousands still reachable at the far end.

   Only the thumb POSITION curves. The value, and every figure derived from it,
   are exactly what they would be if the number were typed in. `steps` is the
   resolution of the underlying range input, in positions, not workers. */
export const BANK_MIN = 50;
export const BANK_MAX = 100000;
/* Snap to a round number for the size, so the readout reads like something a
   person would say ("3,500", not "3,487"). */
const snapBank = v =>
  v < 1000  ? Math.round(v / 10) * 10 :
  v < 10000 ? Math.round(v / 50) * 50 :
  v < 50000 ? Math.round(v / 500) * 500 :
              Math.round(v / 1000) * 1000;
export const bankScale = {
  steps: 1000,
  toPos: v => Math.round(1000 * Math.log(Math.max(BANK_MIN, Math.min(BANK_MAX, v)) / BANK_MIN) / Math.log(BANK_MAX / BANK_MIN)),
  fromPos: p => Math.max(BANK_MIN, Math.min(BANK_MAX, snapBank(BANK_MIN * Math.pow(BANK_MAX / BANK_MIN, p / 1000)))),
};
