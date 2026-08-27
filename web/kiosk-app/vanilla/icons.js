/* ────────────────────────────────────────────────────────────────────────
   Stroke-based SVG icons, 24x24 viewBox, round caps and joins.

   Same geometry as the React build's Icons.jsx, held as shape data rather
   than markup: a path is just its `d`, a rect or circle its attributes. One
   builder turns any of them into an <svg>.
   ──────────────────────────────────────────────────────────────────────── */
import { s } from './dom';

const SHAPES = {
  hospital: [["path","M2 21h20"], ["rect",{"x":"4","y":"11","width":"16","height":"10","rx":"1"}], ["path","M4 11l8-7 8 7"], ["path","M12 14v4M10 16h4"]],
  community: [["path","M2 21h20"], ["rect",{"x":"3","y":"8","width":"18","height":"13","rx":"1"}], ["path","M3 14h18"], ["path","M12 3v5M10 5.5h4"], ["path","M7 11h2M15 11h2"], ["path","M7 17h2M15 17h2"], ["rect",{"x":"10","y":"16","width":"4","height":"5","rx":"0.5"}]],
  physician: [["path","M7 3v3a5 5 0 005 5h0a5 5 0 005-5V3"], ["path","M12 11v4a3 3 0 003 3h0a3 3 0 003-3v-2"], ["circle",{"cx":"18","cy":"20","r":"2.5"}]],
  home: [["path","M3 10l9-7 9 7"], ["path","M5 9v11a1 1 0 001 1h12a1 1 0 001-1V9"], ["path","M9.5 21v-6h5v6"]],
  behavioral: [["path","M12 3c-1.5 0-3 .5-4 1.5s-1.5 2-2 3c-.5 1.5-.5 3 0 4s1 1.5 1 2.5c0 1.5.5 3 1.5 4S10.5 20 12 20"], ["path","M12 3c1.5 0 3 .5 4 1.5s1.5 2 2 3c.5 1.5.5 3 0 4s-1 1.5-1 2.5c0 1.5-.5 3-1.5 4S13.5 20 12 20"], ["path","M12 12c-.6-.9-1.8-1.1-2.2-.3s.3 1.6 2.2 3c1.9-1.4 2.5-2.2 2.2-3s-1.6-.6-2.2.3z"]],
  clock: [["circle",{"cx":"12","cy":"12","r":"10"}], ["path","M12 6v6l4 2"]],
  pound: [["path","M18 7c0-5.333-8-5.333-8 0"], ["path","M10 7v14"], ["path","M6 21h12"], ["path","M6 13h10"]],
  network: [["circle",{"cx":"12","cy":"5","r":"2.5"}], ["circle",{"cx":"4.5","cy":"19","r":"2.5"}], ["circle",{"cx":"19.5","cy":"19","r":"2.5"}], ["path","M12 7.5v4M7 18l3.5-6.5M17 18l-3.5-6.5"]],
  calendar: [["rect",{"x":"3","y":"5","width":"18","height":"16","rx":"2"}], ["path","M8 3v4M16 3v4M3 10h18"], ["path","M8 14h2M11 14h2M14 14h2"], ["path","M8 17h2M11 17h2"]],
  lightbulb: [["path","M9 18h6M10 21h4"], ["path","M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"]],
  check: [["circle",{"cx":"12","cy":"12","r":"10"}], ["path","M8 12l3 3 5-6"]],
  search: [["circle",{"cx":"11","cy":"11","r":"7"}], ["path","M16 16l5 5"]],
  mail: [["rect",{"x":"3","y":"5","width":"18","height":"14","rx":"2"}], ["path","M3 7l9 6 9-6"]],
};

export function Icon(name, size = 24, stroke = 'currentColor', sw = 1.8) {
  const shapes = SHAPES[name];
  if (!shapes) return null;
  const svg = s('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke,
    'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true', focusable: 'false',
  });
  svg.style.flexShrink = '0';
  for (const [tag, attrs] of shapes) {
    svg.appendChild(s(tag, tag === 'path' ? { d: attrs } : attrs));
  }
  return svg;
}
