/* Builds the PLAIN-JS calculator: no React, no JSX, no build step for the
   consumer, no framework of any kind.

   The client's dev team cannot run React on their site, so this build exists
   alongside the React one rather than replacing it. Both are assembled from
   the same sources: the engine, the theme, the data layer and the whole of
   the lead-capture core (HubSpot config, submission and PDF) are shared
   files, so the figures, the form GUID and the report cannot differ between
   the two products. Only the view layer differs.

   Outputs, into the source package:
     roi-calculator.js    the calculator as one plain script (no modules)
     roi-calculator.html  the same, self-contained, ready to host or inline

   Run as part of `npm run package:source`.
*/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = resolve(root, 'package-source/smartmatch-roi-calculator');
const docs = resolve(root, 'docs/source-package');

/* Dependency order: every file may only use names defined above it. The first
   four are shared verbatim with the React build. */
const MODULES = [
  'src/calc/engine.js',
  'src/theme.js',
  'src/dataLayer.js',
  'src/lead/core.js',
  'vanilla/dom.js',
  'vanilla/icons.js',
  'vanilla/ui.js',
  'vanilla/steps.js',
  'vanilla/lead.js',
  'vanilla/results.js',
  'vanilla/app.js',
];

/* Strip module syntax: the parts become one flat scope. */
function flatten(file) {
  let s = readFileSync(resolve(root, file), 'utf8');
  s = s.replace(/^import\s+[^;]*?;[ \t]*\n/gm, '');                        // every import (all single-line)
  s = s.replace(/^export\s+(async\s+function|const|function|let|class)\s/gm, '$1 ');
  s = s.replace(/^export\s*\{[^}]*\};?[ \t]*\n/gm, '');                    // re-export lines
  return `/* ─────────── ${file} ─────────── */\n${s.trim()}\n`;
}

const logoB64 = readFileSync(resolve(root, 'src/assets/rldatix-logo.png')).toString('base64');
const LOGO = `/* RLDatix wordmark, inlined so the calculator carries no external asset.
   Used as a CSS mask on the start screen and embedded in the PDF. */
const rldatixLogo = "data:image/png;base64,${logoB64}";\n`;

const body = MODULES.map(flatten).join('\n');

/* jsPDF is the calculator's only dependency, and only when a visitor asks for
   a report. In the standalone build it comes from a CDN with two fallbacks;
   nothing is fetched until the download button is pressed. */
const JSPDF_LOADER = `/* jsPDF, loaded on demand (only when a visitor downloads their report), from
   three CDNs in turn so one blocked host does not cost them the PDF. */
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
}\n`;

const scriptBody = body.replace(
  /const \{ jsPDF \} = await import\("jspdf"\);/,
  'const { jsPDF } = await loadJsPDF();'
);

const BANNER = `/* ═══════════════════════════════════════════════════════════════════════
   RLDatix Smart Match (BankStaff+) - Workforce ROI Calculator
   Plain JavaScript. No framework, no JSX, no build step.

   GENERATED FILE - do not edit by hand. Built from the maintained source app
   by scripts/build-vanilla.mjs, which shares the calculation engine, the
   theme, the data layer and the whole lead-capture core (HubSpot config,
   submission and PDF report) with the React build of the same calculator, so
   the two cannot produce different figures or send different submissions.

   Model: cash saving = the agency premium displaced when better bank
   utilisation moves duties off agency onto the trust's own bank. Capacity
   (shifts moved) is shown separately and never added to the cash saving.

   Usage: this script defines one global, SmartMatchROI, with a single method.
     SmartMatchROI.mount(document.getElementById("root"))
   ═══════════════════════════════════════════════════════════════════════ */`;

/* One IIFE, one global. Nothing else is added to the page. */
const js = `${BANNER}
(function () {
  "use strict";

${LOGO}
${JSPDF_LOADER}
${scriptBody}

  /* The only global this script defines. */
  window.SmartMatchROI = { mount: mount };
})();
`;

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

  <script>
${js}
  </script>
  <script>
    SmartMatchROI.mount(document.getElementById("root"));
  </script>
</body>
</html>
`;

mkdirSync(bundle, { recursive: true });
writeFileSync(resolve(bundle, 'roi-calculator.js'), js);
writeFileSync(resolve(bundle, 'roi-calculator.html'), html);
