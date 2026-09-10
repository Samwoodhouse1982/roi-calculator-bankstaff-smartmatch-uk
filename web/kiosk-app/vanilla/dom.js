/* ────────────────────────────────────────────────────────────────────────
   A 40-line stand-in for the parts of React this calculator actually used.

   `h()` mirrors React.createElement closely enough that the port of each
   component is a near-mechanical translation of the original JSX, including
   the inline style objects: numbers get "px" appended exactly as React does,
   so the plain-JS build renders pixel for pixel like the React one.

   There is no virtual DOM and no reconciliation. The calculator is a small
   number of discrete screens, so a screen is built once and either replaced
   wholesale on navigation or patched by hand where a value updates live (the
   confidence slider on the results page). That is the whole framework.
   ──────────────────────────────────────────────────────────────────────── */

/* CSS properties that take a bare number. Everything else gets "px" when
   handed a number, which is the rule React follows. */
const UNITLESS = new Set([
  'animationIterationCount', 'aspectRatio', 'borderImageOutset', 'borderImageSlice', 'borderImageWidth',
  'boxFlex', 'boxFlexGroup', 'boxOrdinalGroup', 'columnCount', 'columns', 'flex', 'flexGrow', 'flexPositive',
  'flexShrink', 'flexNegative', 'flexOrder', 'gridArea', 'gridRow', 'gridRowEnd', 'gridRowSpan', 'gridRowStart',
  'gridColumn', 'gridColumnEnd', 'gridColumnSpan', 'gridColumnStart', 'fontWeight', 'lineClamp', 'lineHeight',
  'opacity', 'order', 'orphans', 'tabSize', 'widows', 'zIndex', 'zoom', 'fillOpacity', 'floodOpacity',
  'stopOpacity', 'strokeDasharray', 'strokeDashoffset', 'strokeMiterlimit', 'strokeOpacity', 'strokeWidth',
]);

export function setStyle(el, style) {
  for (const k in style) {
    const v = style[k];
    if (v == null) continue;
    el.style[k] = (typeof v === 'number' && !UNITLESS.has(k)) ? v + 'px' : v;
  }
}

function appendChild(el, c) {
  if (c == null || c === false || c === true) return;
  if (Array.isArray(c)) { c.forEach(x => appendChild(el, x)); return; }
  el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
}

function applyProps(el, props) {
  for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'style') { setStyle(el, v); }
    else if (k === 'className' || k === 'class') { el.setAttribute('class', v); }
    else if (k === 'html') { el.innerHTML = v; }            // trusted, author-supplied only
    else if (k.startsWith('on') && typeof v === 'function') { el.addEventListener(k.slice(2).toLowerCase(), v); }
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') { el[k] = v; }
    else { el.setAttribute(k, v === true ? '' : String(v)); }
  }
}

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) applyProps(el, props);
  children.forEach(c => appendChild(el, c));
  return el;
}

/* Same, in the SVG namespace: attributes only, no style objects needed. */
export function s(tag, attrs, ...children) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) for (const k in attrs) { if (attrs[k] != null) el.setAttribute(k, String(attrs[k])); }
  children.forEach(c => { if (c) el.appendChild(c); });
  return el;
}

/* A document fragment, for the places the JSX used a <> … </> wrapper. */
export function frag(...children) {
  const f = document.createDocumentFragment();
  children.forEach(c => appendChild(f, c));
  return f;
}

/* Replace an element's children in one go. */
export function fill(el, ...children) {
  el.textContent = '';
  children.forEach(c => appendChild(el, c));
  return el;
}

