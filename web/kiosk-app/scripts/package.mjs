/* Builds the client-shareable embed package:
     package/smartmatch-roi-web-embed/
       calculator/        <- the built app (host this folder)
       embed-snippet.html <- host-page iframe snippet (WordPress Custom HTML block)
       README.html        <- plain-English install instructions
   and zips it to package/smartmatch-roi-web-embed.zip when `zip` is available.
   Run via: npm run package                                                   */
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'package');
const bundle = resolve(out, 'smartmatch-roi-web-embed');

if (!existsSync(resolve(root, 'dist/index.html'))) {
  console.error('dist/ not found — run `npm run build` first (or use `npm run package`).');
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(bundle, { recursive: true });
cpSync(resolve(root, 'dist'), resolve(bundle, 'calculator'), { recursive: true });
cpSync(resolve(root, 'embed-snippet.html'), resolve(bundle, 'embed-snippet.html'));

const readme = `<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><title>Smart Match ROI Calculator — install guide</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:3rem auto;padding:0 1.5rem;line-height:1.65;color:#16323A}code,pre{background:#F0F4F5;border-radius:6px;padding:2px 6px;font-size:.92em}pre{padding:12px 16px;overflow-x:auto}h1{color:#0F4146}h2{color:#0F4146;margin-top:2rem}li{margin-bottom:.4rem}</style></head><body>
<h1>Smart Match ROI Calculator — embed package</h1>
<p>This package contains the RLDatix <strong>Smart Match</strong> (BankStaff+) workforce ROI calculator as a self-contained web app, ready to embed in your website via an iframe. It runs entirely in the visitor's browser — no server code, database or build step required.</p>
<h2>1. Host the calculator</h2>
<ol>
<li>Upload the <code>calculator/</code> folder to your web hosting (any static hosting works: your WordPress server, S3/CloudFront, or a CDN…). Example final URL: <code>https://your-domain.com/smartmatch-roi/index.html</code>.</li>
<li>Serve it over <strong>HTTPS</strong>. No other server configuration is needed — all asset paths are relative.</li>
</ol>
<h2>2. Embed it in your page</h2>
<ol>
<li>Open <code>embed-snippet.html</code> in a text editor and copy everything from the <code>&lt;iframe&gt;</code> to the end of the <code>&lt;script&gt;</code> block.</li>
<li>Replace <code>https://YOUR-DOMAIN/smartmatch-roi/index.html</code> with the URL from step 1 (both in the iframe <code>src</code> and, if you enable it, the origin check).</li>
<li>In WordPress, add a <strong>Custom HTML</strong> block to the page and paste the snippet in.</li>
</ol>
<p>The iframe resizes itself to the calculator's content (no inner scrollbar) and scrolls the page back to the top of the calculator when a visitor moves between steps. It is fully responsive, from phones to desktop.</p>
<h2>Notes</h2>
<ul>
<li><strong>Lead capture:</strong> the optional form on the results page submits to RLDatix's HubSpot (EU data centre) and downloads a PDF summary for the visitor. If your page's Content-Security-Policy restricts <code>connect-src</code> inside iframes, allow <code>https://forms-eu1.hsforms.com</code>.</li>
<li><strong>Local lead backup:</strong> submissions are also stored in the visitor's browser only, as a resilience backup; appending <code>#admin-leads</code> to the calculator URL shows the records saved in that browser.</li>
<li><strong>Figures:</strong> all outputs are indicative, conservative and clearly labelled as such in the UI and the PDF.</li>
</ul>
</body></html>`;
writeFileSync(resolve(bundle, 'README.html'), readme);

try {
  execSync('zip -qr smartmatch-roi-web-embed.zip smartmatch-roi-web-embed', { cwd: out });
  console.log('Package ready: package/smartmatch-roi-web-embed.zip');
} catch (e) {
  console.log('`zip` not available — folder ready at package/smartmatch-roi-web-embed/ (zip it to share).');
}
