/* Builds the client-shareable embed package (flat, three files):
     package/smartmatch-roi-web-embed/
       smartmatch-roi-calculator.html <- the whole app, one self-contained file
       embed-snippet.html             <- host-page iframe snippet (WordPress Custom HTML block)
       README.html                    <- plain-English install instructions
   and zips it to package/smartmatch-roi-web-embed.zip when `zip` is available.
   Run via: npm run package                                                   */
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'package');
const bundle = resolve(out, 'smartmatch-roi-web-embed');

if (!existsSync(resolve(root, 'dist-single/index.html'))) {
  console.error('dist-single/ not found: run `npm run build:single` first (or use `npm run package`).');
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(bundle, { recursive: true });
// The client bundle is FLAT: the calculator is one self-contained HTML file
// (JS, CSS, fonts, logo and the PDF libraries all inlined) sitting alongside
// the snippet and the guide - no folders, nothing to keep together. The
// multi-file build in dist/ remains what the Vercel deployment serves.
cpSync(resolve(root, 'dist-single/index.html'), resolve(bundle, 'smartmatch-roi-calculator.html'));
// Point the snippet's placeholder at the packaged filename.
writeFileSync(resolve(bundle, 'embed-snippet.html'),
  readFileSync(resolve(root, 'embed-snippet.html'), 'utf8')
    .replaceAll('https://YOUR-DOMAIN/smartmatch-roi/index.html', 'https://YOUR-DOMAIN/smartmatch-roi-calculator.html')
    .replaceAll('https://YOUR-DOMAIN/smartmatch-roi/', 'https://YOUR-DOMAIN/'));

const readme = `<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><title>Smart Match ROI Calculator: install guide</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:3rem auto;padding:0 1.5rem;line-height:1.65;color:#16323A}code,pre{background:#F0F4F5;border-radius:6px;padding:2px 6px;font-size:.92em}pre{padding:12px 16px;overflow-x:auto}h1{color:#0F4146}h2{color:#0F4146;margin-top:2rem}li{margin-bottom:.4rem}</style></head><body>
<h1>Smart Match ROI Calculator: embed package</h1>
<p>This package contains the RLDatix <strong>Smart Match</strong> (BankStaff+) workforce ROI calculator as a self-contained web app, ready to embed in your website via an iframe. It runs entirely in the visitor's browser, with no server code, database or build step required.</p>
<h2>1. Host the calculator</h2>
<ol>
<li>Upload the single file <code>smartmatch-roi-calculator.html</code> to your web hosting (any static hosting works: your WordPress server, S3/CloudFront, or a CDN…). It is fully self-contained: there are no other assets to upload. Example final URL: <code>https://your-domain.com/smartmatch-roi-calculator.html</code>.</li>
<li>Serve it over <strong>HTTPS</strong>. No other server configuration is needed; all asset paths are relative.</li>
<li><strong>Framing must be allowed:</strong> the calculator's hosting must not send an <code>X-Frame-Options</code> header (or a <code>Content-Security-Policy frame-ancestors</code>) that blocks your page from embedding it. If you host the calculator file on the <em>same domain</em> as the page, the common <code>X-Frame-Options: SAMEORIGIN</code> default (added by many security plugins) is fine; if you host it on a <em>different</em> domain or subdomain, make sure no such header is applied to this file.</li>
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
<li><strong>Lead capture (HubSpot):</strong> the optional form on the results page submits to RLDatix's HubSpot (EU data centre) via a single JSON POST to <code>https://forms-eu1.hsforms.com</code> (HubSpot Forms API v3). If your page's Content-Security-Policy restricts <code>connect-src</code> inside iframes, allow that host. No HubSpot tracking script, cookies or pixels are loaded; it is one outbound request, made only when a visitor presses the download button.</li>
<li><strong>What is sent:</strong> the visitor's name, email, organisation and job title as entered in the form, plus a summary line of their calculator inputs and results (bank size, fill rate, team size, confidence level, estimated spend, modelled saving and hours). Nothing is sent before the visitor submits the form; consent wording is included in the submission.</li>
<li><strong>HubSpot form ID:</strong> submissions post to RLDatix HubSpot portal <code>27174408</code>, form GUID <code>3f860858-5a58-4f1b-8419-a561af17adbe</code> (EU data centre). This is currently an <em>interim, shared</em> form also used by another RLDatix calculator; Smart Match submissions are identifiable there by the "Smart Match ROI (web)" summary line in the message field. When a dedicated Smart Match form is created, RLDatix will supply an updated calculator file with the new form ID; the ID is baked into the calculator file and is not something to edit in this package.</li>
<li><strong>If HubSpot is unreachable</strong> (blocked network, CSP, ad-blocker): the submission fails silently, the visitor still gets their PDF, and the lead is kept in the local browser backup below, and nothing on your page breaks.</li>
<li><strong>Local lead backup:</strong> submissions are also stored in the visitor's browser only, as a resilience backup; appending <code>#admin-leads</code> to the calculator URL shows the records saved in that browser.</li>
<li><strong>Figures:</strong> all outputs are indicative, conservative and clearly labelled as such in the UI and the PDF.</li>
</ul>
</body></html>`;
writeFileSync(resolve(bundle, 'README.html'), readme);

try {
  execSync('zip -qr smartmatch-roi-web-embed.zip smartmatch-roi-web-embed', { cwd: out });
  console.log('Package ready: package/smartmatch-roi-web-embed.zip');
} catch (e) {
  console.log('`zip` not available: folder ready at package/smartmatch-roi-web-embed/ (zip it to share).');
}
