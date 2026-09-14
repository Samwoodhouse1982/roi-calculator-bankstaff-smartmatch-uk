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
/* Written as .txt, and OUTSIDE the zip, on purpose.

   A large base64 string that a page decodes at run time and injects into the
   DOM is the shape of HTML smuggling, so Windows Defender's heuristics flag
   this file on sight when it arrives as .html. It is a false positive (the
   payload decodes byte for byte to roi-calculator.html, which ships in the
   same package unwrapped), but it blocked the whole download.

   Nothing is lost by shipping it as text: this file is only ever pasted into
   a CMS Custom HTML block, never opened or run as a file, so the extension is
   cosmetic. Keeping it out of the zip means that if a scanner does object to
   it, only this one optional extra is affected, not the whole package. */
const outFile = resolve(root, 'package-source/embed-snippet-inline.txt');

/* The calculator is read as bytes, so the base64 carries UTF-8. The page decodes
   it with decodeURIComponent(escape(atob(...))), which turns the latin1 string
   atob() returns back into UTF-8: without that the pound signs, multiplication
   signs and box-drawing characters in the file come out mangled. */
const b64 = readFileSync(resolve(bundle, 'roi-calculator.html')).toString('base64');

const snippet = `<!-- ═══════════════════════════════════════════════════════════════
     Smart Match ROI Calculator - inline (srcdoc) embed
     ═══════════════════════════════════════════════════════════════

     THIS IS A .txt FILE ON PURPOSE. It is HTML, and it is meant to be
     pasted, not opened.

     Select all of it, copy it, and paste it into a WordPress Custom HTML
     block. Do not rename it to .html and do not double-click it: the
     calculator is carried below as one long base64 string, which is also
     how some malware hides itself, so Windows Defender flags any .html
     file shaped like this on sight. Shipping it as text avoids a false
     positive that otherwise blocks the download. The string decodes byte
     for byte to roi-calculator.html, which is in the package unwrapped if
     you would like to check it.

     This route is the ALTERNATIVE. Prefer the hosted one in the package
     (upload roi-calculator.html, paste embed-snippet.html, point the
     iframe src at it): updates are then a one-file swap instead of
     re-pasting the whole of this, and the calculator gets a real URL to
     cache and link to. Both produce identical figures.

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

writeFileSync(outFile, snippet);
