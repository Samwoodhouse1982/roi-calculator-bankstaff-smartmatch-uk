/* Generates embed-snippet-srcdoc.html: the client dev team's own working embed
   pattern, with the current calculator build inlined.

   Their page carries the whole calculator as a base64 string and hands it to an
   iframe's `srcdoc`, rather than hosting roi-calculator.html and pointing `src`
   at it. That works, so this script reproduces their wrapper byte for byte and
   only swaps the payload, which means every fix reaches them by re-pasting one
   file instead of re-deriving the wrapper by hand.

   Run as part of `npm run package:source`, after roi-calculator.html is built.
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = resolve(root, 'package-source/smartmatch-roi-calculator');

/* The calculator is read as bytes, so the base64 carries UTF-8. The page decodes
   it with decodeURIComponent(escape(atob(...))), which turns the latin1 string
   atob() returns back into UTF-8: without that the pound signs, multiplication
   signs and box-drawing characters in the file come out mangled. */
const b64 = readFileSync(resolve(bundle, 'roi-calculator.html')).toString('base64');

const snippet = `<!-- ═══════════════════════════════════════════════════════════════
     Smart Match ROI Calculator - inline (srcdoc) embed
     ═══════════════════════════════════════════════════════════════

     GENERATED FILE - do not edit by hand. Rebuilt from the calculator by
     scripts/build-embed-snippet-srcdoc.mjs (npm run package:source).

     Paste the whole of this file into a WordPress Custom HTML block. The
     calculator itself is carried in the DATA string below, so there is no
     separate file to upload and nothing else to configure.

     To take a new version of the calculator, replace this file wholesale.
     Do not hand-edit the DATA string.

     Prefer hosting roi-calculator.html and pointing an iframe's src at it
     where you can (see embed-snippet.html): it is a one-file swap to update,
     and the calculator then has a real URL to cache and link to. This inline
     version exists because it needs no file upload at all.
     ═══════════════════════════════════════════════════════════════ -->

<div id="smroi-wrap" style="width:100%;">
  <iframe id="smroi-frame" style="width:100%;border:0;min-height:1000px;display:block;" title="Smart Match ROI Calculator"></iframe>
</div>
<script>
(function () {
  var DATA = "${b64}";
  var frame = document.getElementById("smroi-frame");
  try {
    frame.srcdoc = decodeURIComponent(escape(window.atob(DATA)));
  } catch (e) {
    frame.srcdoc = window.atob(DATA);
  }
  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (d && d.type === "smartmatch-roi-resize" && d.height) {
      frame.style.height = d.height + "px";
    }
  });
})();
</script>

<!-- ═══════════════════════════════════════════════════════════════
     OPTIONAL EXTRAS

     The calculator posts two more messages the listener above ignores.
     Add either inside the same listener if you want them.

     1. Scroll back to the top of the calculator when a visitor changes
        step or presses "Start over". Without this they can be left
        looking at the middle of a page that has just changed under them,
        because the iframe cannot scroll the page itself.

          if (d && d.type === "smartmatch-roi-scroll-top") {
            frame.scrollIntoView({ behavior: "smooth", block: "start" });
          }

     2. Data layer: every figure the visitor is looking at, on every
        change, for GTM or your own analytics. Full field list in
        DATA-LAYER-REFERENCE.md.

          if (d && d.type === "smartmatch-roi-data") {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: "roi_update", roi: d.data });
          }

     Do NOT add a sandbox attribute to the iframe. Without
     allow-same-origin it blocks the HubSpot lead submission and the PDF
     download while the calculator still looks like it worked, so leads
     are lost with no visible error.
     ═══════════════════════════════════════════════════════════════ -->
`;

writeFileSync(resolve(bundle, 'embed-snippet-srcdoc.html'), snippet);
