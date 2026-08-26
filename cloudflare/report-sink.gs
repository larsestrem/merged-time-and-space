var SHEET_ID = "19BOsDyCdKS-3F9LaNTybmnzokQiDbzyFU9iy3cBOSy0";
var NOTIFY   = "larsestrem@gmail.com";

function doGet() {
  var sheetOk = false, mailOk = false, err = "";
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Received", "Reason / type", "Reported URL", "Details", "Reporter email", "IP"]);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([new Date(), "HEALTH CHECK", "(opened /exec in browser)", "If you can read this row, the Sheet works.", "", ""]);
    sheetOk = true;
    MailApp.sendEmail(NOTIFY, "✅ Alarm-clock report-sink health check",
      "The report webhook is deployed and can write to the Sheet and send email.");
    mailOk = true;
  } catch (e2) { err = String(e2); }
  return ContentService.createTextOutput(
    "report-sink OK\nsheet: " + (sheetOk ? "ok" : "FAILED") +
    "\nemail: " + (mailOk ? "ok (check your inbox)" : "FAILED") +
    (err ? "\nerror: " + err : "")
  ).setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    var r = JSON.parse(e.postData.contents || "{}");
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Received", "Reason / type", "Reported URL", "Details", "Reporter email", "IP"]);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      r.at ? new Date(r.at) : new Date(),
      r.reason || "", r.url || "", r.details || "", r.email || "", r.ip || ""
    ]);
    var subject = "🚩 Alarm-clock report: " + (r.reason || "report");
    var body =
      "Reason/type: " + (r.reason || "") + "\n" +
      "Reported URL: " + (r.url || "") + "\n" +
      "Details: " + (r.details || "") + "\n" +
      "Reporter email: " + (r.email || "(none)") + "\n" +
      "IP: " + (r.ip || "") + "\n" +
      "Received: " + (r.at || new Date().toISOString());
    MailApp.sendEmail(NOTIFY, subject, body);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
