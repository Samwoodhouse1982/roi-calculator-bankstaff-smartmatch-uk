/* Builds the SOURCE hand-off package, matching the file structure the client's
   dev team already integrated for the EPR Migration & Archiving calculator:

     package-source/smartmatch-roi-calculator/
       README.md                 <- architecture + quick start
       INTEGRATION-GUIDE.md      <- HubSpot, CSP, framing, PDF branding
       DATA-LAYER-REFERENCE.md   <- window.smartMatchROIData reference
       ROICalculator.jsx         <- single-file React component (import into their app)
       styles.css                <- animations / interaction styles
       roi-calculator.html       <- standalone, self-contained (React + Babel via CDN)
       embed-snippet.html        <- iframe + auto-resize listener

   Both build artefacts are GENERATED from src/, so the Vite app stays the one
   source of truth: the engine, its tests and cross-product parity all still
   apply to what ships. Run: npm run package:source
*/
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'package-source');
const bundle = resolve(out, 'smartmatch-roi-calculator');
const docs = resolve(root, 'docs/source-package');

/* Dependency order: every module may only use names defined above it. */
const MODULES = [
  'src/calc/engine.js',
  'src/theme.js',
  'src/dataLayer.js',
  'src/components/Icons.jsx',
  'src/components/index.jsx',
  'src/components/LeadCapture.jsx',
  'src/steps/index.jsx',
  'src/results/ResultsPage.jsx',
  'src/App.jsx',
];

/* Strip module syntax: the parts become one flat scope. */
function flatten(file) {
  let s = readFileSync(resolve(root, file), 'utf8');
  s = s.replace(/^import\s+[^;]*?;[ \t]*\n/gm, '');          // every import (all are single-line)
  s = s.replace(/^export\s+default\s+function\s+App\s*\(/m, 'function ROICalculator(');
  s = s.replace(/^export\s+(const|function|let|class)\s/gm, '$1 ');
  s = s.replace(/^export\s*\{[^}]*\};?[ \t]*\n/gm, '');
  return `/* ─────────── ${file} ─────────── */\n${s.trim()}\n`;
}

const logoB64 = readFileSync(resolve(root, 'src/assets/rldatix-logo.png')).toString('base64');
const LOGO_CONST = `/* RLDatix wordmark, inlined so the component and the standalone file carry no
   external asset. Used as a CSS mask in the header and embedded in the PDF. */
const rldatixLogo = "data:image/png;base64,${logoB64}";\n`;

const body = MODULES.map(flatten).join('\n');
const HOOKS = 'useState, useMemo, useCallback, useRef, useEffect';

const BANNER = (what) => `/* ═══════════════════════════════════════════════════════════════════════
   RLDatix Smart Match (BankStaff+) - Workforce ROI Calculator
   ${what}

   GENERATED FILE - do not edit by hand. Built from the Vite source app by
   scripts/build-source-package.mjs so the calculation engine stays identical
   to the tested, cross-product-verified original.

   Model: cash saving = the agency premium displaced when better bank
   utilisation moves duties off agency onto the trust's own bank. Capacity
   (shifts moved) is shown separately and never added to the cash saving.
   ═══════════════════════════════════════════════════════════════════════ */\n\n`;

/* ── 1. ROICalculator.jsx: for dropping into an existing React app ── */
const jsx = BANNER('Single-file React component (React 18+)')
  + `import { ${HOOKS} } from "react";\n\n`
  + LOGO_CONST + '\n' + body + '\nexport default ROICalculator;\n';
mkdirSync(bundle, { recursive: true });

/* ── 2. roi-calculator.html: standalone, no build step ──
   React, ReactDOM, Babel and jsPDF come from CDNs with fallbacks (matching the
   reference package). The component source is identical apart from the module
   wrapper and the jsPDF loader. */
const htmlBody = body.replace(
  /const \{ jsPDF \} = await import\("jspdf"\);/,
  'const { jsPDF } = await loadJsPDF();'
);
const styles = readFileSync(resolve(docs, 'styles.css'), 'utf8');

const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smart Match: Workforce ROI Calculator | RLDatix</title>
  <meta name="description" content="Estimate the cash and staff time your NHS organisation could release with Smart Match, a BankStaff+ feature. Indicative, conservative and editable.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
  <style>
${styles}
  </style>
</head>
<body>
  <div id="root">
    <div id="js-fallback" style="color:#3D5A5E;text-align:center;padding:120px 32px;font-family:'DM Sans',sans-serif;font-size:16px;">
      <div style="font-size:24px;font-weight:700;color:#0F4146;margin-bottom:16px;">Loading calculator...</div>
      <div>This calculator needs JavaScript. If this message persists, please contact your RLDatix representative.</div>
    </div>
  </div>

  <script>
  // Boot-failure screen for OUR OWN code only: errors raised by browser
  // extensions or host-injected scripts (any other origin) must never blank
  // the calculator.
  window.onerror = function (m, s) {
    var own = s && (s === location.href || s.indexOf(location.protocol + '//' + location.host) === 0);
    var f = document.getElementById('js-fallback');
    if (!own || !f) return;
    f.innerHTML = '<div style="color:#0F4146;font-size:20px;font-weight:700;">Something went wrong</div><div style="margin-top:12px;color:#3D5A5E;"></div>';
    f.lastChild.textContent = String(m);
  };
  </script>

  <!-- React 18 + Babel. Each library tries three CDNs in turn, so one blocked
       or unreachable host (common on locked-down NHS networks) does not stop
       the calculator loading. -->
  <script>
  (function () {
    var V = {
      react: ["https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js","https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js","https://unpkg.com/react@18.3.1/umd/react.production.min.js"],
      reactDom: ["https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js","https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js","https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"],
      babel: ["https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.4/babel.min.js","https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.4/babel.min.js","https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"]
    };
    function chain(list, done) {
      var i = 0;
      (function go() {
        if (i >= list.length) return;
        var e = document.createElement("script");
        e.crossOrigin = "anonymous";
        e.src = list[i++];
        e.onload = function () { if (done) done(); };
        e.onerror = go;
        document.head.appendChild(e);
      })();
    }
    chain(V.react, function () { chain(V.reactDom, function () { chain(V.babel, function () {
      if (window.Babel && Babel.transformScriptTags) Babel.transformScriptTags();
    }); }); });
  })();
  </script>

  <script type="text/babel" data-presets="react">
const { ${HOOKS} } = React;

/* jsPDF is loaded on demand (only when a visitor downloads their report), from
   the same three-CDN fallback chain. */
let _jspdfPromise = null;
function loadJsPDF() {
  if (_jspdfPromise) return _jspdfPromise;
  const SRCS = [
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js",
    "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js",
    "https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js",
  ];
  _jspdfPromise = new Promise((resolve, reject) => {
    let i = 0;
    (function go() {
      if (i >= SRCS.length) { _jspdfPromise = null; return reject(new Error("jsPDF unavailable")); }
      const el = document.createElement("script");
      el.crossOrigin = "anonymous";
      el.src = SRCS[i++];
      el.onload = () => (window.jspdf && window.jspdf.jsPDF) ? resolve(window.jspdf) : go();
      el.onerror = go;
      document.head.appendChild(el);
    })();
  });
  return _jspdfPromise;
}

${LOGO_CONST}
${htmlBody}

ReactDOM.createRoot(document.getElementById("root")).render(<ROICalculator />);
  </script>
</body>
</html>
`;

/* ── Assemble ── */
rmSync(out, { recursive: true, force: true });
mkdirSync(bundle, { recursive: true });
writeFileSync(resolve(bundle, 'ROICalculator.jsx'), jsx);
writeFileSync(resolve(bundle, 'roi-calculator.html'), html);
writeFileSync(resolve(bundle, 'styles.css'), styles);
for (const f of ['README.md', 'INTEGRATION-GUIDE.md', 'DATA-LAYER-REFERENCE.md', 'embed-snippet.html']) {
  cpSync(resolve(docs, f), resolve(bundle, f));
}

const kb = n => Math.round(n / 1024) + ' KB';
console.log('Source package built:');
for (const f of ['ROICalculator.jsx', 'roi-calculator.html', 'styles.css', 'embed-snippet.html', 'README.md', 'INTEGRATION-GUIDE.md', 'DATA-LAYER-REFERENCE.md']) {
  console.log('  ' + f.padEnd(26) + kb(readFileSync(resolve(bundle, f)).length));
}
try {
  execSync('zip -qr smartmatch-roi-calculator-source.zip smartmatch-roi-calculator', { cwd: out });
  console.log('\nZipped: package-source/smartmatch-roi-calculator-source.zip');
} catch (e) {
  console.log('\n`zip` not available: folder ready at package-source/smartmatch-roi-calculator/');
}
