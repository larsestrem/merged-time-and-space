#!/usr/bin/env node
/* make-elevations.mjs — fetch a real elevation for every place the site has a
 * page for, and write seo/_data/elevations.json.
 *
 * RUN IT ON A MACHINE WITH INTERNET. The build environment this repo is
 * normally worked in has no outbound network, which is why this is a separate
 * one-off script (like make-us-cities.mjs and make-coastal-map.mjs) whose
 * OUTPUT is committed, rather than something the build does. Once the JSON is
 * committed, `npm run build` needs no network at all.
 *
 *   node seo/tools/make-elevations.mjs              # fetch everything missing
 *   node seo/tools/make-elevations.mjs --dry-run    # show the plan, fetch nothing
 *   node seo/tools/make-elevations.mjs --limit 50   # do 50, for a first try
 *   node seo/tools/make-elevations.mjs --force      # refetch places already done
 *
 * IT IS RESUMABLE. Every batch is written to disk as it completes, and a place
 * already in the file is skipped. If it dies half way — a flaky connection, a
 * rate limit, you pressing Ctrl-C — run it again and it picks up where it
 * stopped. About 1,200 places; expect a few minutes.
 *
 * TWO SOURCES, and it picks per place:
 *   - USGS EPQS for US locations. Authoritative, free, no key, no registration.
 *   - Open-Elevation for everywhere else, which is SRTM data. Free, no key.
 * Both are queried one point at a time with a small delay, because both are
 * free services run on someone else's budget and hammering them is how free
 * services stop being free.
 *
 * NOTHING IS INVENTED. A place the services cannot answer for is left out of
 * the file entirely, and place.mjs simply omits the row for it — no zero, no
 * guess, no "approximately". A partial file is fine and expected.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const OUT = join(root, "seo/_data/elevations.json");

const argv = process.argv.slice(2);
const dry = argv.includes("--dry-run");
const force = argv.includes("--force");
const limitArg = argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? parseInt(argv[limitArg + 1], 10) : Infinity;

/* ---- every place the site publishes a page for ---- */
const { SUN_ALL } = await import("./build-sun.mjs");
const { TIDE_STATIONS } = await import("./tide-stations.mjs");

const places = [
  ...SUN_ALL.map((c) => ({ key: c.slug, name: c.city, lat: c.lat, lon: c.lon, us: !!c.st })),
  ...TIDE_STATIONS.map((s) => ({ key: `tide:${s.slug}`, name: s.city, lat: s.lat, lon: s.lng, us: true })),
];
/* two families can share a slug (sun and moon use the same one) — one lookup */
const seen = new Set();
const unique = places.filter((p) => (seen.has(p.key) ? false : seen.add(p.key)));

const store = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { source: {}, meters: {} };
if (!store.meters) store.meters = {};
if (!store.source) store.source = {};

const todo = unique.filter((p) => force || !(p.key in store.meters)).slice(0, LIMIT);

console.log(`${unique.length} places known, ${Object.keys(store.meters).length} already have an elevation, ${todo.length} to fetch.`);
if (dry) {
  console.log(todo.slice(0, 10).map((p) => `  ${p.key.padEnd(24)} ${p.name} (${p.lat}, ${p.lon}) via ${p.us ? "USGS" : "Open-Elevation"}`).join("\n"));
  if (todo.length > 10) console.log(`  … and ${todo.length - 10} more`);
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** USGS Elevation Point Query Service — US only, metres. */
async function usgs(lat, lon) {
  const u = `https://epqs.nationalmap.gov/v1/json?x=${lon}&y=${lat}&units=Meters&wkid=4326&includeDate=false`;
  const r = await fetch(u, { headers: { "User-Agent": "timeandspace.science elevation build" } });
  if (!r.ok) throw new Error(`USGS ${r.status}`);
  const j = await r.json();
  const v = Number(j?.value);
  /* USGS returns -1000000 for "no data at this point" — that is a sentinel,
     not an elevation, and writing it would be exactly the kind of invented
     number this script exists to avoid. */
  if (!Number.isFinite(v) || v < -500) return null;
  return v;
}

/** Open-Elevation (SRTM) — worldwide, metres. */
async function openElevation(lat, lon) {
  const u = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`;
  const r = await fetch(u, { headers: { "User-Agent": "timeandspace.science elevation build" } });
  if (!r.ok) throw new Error(`Open-Elevation ${r.status}`);
  const j = await r.json();
  const v = Number(j?.results?.[0]?.elevation);
  return Number.isFinite(v) ? v : null;
}

let done = 0, failed = 0, saved = 0;
for (const p of todo) {
  let v = null, src = null;
  for (const attempt of [1, 2, 3]) {
    try {
      v = p.us ? await usgs(p.lat, p.lon) : await openElevation(p.lat, p.lon);
      src = p.us ? "usgs" : "open-elevation";
      break;
    } catch (e) {
      if (attempt === 3) { console.warn(`  ! ${p.key}: ${e.message}`); break; }
      await sleep(1500 * attempt);   /* back off, then try again */
    }
  }
  if (v == null) { failed++; }
  else { store.meters[p.key] = Math.round(v); store.source[p.key] = src; done++; }

  /* write as we go, so a crash or Ctrl-C never loses the work already paid for */
  if ((done + failed) % 25 === 0) {
    writeFileSync(OUT, `${JSON.stringify(sorted(store), null, 1)}\n`);
    saved = done;
    process.stdout.write(`\r  ${done} fetched, ${failed} unavailable, ${todo.length - done - failed} left…   `);
  }
  await sleep(150);   /* be a good guest on a free service */
}

function sorted(s) {
  const keys = Object.keys(s.meters).sort();
  return {
    note: "Elevation in metres. Written by seo/tools/make-elevations.mjs. Places absent here have no published elevation and the site omits the row rather than guessing.",
    count: keys.length,
    meters: Object.fromEntries(keys.map((k) => [k, s.meters[k]])),
    source: Object.fromEntries(keys.map((k) => [k, s.source[k]])),
  };
}
writeFileSync(OUT, `${JSON.stringify(sorted(store), null, 1)}\n`);
console.log(`\nWrote seo/_data/elevations.json — ${Object.keys(store.meters).length} elevations (${done} new this run, ${failed} unavailable).`);
console.log("Commit that file, then run npm run build. No network is needed after this.");
