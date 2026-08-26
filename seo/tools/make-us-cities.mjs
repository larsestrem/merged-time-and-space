#!/usr/bin/env node
/* make-us-cities.mjs — regenerates seo/_data/us-cities.json from the
 * committed census top-1000 list (seo/_data/us-cities-top-1k.csv, from
 * https://raw.githubusercontent.com/plotly/datasets/master/us-cities-top-1k.csv)
 * with an IANA time zone per city via the vendored tz-lookup (no network).
 * NOT part of the default build — us-cities.json is committed; rerun this
 * only when the source list or the dedupe rules change:
 *   node seo/tools/make-us-cities.mjs
 * Cities that duplicate an existing cities.mjs page (New York, Portland OR,
 * Washington DC, …) get {alias: <existing slug>} instead of their own page,
 * so state hubs and search can still list them without minting a duplicate.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { CITY_DB, citySlug } from "./cities.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const tzlookup = createRequire(import.meta.url)("./vendor/tz-lookup.cjs");

const ABBR = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", "District of Columbia": "DC",
  Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL",
  Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA",
  Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI",
  Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT",
  Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
  "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR",
  Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT",
  Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV",
  Wisconsin: "WI", Wyoming: "WY",
};

/* display-name cleanups for census legal names */
const RENAME = { "San Buenaventura (Ventura)": "Ventura", "Boise City": "Boise" };

const csv = readFileSync(join(here, "..", "_data", "us-cities-top-1k.csv"), "utf8").trim().split("\n");
const header = csv.shift().split(",");
if (header.join(",") !== "City,State,Population,lat,lon") throw new Error("unexpected CSV header: " + header);

const usExisting = CITY_DB
  .filter(([, area]) => area === "USA")
  .map(([city, , tz, lat, lon]) => ({ city, tz, lat, lon, slug: citySlug(city) }));

const out = [];
const slugs = new Set();
for (const line of csv) {
  const parts = line.split(",");
  // City names in this dataset contain no commas except "Washington, District of Columbia"-style
  // never occurs (state is its own column) — assert instead of guessing.
  if (parts.length !== 5) throw new Error("unexpected row: " + line);
  let [city, state, pop, lat, lon] = parts;
  city = RENAME[city] || city;
  const st = ABBR[state];
  if (!st) throw new Error("unknown state: " + state);
  lat = Math.round(parseFloat(lat) * 10000) / 10000;
  lon = Math.round(parseFloat(lon) * 10000) / 10000;
  const tz = tzlookup(lat, lon);
  /* dedupe against the hand-curated cities.mjs pages: identical name (slug)
   * within ~0.4° (≈25–30 mi) is the same city. Distinct neighbors that merely
   * share a word (Miami Beach, San Mateo, New Rochelle) keep their own page.
   * "Washington, D.C." slugs differently from census "Washington" — map it. */
  const mySlug = st === "DC" && citySlug(city) === "washington" ? "washington-d-c" : citySlug(city);
  const dup = usExisting.find((e) =>
    e.slug === mySlug &&
    (e.lat - lat) ** 2 + (e.lon - lon) ** 2 < 0.16);
  const entry = { city, state, st, lat, lon, tz, pop: parseInt(pop, 10) };
  if (dup) entry.alias = dup.slug;
  else {
    entry.slug = `${citySlug(city)}-${st.toLowerCase()}`;
    if (slugs.has(entry.slug)) throw new Error("slug collision: " + entry.slug);
    slugs.add(entry.slug);
  }
  out.push(entry);
}
out.sort((a, b) => b.pop - a.pop);

const dest = join(here, "..", "_data", "us-cities.json");
writeFileSync(dest, JSON.stringify(out, null, 1) + "\n");
const aliased = out.filter((e) => e.alias).length;
console.log(`Wrote ${out.length} cities (${out.length - aliased} new pages, ${aliased} aliased to existing) -> ${dest}`);
