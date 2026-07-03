/* ────────────────────────────────────────────────────────────────────────
   Optional shared-backend sync for kiosk stats.

   No-op unless VITE_STATS_ENDPOINT is set at build time, so local-only builds
   are completely unaffected. Each completed session is buffered in localStorage
   (the same store the local stats use) and POSTed to the endpoint; any row that
   fails to send stays flagged and retries on the next completion or app load, so
   a network blip never loses data.

   Transport note: Google Apps Script web apps can't answer a CORS preflight, so
   we send as a "simple" request (text/plain body, no custom headers) in no-cors
   mode. The response is opaque — we can't read it — so a row is marked synced
   once the request has left the device; the server dedupes by `id` if a retry
   overlaps a send that actually succeeded.
   ──────────────────────────────────────────────────────────────────────── */

const ENDPOINT = import.meta.env.VITE_STATS_ENDPOINT || '';
const WRITE_KEY = import.meta.env.VITE_STATS_KEY || '';
const KIOSK_ID = import.meta.env.VITE_KIOSK_ID || 'kiosk';

export const syncEnabled = !!ENDPOINT;

// Stable unique id per session, so the server can dedupe overlapping retries.
export function newId() {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* ignore */ }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

let flushing = false;

// Push any not-yet-synced sessions to the shared endpoint. `store` is the parsed
// stats object; `persist(store)` writes it back. Marks rows synced on success.
// Fire-and-forget: callers don't await it.
export async function flushSync(store, persist) {
  if (!ENDPOINT || flushing || !store || !Array.isArray(store.sessions)) return;
  const pending = store.sessions.filter(s => s && s.id && s.synced !== true);
  if (!pending.length) return;
  flushing = true;
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',                                            // opaque response; avoids the CORS preflight Apps Script can't answer
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },    // safelisted content-type -> "simple" request
      body: JSON.stringify({ key: WRITE_KEY, kioskId: KIOSK_ID, sessions: pending }),
    });
    // Request left the device — mark these rows synced. (Server dedupes by id.)
    const ids = new Set(pending.map(s => s.id));
    for (const s of store.sessions) if (ids.has(s.id)) s.synced = true;
    if (typeof persist === 'function') persist(store);
  } catch (e) {
    // Network unreachable — leave rows unsynced so they retry next time.
  } finally {
    flushing = false;
  }
}
