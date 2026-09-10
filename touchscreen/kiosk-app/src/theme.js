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
