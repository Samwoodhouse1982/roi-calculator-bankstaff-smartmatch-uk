/* Builds the hand-off package for the client's dev team.

     package-source/smartmatch-roi-calculator/
       WHAT-CHANGED.md           <- why this replaces the live version, and the one step to take
       README.md                 <- architecture + quick start
       INTEGRATION-GUIDE.md      <- HubSpot, CSP, framing, PDF branding
       DATA-LAYER-REFERENCE.md   <- window.smartMatchROIData reference
       roi-calculator.html       <- standalone, self-contained, plain JS
       roi-calculator.js         <- the calculator as one plain script
       styles.css                <- base styles (inlined into the HTML already)
       embed-snippet.html        <- iframe + auto-resize listener
       embed-snippet-srcdoc.html <- the same, with the calculator inlined (nothing to host)

   The calculator ships as PLAIN JAVASCRIPT: no React, no JSX, no build step,
   because their site cannot run a framework. It is generated from the
   maintained source app by build-vanilla.mjs, which shares the engine, the
   theme, the data layer and the whole lead-capture core with the React build
   of the same calculator, so the tested figures and the shipped ones cannot
   drift apart. Run: npm run package:source
*/
import { readFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'package-source');
const bundle = resolve(out, 'smartmatch-roi-calculator');
const docs = resolve(root, 'docs/source-package');
const run = f => execSync('node ' + JSON.stringify(resolve(root, 'scripts', f)), { stdio: 'inherit' });

rmSync(out, { recursive: true, force: true });
mkdirSync(bundle, { recursive: true });

/* 1. The calculator itself: roi-calculator.js + roi-calculator.html. */
run('build-vanilla.mjs');

/* 2. Documentation and the hosted-file embed snippet. */
cpSync(resolve(docs, 'styles.css'), resolve(bundle, 'styles.css'));
for (const f of ['WHAT-CHANGED.md', 'README.md', 'INTEGRATION-GUIDE.md', 'DATA-LAYER-REFERENCE.md', 'embed-snippet.html']) {
  cpSync(resolve(docs, f), resolve(bundle, f));
}

/* 3. The inline snippet carries roi-calculator.html inside it, so it has to be
   generated last and regenerated whenever the calculator changes. */
run('build-embed-snippet-srcdoc.mjs');

const FILES = ['roi-calculator.html', 'roi-calculator.js', 'styles.css', 'embed-snippet.html', 'embed-snippet-srcdoc.html', 'WHAT-CHANGED.md', 'README.md', 'INTEGRATION-GUIDE.md', 'DATA-LAYER-REFERENCE.md'];
const kb = n => Math.round(n / 1024) + ' KB';
console.log('\nSource package built:');
for (const f of FILES) console.log('  ' + f.padEnd(26) + kb(readFileSync(resolve(bundle, f)).length));

try {
  execSync('zip -qr smartmatch-roi-calculator-source.zip smartmatch-roi-calculator', { cwd: out });
  console.log('\nZipped: package-source/smartmatch-roi-calculator-source.zip');
} catch (e) {
  console.log('\n`zip` not available: folder ready at package-source/smartmatch-roi-calculator/');
}
