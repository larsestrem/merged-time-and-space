#!/usr/bin/env node
/* fetch-tides.mjs — batch-fetch a rolling window of NOAA CO-OPS high/low tide
 * predictions for every station into seo/_data/tide-predictions.json, ONCE per
 * run. The site's (hourly) builds then read TODAY's hi/lo from this file
 * instead of calling NOAA per build — cutting NOAA requests from ~2,500/day to
 * ~100 per run of this job (run weekly). Tide predictions are fixed astronomy,
 * so a ~45-day window stays valid between runs; each build just slices out its
 * own station-local "today".
 *
 * NOAA acceptable-use honoured (see their API guidelines): ONE request per
 * station (the hi/lo product allows up to a year per request), a sleep between
 * calls to avoid tripping the per-IP throttle under load, application=
 * identification, and retries with backoff on 429/5xx. On failure for a station
 * the previous data is kept (never wiped), so a bad run degrades to "slightly
 * older predictions", never to blanks.
 *
 *   node seo/tools/fetch-tides.mjs
 * Run by .github/workflows/fetch-tides.yml (weekly); commits the JSON if changed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TIDE_STATIONS } from "./tide-stations.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const OUT = join(root, "seo/_data/tide-predictions.json");

const WINDOW_DAYS = 45;   // buffer well past the weekly refresh cadence
const SLEEP_MS = 200;     // space out calls (NOAA recommends throttling)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ymd = (d) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;

async function fetchWindow(id) {
  /* start a day early so every station's local "today" is covered regardless
   * of its UTC offset at the moment this runs */
  const begin = ymd(new Date(Date.now() - 86400000));
  const end = ymd(new Date(Date.now() + WINDOW_DAYS * 86400000));
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?application=timeandspace.science&datum=MLLW&time_zone=lst_ldt&units=english&format=json&product=predictions&interval=hilo&station=${id}&begin_date=${begin}&end_date=${end}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (r.status === 429 || r.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
      if (!r.ok) return null;
      const d = await r.json();
      if (!d || !Array.isArray(d.predictions) || !d.predictions.length) return null;
      return d.predictions.map((p) => ({ t: p.t, v: +p.v, hi: p.type === "H" }));
    } catch (e) { await sleep(1000 * (attempt + 1)); }
  }
  return null;
}

let prev = {};
try { prev = JSON.parse(readFileSync(OUT, "utf8")).stations || {}; } catch (e) { /* first run */ }

const stations = { ...prev };
let ok = 0, tried = 0;
const seen = new Set();
for (const s of TIDE_STATIONS) {
  if (seen.has(s.id)) continue;
  seen.add(s.id); tried++;
  const ev = await fetchWindow(s.id);
  if (ev && ev.length) { stations[s.id] = ev; ok++; }   // else keep prior data for this station
  await sleep(SLEEP_MS);
}

/* A run in which ZERO stations refreshed is not "NOAA was flaky", it is "the
 * API contract changed, or this IP is blocked" — and it must not exit 0 while
 * rewriting generatedUtc to look fresh. Per-station tolerance is right; total
 * failure is the case where the 45-day window silently ages toward exhaustion
 * and the baked tables on ~140 pages eventually vanish with a green workflow. */
if (tried && ok === 0) {
  console.error(`✗ fetch-tides: 0/${tried} stations refreshed — NOAA unreachable or the API changed. Prior data left untouched.`);
  process.exit(1);
}

/* The 7-day table needs a week of runway. If the OLDEST station window no
 * longer reaches a week out, the window is running out even though this run
 * "succeeded" for some stations — say so while there is still time to act.
 * NOAA stamps are station-local ("YYYY-MM-DD HH:MM"); the date part alone is
 * all this needs, and a day of slack covers every offset. */
const NEED_MS = Date.now() + 7 * 86400000;
const lastOf = (ev) => (ev && ev.length ? Date.parse(ev[ev.length - 1].t.slice(0, 10) + "T23:59:59Z") : 0);
const short = Object.entries(stations).filter(([, ev]) => lastOf(ev) < NEED_MS).map(([id]) => id);

const out = { generatedUtc: new Date().toISOString(), windowDays: WINDOW_DAYS, stationCount: Object.keys(stations).length, stations };
writeFileSync(OUT, JSON.stringify(out));
console.log(`fetch-tides: ${ok}/${tried} stations refreshed, ${Object.keys(stations).length} total in ${OUT}.`);
if (short.length) {
  console.error(`✗ fetch-tides: ${short.length} station window(s) no longer cover today + 7 days (${short.slice(0, 10).join(", ")}${short.length > 10 ? ", …" : ""}) — their 7-day tables will run short.`);
  process.exit(1);
}
/* Otherwise a partial failure is fine: prior data is kept for those stations. */
