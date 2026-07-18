// JSX parse check for roi-calculator.html (audit reliability item).
//
// The engine tests exercise only the pure-JS block before the components, so a
// JSX syntax error further down the <script type="text/babel"> block would ship
// silently and blank the whole calculator. This test transforms the ENTIRE babel
// block with @babel/standalone (classic runtime, matching the pinned in-browser
// build) and syntax-checks the output.
//
// The repo stays dependency-free, so Babel is sourced at test time, in order:
//   1. $BABEL_STANDALONE_PATH  - a local babel.min.js (offline/CI cache)
//   2. ./vendor/babel.min.js   - optional checked-in copy next to this file
//   3. the same CDN the page itself uses (cdnjs, pinned 7.26.4)
// If none is reachable (fully offline), the test SKIPS with a warning rather
// than failing - run it somewhere with network before releasing.

import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.4/babel.min.js';

async function loadBabelSource() {
  const local = process.env.BABEL_STANDALONE_PATH;
  if (local && existsSync(local)) return readFileSync(local, 'utf8');
  const vendored = fileURLToPath(new URL('./vendor/babel.min.js', import.meta.url));
  if (existsSync(vendored)) return readFileSync(vendored, 'utf8');
  try {
    const res = await fetch(CDN, { signal: AbortSignal.timeout(20000) });
    if (res.ok) return await res.text();
  } catch { /* offline */ }
  return null;
}

test('the full text/babel block parses as JSX (classic runtime)', async (t) => {
  const src = await loadBabelSource();
  if (!src) return t.skip('no Babel available (offline and nothing vendored) - run with network or set BABEL_STANDALONE_PATH');

  // babel-standalone is UMD and attaches to whatever global it finds; capture it
  // from the function scope or globalThis, whichever it landed on.
  const Babel = new Function(src + '\nreturn (typeof Babel!=="undefined" ? Babel : globalThis.Babel);')();
  if (!Babel) return t.skip('babel.min.js loaded but did not expose Babel');

  const html = readFileSync(new URL('../roi-calculator.html', import.meta.url), 'utf8');
  const body = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
  const { code } = Babel.transform(body, { presets: [['react', { runtime: 'classic' }]] });
  // Constructing (not calling) the function is a pure syntax check of the output.
  new Function(code); // throws on a syntax error
});
