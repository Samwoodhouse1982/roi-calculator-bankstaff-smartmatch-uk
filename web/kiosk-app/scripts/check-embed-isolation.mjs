/* Proves the inline embed snippet cannot affect the page it is pasted into.

   Context: the calculator's FIRST deployment inlined its stylesheet straight
   into the client's page, where its global rules (body background, scrollbar
   and form-control styling) leaked into the site chrome. The srcdoc embed was
   built to make that impossible; this script is the proof, so a regression
   can never ship silently.

   It loads the same mock site page twice, once bare and once with the whole
   of embed-snippet-inline.txt pasted in, drives the calculator through the
   full flow (HubSpot widget included, stubbed), and then asserts the page is
   indistinguishable from the bare one:

     1. identical computed styles on the site's header, nav links, body and
        footer (background, colour, font, position),
     2. no stylesheets added to the page document,
     3. no new window globals,
     4. every element the snippet created is inside its own wrapper div.

   Run with:  npm run check:isolation   (after npm run package:source)
   Requires Playwright with Chromium; falls back to the machine-wide install
   when the package is not a local dependency. */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')
    .catch(() => { throw new Error('Playwright not found: npm i -D playwright, or install it globally.'); }));
}

const snippet = readFileSync(resolve(root, 'package-source/embed-snippet-inline.txt'), 'utf8');

/* A mock of the client's site: transparent-over-teal sticky header (the part
   the embed was once accused of recolouring), global element styles of the
   kind themes rely on, content, footer. */
const SITE_CSS = `
  body { margin: 0; background: #ffffff; font-family: Georgia, serif; color: #222222; }
  header.site { position: sticky; top: 0; background: #DDF0EA; border-bottom: 1px solid #BFD9D2; padding: 14px 24px; z-index: 10; }
  header.site a { color: #0A3A40; text-decoration: none; margin-right: 18px; font-weight: 600; }
  h1 { color: #0A3A40; font-size: 2rem; }
  input, button { font-family: inherit; }
  footer.site { background: #0A3A40; color: #ffffff; padding: 24px; margin-top: 40px; }
`;
const page_html = embed => `<!doctype html><html><head><meta charset="utf-8"><style>${SITE_CSS}</style></head>
<body>
  <header class="site" id="site-nav"><a href="#" id="nav-link">Solutions</a><a href="#">Company</a><a href="#">Resources</a></header>
  <main><h1 id="site-h1">Smart Match ROI Calculator</h1><p id="site-p">Intro copy.</p>${embed}</main>
  <footer class="site" id="site-footer">Footer</footer>
</body></html>`;

const RAW_FORM = `<form class="hs-form" novalidate>
  <fieldset class="form-columns-1"><div class="hs-form-field hs_message"><div class="input"><input class="hs-input" type="hidden" name="message" value=""></div></div></fieldset>
  <fieldset class="form-columns-2">
    <div class="hs-form-field"><label>First name</label><div class="input"><input class="hs-input" type="text" name="firstname"></div></div>
    <div class="hs-form-field"><label>Last name</label><div class="input"><input class="hs-input" type="text" name="lastname"></div></div>
  </fieldset>
  <div class="hs_submit"><input type="submit" class="hs-button" value="Submit"></div>
</form>`;
const HS_STUB = `window.hbspt={forms:{create:function(o){var t=typeof o.target==="string"?document.querySelector(o.target):o.target;t.innerHTML=${JSON.stringify(RAW_FORM)};if(o.onFormReady)setTimeout(o.onFormReady,50);}}};`;

const PAGE_URL = 'https://client-site.example/calculator/';

/* Everything about the page another stylesheet or script could change. */
const SNAPSHOT = `(() => {
  const pick = (el, props) => { const cs = getComputedStyle(el); const o = {}; for (const p of props) o[p] = cs[p]; return o; };
  const P = ['backgroundColor', 'color', 'fontFamily', 'fontSize', 'fontWeight', 'position', 'borderBottomColor', 'padding', 'margin'];
  return {
    nav: pick(document.getElementById('site-nav'), P),
    navLink: pick(document.getElementById('nav-link'), P),
    body: pick(document.body, P),
    h1: pick(document.getElementById('site-h1'), P),
    footer: pick(document.getElementById('site-footer'), P),
    sheets: document.styleSheets.length,
    // Numeric keys are the browser's own indexed WindowProxy handles, one per
    // iframe on the page (window[0]), not variables anything defined.
    globals: Object.getOwnPropertyNames(window).filter(k => !/^\\d+$/.test(k) && !/^(webkit|on|chrome|closed|crypto)/.test(k)).sort(),
  };
})()`;

const browser = await chromium.launch();
const run = async embed => {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url === PAGE_URL) return route.fulfill({ contentType: 'text/html', body: page_html(embed) });
    if (url.includes('hsforms.net/forms/embed')) return route.fulfill({ contentType: 'application/javascript', body: HS_STUB });
    return route.fulfill({ status: 204, body: '' });
  });
  await page.goto(PAGE_URL);
  return page;
};

// Control: the page with no embed at all.
const control = await run('');
const before = await control.evaluate(SNAPSHOT);
await control.close();

// The page with the snippet pasted in, driven through the whole calculator.
const page = await run(snippet);
const frame = page.frameLocator('#smroi-frame');
await frame.getByRole('button', { name: /Get started/ }).click();
for (let i = 0; i < 2; i++) await frame.getByRole('button', { name: 'Next →' }).click();
await frame.getByRole('radio', { name: 'Yes, add it' }).click();
await frame.getByRole('button', { name: 'Next →' }).click();
await frame.getByRole('button', { name: /Calculate ROI/ }).click();
await frame.locator('#smartmatch-hs-form form.hs-form').waitFor({ state: 'visible', timeout: 15000 });
await page.waitForTimeout(2000);   // let the widget styling and resize passes settle
const after = await page.evaluate(SNAPSHOT);

const failures = [];
for (const key of ['nav', 'navLink', 'body', 'h1', 'footer']) {
  for (const [prop, val] of Object.entries(before[key])) {
    if (after[key][prop] !== val) failures.push(`${key}.${prop}: "${val}" -> "${after[key][prop]}"`);
  }
}
if (after.sheets !== before.sheets) failures.push(`page stylesheets: ${before.sheets} -> ${after.sheets}`);
const newGlobals = after.globals.filter(k => !before.globals.includes(k));
if (newGlobals.length) failures.push(`new window globals: ${newGlobals.join(', ')}`);

// Every element the snippet created must live inside its own wrapper.
const strays = await page.evaluate(() => {
  const allowed = new Set(['site-nav', 'nav-link', 'site-h1', 'site-p', 'site-footer']);
  return [...document.querySelectorAll('body [id]')]
    .filter(el => !allowed.has(el.id) && !el.closest('#smroi-wrap'))
    .map(el => el.tagName + '#' + el.id);
});
if (strays.length) failures.push(`elements outside #smroi-wrap: ${strays.join(', ')}`);

await browser.close();

if (failures.length) {
  console.error('EMBED ISOLATION FAILED:\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log('Embed isolation verified: with the calculator pasted in and run end to end,');
console.log('the host page\'s header, nav links, body, headings and footer are computed-style');
console.log(`identical to a page without it; ${before.sheets} stylesheet(s) before and after; no new`);
console.log('window globals; every created element is inside #smroi-wrap.');
