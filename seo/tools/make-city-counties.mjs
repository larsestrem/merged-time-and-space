#!/usr/bin/env node
/* make-city-counties.mjs — the county each /sun/ + /moon/ US city sits in.
 *
 * WHY THIS EXISTS. seo/_data/us-cities.json (census top-1000) carries no
 * county, and the /moon/state/ hubs list up to ~200 cities in one undifferen-
 * tiated blob. Grouping them by county needs real data: guessing which county
 * a city is in would put confidently-wrong facts on 51 public pages, so the
 * assignment comes from a dataset, is distance-verified, and anything that
 * cannot be resolved is left ungrouped rather than invented.
 *
 * SOURCE: github.com/kelvins/US-Cities-Database (CC0), which carries
 * STATE_CODE, CITY, COUNTY and coordinates for ~30k US places. Coordinates are
 * the point: a name match alone is not trusted, it must also land within 30
 * miles of the city we already have, which is what catches the two genuine
 * name collisions (La Quinta CA matched a namesake 141 miles away).
 *
 * MATCHING, in order of confidence:
 *   1. exact city+state, nearest candidate, within 30 mi
 *   2. normalised name (St./Saint, periods, "Lexington-Fayette" -> "Lexington")
 *   3. geographic fallback: the nearest dataset town in the SAME state within
 *      25 mi. Counties are contiguous and the dataset is dense, so the nearest
 *      town's county is reliable — and the distance cap keeps it honest.
 * Anything still unresolved is reported and omitted.
 *
 * Rerun only when the city list changes:
 *   curl -sS https://raw.githubusercontent.com/kelvins/US-Cities-Database/main/csv/us_cities.csv -o /tmp/uscounty.csv
 *   node seo/tools/make-city-counties.mjs /tmp/uscounty.csv
 * Writes seo/_data/city-counties.json (slug -> county). The build never fetches.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = process.argv[2];
if (!src) { console.error("usage: make-city-counties.mjs <us_cities.csv>"); process.exit(1); }

/* CSV reader that respects quoted fields ("Aleutians West" contains no comma,
 * but plenty of county names do) */
function rows(t) {
  const out = []; let f = [], c = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { f.push(c); c = ""; }
    else if (ch === "\n") { f.push(c); out.push(f); f = []; c = ""; }
    else if (ch !== "\r") c += ch;
  }
  if (c || f.length) { f.push(c); out.push(f); }
  return out;
}
const norm = (s) => s.toLowerCase().replace(/\./g, "").replace(/^st\s/, "saint ")
  .replace(/-(fayette|richmond county|salem|barre|.*)$/, "").trim();
const miles = (a, b, c, d) => {
  const R = 3958.8, t = Math.PI / 180, dLa = (c - a) * t, dLo = (d - b) * t;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

const r = rows(readFileSync(src, "utf8"));
const H = r[0].map((s) => s.trim());
const iSt = H.indexOf("STATE_CODE"), iCity = H.indexOf("CITY"), iCo = H.indexOf("COUNTY"),
  iLa = H.indexOf("LATITUDE"), iLo = H.indexOf("LONGITUDE");
const exact = new Map(), normed = new Map(), byState = new Map();
for (let i = 1; i < r.length; i++) {
  const d = r[i]; if (d.length < 5) continue;
  const st = (d[iSt] || "").trim(), city = (d[iCity] || "").trim();
  let county = (d[iCo] || "").trim(); if (!st || !city || !county) continue;
  /* the source is inconsistently cased ("Miami-dade") */
  county = county.replace(/^Saint\s/i, "St. ").replace(/[A-Za-z]+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .replace(/\bSt\.?\s/i, "St. ");
  /* Not every state has counties, and appending "County" blindly produced
     "Orleans County" (Louisiana has parishes) and "Anchorage County" (Alaska
     has boroughs, municipalities and census areas — too irregular to guess, so
     its names are left bare rather than mislabelled). Virginia and Maryland
     independent cities are not "X City County" either. */
  if (!/county|parish|borough|census area|municipality|city and|\bcity$/i.test(county)) {
    if (st === "LA") county += " Parish";
    else if (st !== "AK") county += " County";
  }
  const rec = { county, lat: +d[iLa], lon: +d[iLo] };
  const push = (m, k) => { if (!m.has(k)) m.set(k, []); m.get(k).push(rec); };
  push(exact, st + "|" + city.toLowerCase());
  push(normed, st + "|" + norm(city));
  push(byState, st);
}
/* Pick among candidates for the same city name. Nearest-wins alone is wrong
 * when a dataset carries several rows per city (ZIP centroids): our
 * Philadelphia sits 11 mi from a row tagged Delaware County and 19 mi from the
 * one tagged Philadelphia County, so distance alone chose the suburb. A city
 * that shares its name with a county almost always IS that county's seat
 * (Philadelphia, San Francisco, Denver, New York), so that wins first. */
const nearestIn = (list, lat, lon, cityName) => {
  let best = null, bd = Infinity;
  for (const x of list || []) { const d = miles(lat, lon, x.lat, x.lon); if (d < bd) { bd = d; best = x; } }
  if (cityName && list) {
    const want = cityName.toLowerCase();
    /* "X City" first: that form only exists for an INDEPENDENT city (Baltimore,
       St. Louis, and Virginia's 38), where the city is its own jurisdiction and
       is NOT part of the same-named surrounding county. Maryland has both a
       Baltimore City and a Baltimore County, and the city belongs to neither
       the other's rows — preferring "County" put the city in its suburb. */
    for (const pref of [want + " city", want]) {
      for (const x of list) {
        if (x.county.replace(/\s+(county|parish|borough)$/i, "").toLowerCase() === pref
            && miles(lat, lon, x.lat, x.lon) <= 30) return { best: x, d: miles(lat, lon, x.lat, x.lon) };
      }
    }
  }
  return { best, d: bd };
};

const { SUN_ALL } = await import("./build-sun.mjs");
const us = SUN_ALL.filter((c) => c.st);
const out = {}; const stats = { exact: 0, normed: 0, nearby: 0 }; const unresolved = [];
for (const c of us) {
  let hit = nearestIn(exact.get(c.st + "|" + c.city.toLowerCase()), c.lat, c.lon, c.city);
  let how = "exact";
  if (!hit.best || hit.d > 30) { hit = nearestIn(normed.get(c.st + "|" + norm(c.city)), c.lat, c.lon, c.city); how = "normed"; }
  if (!hit.best || hit.d > 30) { hit = nearestIn(byState.get(c.st), c.lat, c.lon); how = "nearby"; }
  if (hit.best && hit.d <= (how === "nearby" ? 25 : 30)) { out[c.slug] = hit.best.county; stats[how]++; }
  else unresolved.push(`${c.city}, ${c.st}`);
}
writeFileSync(join(root, "seo/_data/city-counties.json"), JSON.stringify(out, null, 0) + "\n");
console.log(`city-counties.json: ${Object.keys(out).length}/${us.length} resolved`);
console.log(`  exact name+state ${stats.exact} · normalised ${stats.normed} · nearest-in-state ${stats.nearby}`);
if (unresolved.length) console.log(`  UNRESOLVED (${unresolved.length}, left ungrouped): ${unresolved.join(" | ")}`);
