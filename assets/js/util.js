/* util.js — shared helpers: timezone-correct instant math, URL params, hashing. */

(function (global) {
  "use strict";

  /* Offset (ms) between a given IANA timezone and UTC at a specific instant. */
  function tzOffset(tz, date) {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    const p = {};
    dtf.formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
    const asUTC = Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return asUTC - date.getTime();
  }

  /* Convert a wall-clock time *in tz* to a UTC timestamp (ms).
   * Two-pass to settle DST boundaries. */
  function wallTimeToUTC(y, mo, d, h, mi, tz) {
    const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
    let off = tzOffset(tz, new Date(guess));
    let utc = guess - off;
    const off2 = tzOffset(tz, new Date(utc));
    if (off2 !== off) utc = guess - off2;
    return utc;
  }

  /* date "YYYY-MM-DD" + time "HH:MM" + IANA tz -> target Date */
  function targetDate(dateStr, timeStr, tz) {
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
    const tm = /^(\d{1,2}):(\d{2})$/.exec(timeStr || "00:00");
    if (!dm) return null;
    const ms = wallTimeToUTC(+dm[1], +dm[2], +dm[3], tm ? +tm[1] : 0, tm ? +tm[2] : 0, tz || guessTz());
    return new Date(ms);
  }

  function guessTz() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
    catch (e) { return "UTC"; }
  }

  /* read query string into a plain object */
  function params() {
    const o = {}, q = new URLSearchParams(global.location.search);
    q.forEach(function (v, k) { o[k] = v; });
    return o;
  }

  /* small stable hash for a string -> short base36 id (for the view counter) */
  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /* compact integers like 1234 -> "1,234" */
  function commas(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  /* list of common timezones for the picker (label + IANA id) */
  const TIMEZONES = [
    "Pacific/Honolulu","America/Anchorage","America/Los_Angeles","America/Denver",
    "America/Chicago","America/New_York","America/Sao_Paulo","Atlantic/Reykjavik",
    "Europe/London","Europe/Paris","Europe/Berlin","Europe/Athens","Europe/Moscow",
    "Africa/Cairo","Asia/Dubai","Asia/Karachi","Asia/Kolkata","Asia/Bangkok",
    "Asia/Shanghai","Asia/Tokyo","Australia/Sydney","Pacific/Auckland","UTC"
  ];

  global.AC_UTIL = {
    tzOffset: tzOffset, wallTimeToUTC: wallTimeToUTC, targetDate: targetDate,
    guessTz: guessTz, params: params, hash: hash, commas: commas, TIMEZONES: TIMEZONES
  };
})(window);
