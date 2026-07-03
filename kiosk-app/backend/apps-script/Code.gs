/**
 * Smart Match kiosk stats — shared backend (Google Apps Script web app).
 *
 * Receives completed-session rows POSTed by one or more kiosks and appends them
 * to a Google Sheet, which doubles as the combined cross-kiosk dashboard.
 *
 * The script owns its own Sheet: on the first request it creates a spreadsheet
 * named "Smart Match Kiosk Stats" in your Drive and remembers its id. Open that
 * sheet any time to see every session and the live combined dashboard.
 *
 * Setup: see README.md (paste this in at script.google.com, set the WRITE_KEY
 * script property, deploy as a web app, copy the /exec URL into the kiosk build).
 */

var SHEET_NAME = 'Sessions';
var HEADERS = ['id', 'ts', 'kioskId', 'flow', 'netSaving', 'agencySaving', 'adminSaving',
  'grossBenefit', 'displaced', 'timeSavedWeek', 'capacityValue', 'roiMultiple', 'paybackMonths',
  'agencySpend', 'platformCost', 'bankPool', 'agencyFillRate', 'numManagers', 'displacement',
  'includeAdmin', 'stance'];

function prop(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function setProp(k, v) { PropertiesService.getScriptProperties().setProperty(k, v); }

function getSpreadsheet() {
  var id = prop('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { /* recreate below */ } }
  var ss = SpreadsheetApp.create('Smart Match Kiosk Stats');
  setProp('SHEET_ID', ss.getId());
  var sh = ss.getSheets()[0];
  sh.setName(SHEET_NAME);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sh.setFrozenRows(1);
  buildDashboard(ss);
  return ss;
}

function getSessionsSheet(ss) {
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** A read-only summary tab of live formulas over the Sessions sheet. */
function buildDashboard(ss) {
  var d = ss.getSheetByName('Dashboard') || ss.insertSheet('Dashboard', 0);
  d.clear();
  var rows = [
    ['Smart Match — combined kiosk stats', ''],
    ['(live across every kiosk reporting to this sheet)', ''],
    ['', ''],
    ['Sessions (all time)', '=COUNTA(Sessions!A2:A)'],
    ['Sessions (last 24h)', '=COUNTIF(Sessions!B2:B, ">="&(NOW()-1))'],
    ['', ''],
    ['Avg net cash saving', '=IFERROR(ROUND(AVERAGE(Sessions!E2:E)),0)'],
    ['Avg agency premium saving', '=IFERROR(ROUND(AVERAGE(Sessions!F2:F)),0)'],
    ['Avg ROI multiple', '=IFERROR(ROUND(AVERAGE(Sessions!L2:L),2),0)'],
    ['Avg payback (days)', '=IFERROR(ROUND(AVERAGE(Sessions!M2:M)*365/12),0)'],
    ['Avg bank workforce', '=IFERROR(ROUND(AVERAGE(Sessions!P2:P)),0)'],
    ['Avg agency fill entered (%)', '=IFERROR(ROUND(AVERAGE(Sessions!Q2:Q),1),0)'],
    ['Avg confidence level (%)', '=IFERROR(ROUND(AVERAGE(Sessions!S2:S),1),0)'],
    ['Avg temp-staffing team', '=IFERROR(ROUND(AVERAGE(Sessions!R2:R),1),0)'],
    ['% including admin time', '=IFERROR(ROUND(100*COUNTIF(Sessions!T2:T,TRUE)/COUNTA(Sessions!T2:T)),0)'],
    ['', ''],
    ['Cumulative net cash saving', '=IFERROR(ROUND(SUM(Sessions!E2:E)),0)'],
    ['Cumulative agency premium saving', '=IFERROR(ROUND(SUM(Sessions!F2:F)),0)'],
    ['Cumulative temp duties displaced', '=IFERROR(ROUND(SUM(Sessions!I2:I)),0)'],
  ];
  d.getRange(1, 1, rows.length, 2).setValues(rows);
  d.getRange(1, 1).setFontSize(16).setFontWeight('bold');
  d.setColumnWidth(1, 280);
  d.setColumnWidth(2, 180);
  // Breakdown blocks (wrapped in IFERROR so an empty sheet shows "—" not an error).
  d.getRange('D1').setValue('By kiosk').setFontWeight('bold');
  d.getRange('D2').setFormula(
    '=IFERROR(QUERY(Sessions!C2:E, "select C, count(E), avg(E) group by C label count(E) \'sessions\', avg(E) \'avg net\'"),"—")');
  d.getRange('H1').setValue('Confidence stance').setFontWeight('bold');
  d.getRange('H2').setFormula(
    '=IFERROR(QUERY(Sessions!U2:U, "select U, count(U) where U is not null group by U label count(U) \'count\'"),"—")');
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { return json({ ok: false, error: 'busy' }); }
  try {
    var body = {};
    try { body = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'bad json' }); }

    var expected = prop('WRITE_KEY');
    if (expected && body.key !== expected) return json({ ok: false, error: 'unauthorized' });

    var sessions = Array.isArray(body.sessions) ? body.sessions : (body.session ? [body.session] : []);
    if (!sessions.length) return json({ ok: true, added: 0 });

    var ss = getSpreadsheet();
    var sh = getSessionsSheet(ss);
    var lastRow = sh.getLastRow();

    // Dedupe by id against ids already stored (guards overlapping retries).
    var existing = {};
    if (lastRow > 1) {
      var ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var r = 0; r < ids.length; r++) existing[ids[r][0]] = 1;
    }

    var toAppend = [];
    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      if (!s || !s.id || existing[s.id]) continue;
      existing[s.id] = 1;
      toAppend.push(HEADERS.map(function (h) {
        if (h === 'ts') return s.ts ? new Date(s.ts) : new Date();
        if (h === 'kioskId') return body.kioskId || s.kioskId || '';
        var v = s[h];
        return (v === undefined || v === null) ? '' : v;
      }));
    }
    if (toAppend.length) sh.getRange(sh.getLastRow() + 1, 1, toAppend.length, HEADERS.length).setValues(toAppend);
    return json({ ok: true, added: toAppend.length });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  // Lightweight combined count as JSON (optional; the Sheet is the primary dashboard).
  try {
    var ss = getSpreadsheet();
    var sh = getSessionsSheet(ss);
    var n = Math.max(0, sh.getLastRow() - 1);
    return json({ ok: true, total: n, sheetUrl: ss.getUrl() });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
