#!/usr/bin/env node
/* build-sitemap.mjs — generate the sitemap from the same data the page
 * generators use, so new builders/hubs/rich pages/countries are always listed.
 * Emits ONE flat urlset at /sitemap.xml. (It was a sitemap index over per-family
 * children under /sitemaps/ for a while; the site is small enough — ~2,000 URLs,
 * far under the 50,000/50MB limit — that a single file is simpler to submit and
 * to verify, and the families are still visible in this file's grouping below.)
 *
 *   node seo/tools/build-sitemap.mjs   (run before build-inline)
 */
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const today = new Date().toISOString().slice(0, 10);

/* Real per-section <lastmod>, from git history of the generator + data files
 * that actually produce each URL group — not a blanket "today" on every URL
 * (which Google treats as an unreliable signal and may ignore sitemap-wide).
 * Falls back to today if git is unavailable or a path has no history yet
 * (e.g. this repo was shallow-cloned, or the file is new/uncommitted).
 *
 * THE SOURCE SET IS DERIVED, NOT HAND-LISTED. It used to be: sunSrc =
 * [build-sun.mjs, us-cities.json]. But build-sun imports localtime.mjs and
 * crosslinks.mjs, which between them render a line and a strip on ~2,330 sun,
 * moon and tide pages — so a change confined to one of those moved no lastmod
 * and IndexNow announced nothing. The sitemap stayed valid; it was quietly
 * wrong about what was new. deps() walks each generator's imports transitively
 * so the set maintains itself. Data files aren't imports and stay listed. */
/* every local module a generator pulls in, transitively — the files whose
 * content genuinely decides what it emits. Bare specifiers (node:fs) skipped. */
const depCache = new Map();
function deps(rel) {
  if (depCache.has(rel)) return depCache.get(rel);
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    let src;
    try { src = readFileSync(join(root, file), "utf8"); } catch (e) { return; }
    const dir = file.slice(0, file.lastIndexOf("/"));
    /* static `from "./x"` and dynamic `import("./x")` both count — several
       generators reach for the heavy modules dynamically. */
    for (const re of [/from\s+["'](\.[^"']+)["']/g, /import\(\s*["'](\.[^"']+)["']\s*\)/g])
      for (const m of src.matchAll(re)) {
        const out = [];
        for (const seg of `${dir}/${m[1]}`.split("/")) {
          if (seg === "." || seg === "") continue;
          if (seg === "..") out.pop(); else out.push(seg);
        }
        walk(out.join("/"));
      }
  };
  walk(rel);
  depCache.set(rel, [...seen]);
  return depCache.get(rel);
}
/** a generator plus everything it imports, plus the data files named here */
const srcOf = (generator, ...dataFiles) => [...deps(generator), ...dataFiles];

/* A REVISION for a URL group. The public sitemap shows a DATE, which is what the
 * spec wants — but a date cannot tell two changes on the same day apart, and on
 * this repo that is most days: the second edit produced an identical sitemap and
 * an identical state entry, so the submitter never heard about it. The rev is a
 * hash of the group's source CONTENT, so any byte that changes the output
 * changes it, with no git dependency and no shallow-clone caveat. It never goes
 * in sitemap.xml; it goes in a sidecar the submitter reads. */
const hashCache = new Map();
const fileHash = (rel) => {
  if (!hashCache.has(rel)) {
    let h = "missing";
    try { h = createHash("sha256").update(readFileSync(join(root, rel))).digest("hex"); } catch (e) { /* keep */ }
    hashCache.set(rel, h);
  }
  return hashCache.get(rel);
};
const revOf = (sources) => createHash("sha256")
  .update([...sources].sort().map((f) => `${f}:${fileHash(f)}`).join("\n"))
  .digest("hex").slice(0, 12);

const dateCache = new Map();
function gitDate(...paths) {
  const key = paths.join("|");
  if (dateCache.has(key)) return dateCache.get(key);
  let d = today;
  try {
    const out = execSync(`git log -1 --format=%cd --date=short -- ${paths.map((p) => `"${p}"`).join(" ")}`, { cwd: root, encoding: "utf8" }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) d = out;
  } catch (e) { /* not a git checkout, or git unavailable — keep today */ }
  dateCache.set(key, d);
  return d;
}
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const popular = JSON.parse(readFileSync(join(root, "seo/_data/popular-countdowns.json"), "utf8"));
const { countries } = JSON.parse(readFileSync(join(root, "seo/_data/countries.json"), "utf8"));
const events = (await import("./lib.mjs")).loadEvents(readFileSync, join, root);
const { timerSlug, alarmTimes } = await import("./lib.mjs");
const timers = JSON.parse(readFileSync(join(root, "seo/_data/timers.json"), "utf8"));
/* noindex durations still exist as functional URLs but are kept out of the
 * sitemap (matching their robots noindex) — see build-timers.mjs. */
const timerNoindex = new Set(timers.noindex || []);
const timerPaths = [...timers.durations.filter((s) => !timerNoindex.has(s)).map((s) => `/timer/${timerSlug(s)}/`), ...timers.useCases.map((u) => `/timer/${u.slug}/`)];

/* Each group's lastmod comes from the git history of the generator(s) + data
 * file(s) that actually produce it, so the sitemap only claims a page changed
 * when its real source did — not "today" for all ~1,500 URLs on every build.
 * group(pairs, ...sourceFiles) stamps every [path, priority] pair in `pairs`
 * with the newest commit date among sourceFiles. */
/* [url, priority, lastmod, rev] — lastmod goes in the sitemap, rev in the sidecar */
const group = (pairs, ...sources) => {
  const d = gitDate(...sources), r = revOf(sources);
  return pairs.map(([u, p]) => [u, p, d, r]);
};
const homeSrc = srcOf("seo/tools/build-home.mjs", "seo/_data/popular-countdowns.json");
const tideSrc = srcOf("seo/tools/build-tides.mjs", "assets/js/tides.js", "seo/_data/tide-predictions.json");
const sunSrc = srcOf("seo/tools/build-sun.mjs", "seo/_data/us-cities.json");
const eventsSrc = srcOf("seo/tools/build-events.mjs", "seo/_data/events.json");
const peopleSrc = srcOf("seo/tools/build-events.mjs", "seo/_data/people.json");
const timerSrc = srcOf("seo/tools/build-timers.mjs", "seo/_data/timers.json");
const alarmSrc = [...new Set([...deps("seo/tools/build-alarm.mjs"), ...deps("seo/tools/build-alarm-times.mjs")])];
const catSrc = srcOf("seo/tools/build-category-pages.mjs", "seo/_data/popular-countdowns.json");
const countrySrc = srcOf("seo/tools/build-countries.mjs", "seo/_data/countries.json");

const TIDE_STATIONS = (await import("./tide-stations.mjs")).TIDE_STATIONS;
const tideStatePages = (await import("./tide-stations.mjs")).tideStatePages;
const tideDestinations = JSON.parse(readFileSync(join(root, "seo/_data/tide-destinations.json"), "utf8")).destinations || [];
const destSrc = srcOf("seo/tools/build-tides.mjs", "seo/_data/tide-destinations.json", "assets/js/tides.js");
const { SUN_CITIES, SUN_US, SUN_STATES } = await import("./build-sun.mjs");
const { MOON_YEARS, CAL_SLUGS } = await import("./build-moon.mjs");
const { ECLIPSE_SLUGS } = await import("./build-eclipses.mjs");
const moonSrc = srcOf("seo/tools/build-moon.mjs");
const eclipseSrc = srcOf("seo/tools/build-eclipses.mjs");
const moonEventSrc = srcOf("seo/tools/build-moon-events.mjs");
const { WC_CITIES } = await import("./build-world-clock.mjs");
const worldClockSrc = srcOf("seo/tools/build-world-clock.mjs");
const tdiffSrc = srcOf("seo/tools/build-time-difference.mjs", "seo/tools/wc-cities.mjs");
const convSrc = srcOf("seo/tools/build-clock-convert.mjs", "seo/tools/clock-convert.mjs");
const { CONV_SLUGS } = await import("./clock-convert.mjs");
const { SIM_SLUGS } = await import("./build-simulator.mjs");

/* Indexable pages only. The groups below are page families (they used to be
 * separate child sitemaps) and are concatenated into one urlset. The /report/
 * and /wrong-date/ utility forms are noindex, so they're intentionally omitted
 * (listing a noindex page in the sitemap sends a contradictory signal). */
const families = {
  core: [
    ...group([["/", "1.0"]], ...homeSrc),
    /* the section pages the tabbed home split into */
    ...group([["/time/", "0.8"], ["/earth/", "0.8"], ["/space/", "0.8"]], ...homeSrc),
    ...group([["/countdown/", "0.9"]], "seo/tools/build-home.mjs"),
    ...group([["/stopwatch/", "0.8"]], "stopwatch/index.html"),
    ...group([["/classroom/", "0.7"], ["/classroom/submit-a-lesson/", "0.7"]], ...deps("seo/tools/build-classroom.mjs")),
    /* the two worked-example lessons are static files now (see build-inline),
       so their own HTML is the source their lastmod tracks */
    ...group([["/classroom/lessons/seasons-grades-7-8/", "0.5"]], "classroom/lessons/seasons-grades-7-8/index.html"),
    ...group([["/classroom/lessons/solar-system-grades-3-4/", "0.5"]], "classroom/lessons/solar-system-grades-3-4/index.html"),
    ...group([["/sun-moon-earth-movement-simulator/", "0.7"], ["/earth-sun-moon-orbit-simulator/", "0.6"]], ...deps("seo/tools/build-simulator.mjs")),
    ...group([["/moon-simulator/", "0.75"]], ...deps("seo/tools/build-moon-lab.mjs")),
    /* EVERY SOLAR + ROCKET PAGE, from the list build-solar recorded as it wrote
       them. It used to be three hand-kept entries plus a
       `/solar-system-simulator/<slug>/` pattern, which silently stopped being
       true when the planet pages went flat and the launch hub gained children.
       The two hubs keep a higher priority than their children. */
    /* /planets/ — the section hub above the simulator: a card per world with
       its own picture and prose. Its sources walk to globe.mjs and planets.mjs
       through deps(), so a change to a drawing or an orbit re-announces it. */
    ...group([[(await import("./solar-pages.mjs")).PLANETS_PATH, "0.8"]],
             ...deps("seo/tools/build-planets.mjs"), "seo/_data/solar-facts.json"),
    ...group((await import("./build-solar.mjs")).SOLAR_URLS.map((u) =>
               [u, (u === "/solar-system-simulator/" || u === "/rocket-launch-simulator/") ? "0.7" : "0.6"]),
             ...deps("seo/tools/build-solar.mjs"), "seo/_data/solar-facts.json"),
    /* the day/night map — the home page's own card, with time attached */
    ...group([["/day-night-map/", "0.7"]], ...deps("seo/tools/build-daynight.mjs")),
    /* the orbital-velocity pair. Its own generator, but every figure on it is
       derived from planets.mjs + transfer.mjs, so deps() walks to both and a
       change to either element table re-announces these two pages. */
    ...group([["/orbital-velocity-simulator/", "0.7"],
              ["/orbital-velocity-simulator/why-planets-dont-fall-into-the-sun/", "0.65"]],
             ...deps("seo/tools/build-orbital.mjs")),
    /* one per registry city, the same list /sun/ and /moon/ are built from */
    ...group(SIM_SLUGS.map((s) => [`/sun-moon-earth-movement-simulator/${s}/`, "0.45"]), ...deps("seo/tools/build-simulator.mjs")),
    ...group([["/stopwatch/multiple/", "0.7"]], ...deps("seo/tools/build-stopwatch-multi.mjs")),
    /* the measurement JSON is a source too: re-running measure-timing.mjs or
     * measure-sun.mjs changes the numbers on these pages without touching a
     * line of the generator, and a rev that missed that would never announce it */
    ...group([["/methodology/", "0.6"], ["/methodology/sunrise-sunset/", "0.6"],
              ["/methodology/moon-phase/", "0.6"], ["/methodology/tide-predictions/", "0.6"],
              ["/methodology/time-zones/", "0.6"], ["/methodology/browser-timing/", "0.6"]],
             ...deps("seo/tools/build-methodology.mjs"), "seo/_data/browser-timing.json", "seo/_data/sun-accuracy.json"),
    ...group([["/world-clock/", "0.7"]], ...worldClockSrc),
    ...group(WC_CITIES.map((c) => [`/world-clock/${c.slug}/`, "0.6"]), ...worldClockSrc),
    ...group([["/time-difference-calculator/", "0.7"]], ...tdiffSrc),
    ...group([["/24-hour-clock-converter/", "0.7"]], ...convSrc),
    ...group(CONV_SLUGS.map((s) => [`/24-hour-clock-converter/${s}/`, "0.6"]), ...convSrc),
    ...group([["/countries/", "0.6"]], ...countrySrc),
    ...group(countries.map((c) => [`/countries/${c.code}/`, "0.6"]), ...countrySrc),
    ...group([["/how-it-works/", "0.5"]], "how-it-works/index.html"),
    ...group([["/about/", "0.5"]], "about/index.html"),
    ...group([["/about/work-with-us/", "0.5"]], "about/work-with-us/index.html"),
    ...group([["/sponsors/", "0.4"]], "sponsors/index.html"),
    ...group([["/glossary/", "0.7"], ["/questions/", "0.7"]], ...deps("seo/tools/build-glossary.mjs"), "seo/_data/concepts.json"),
    /* 0.8, not 0.65: the question pages are the URLs this strategy wants
       ranked — the crawl signal should not weight them below a timer preset */
    ...group((await import("./concepts.mjs")).CONCEPT_SLUGS().map((s) => [`/concepts/${s}/`, "0.8"]),
             ...deps("seo/tools/build-concepts.mjs"), "seo/_data/concepts.json"),
    ...group([["/browser-limitations/", "0.5"]], "browser-limitations/index.html"),
    ...group([["/suggest-event/", "0.4"]], "suggest-event/index.html"),
    ...group([["/terms", "0.3"]], "terms.html"),
    ...group([["/privacy", "0.3"]], "privacy.html"),
  ],
  timers: [
    ...group([["/timer/", "0.8"]], ...timerSrc),
    ...group(timerPaths.map((p) => [p, "0.6"]), ...timerSrc),
  ],
  alarm: [
    ...group([["/alarm-clock/", "0.8"], ["/alarm-clock/about/", "0.5"], ["/alarm-clock/warnings/", "0.5"]], ...alarmSrc),
    ...group(alarmTimes().map((t) => [`/alarm-clock/${t.slug}/`, "0.6"]), ...alarmSrc),
  ],
  /* One "tides" sitemap covering the whole family (hub, near-me, state hubs,
     stations, destinations) so it maps to a single Search Console bucket. */
  tides: [
    ...group([["/tides/", "0.8"], ["/tides/near-me/", "0.8"], ["/tides/biggest-tides/", "0.6"]], ...tideSrc),
    ...group(tideStatePages().map((p) => [`/tides/${p.slug}/`, "0.7"]), ...tideSrc),
    ...group(TIDE_STATIONS.map((s) => [`/tides/${s.slug}/`, "0.6"]), ...tideSrc),
    ...group(tideDestinations.map((d) => [`/tides/${d.slug}/`, "0.6"]), ...destSrc),
  ],
  sunrise: [
    ...group([["/sun/", "0.7"], ["/sun/near-me/", "0.6"], ["/sun/anywhere/", "0.6"]], ...sunSrc),
    /* curated cities 0.6, census US cities 0.5, state hubs 0.55. /sun/anywhere/
       used to be noindex and unlisted — it is a real page (a search box, a
       geocoder and full sun times for any coordinates), and hiding it lost the
       "sunrise anywhere" and small-town queries the 1,074 city pages cannot
       answer. */
    ...group(SUN_CITIES.map((c) => [`/sun/${c.slug}/`, "0.6"]), ...sunSrc),
    ...group(SUN_US.map((c) => [`/sun/${c.slug}/`, "0.5"]), ...sunSrc),
    ...group(SUN_STATES.map((s) => [`/sun/state/${s.slug}/`, "0.55"]), ...sunSrc),
  ],
  moon: [
    ...group([["/moon/", "0.8"], ["/moon/full-moon-calendar/", "0.7"], ["/moon/calendar/", "0.7"], ["/moon/near-me/", "0.6"]], ...moonSrc),
    ...group([["/moon/eclipses/", "0.7"]], ...eclipseSrc),
    ...group(ECLIPSE_SLUGS.map((sl) => [`/moon/eclipses/${sl}/`, "0.6"]), ...eclipseSrc),
    ...group([["/moon/supermoons/", "0.65"], ["/moon/blue-moons/", "0.65"]], ...moonEventSrc),
    ...group(MOON_YEARS.map((y) => [`/moon/${y}/`, "0.6"]), ...moonSrc),
    ...group(CAL_SLUGS.map((sl) => [`/moon/calendar/${sl}/`, "0.55"]), ...moonSrc),
    /* city + state pages mirror the /sun/ family's priorities */
    ...group(SUN_CITIES.map((c) => [`/moon/${c.slug}/`, "0.6"]), ...moonSrc),
    ...group(SUN_US.map((c) => [`/moon/${c.slug}/`, "0.5"]), ...moonSrc),
    ...group(SUN_STATES.map((st) => [`/moon/state/${st.slug}/`, "0.55"]), ...moonSrc),
  ],
  countdowns: [
    ...group([["/popular/", "0.8"]], "seo/tools/build-popular.mjs"),
    ...group([["/trending/", "0.8"]], "seo/tools/build-trending.mjs"),
    ...group([["/calendar/", "0.8"]], "seo/tools/build-calendar.mjs", ...eventsSrc),
    ...group(events.filter((e) => e.urlPath.startsWith("/birthday-countdowns/")).map((e) => [e.urlPath, "0.8"]), ...peopleSrc),
    ...group(events.filter((e) => !e.urlPath.startsWith("/birthday-countdowns/")).map((e) => [e.urlPath, "0.8"]), ...eventsSrc),
    ...group(popular.categories.map((c) => [`/${c.hub}/`, "0.7"]), ...catSrc),
    ...group(popular.categories.map((c) => [`/${c.hub}/popular/`, "0.6"]), ...catSrc),
  ],
};

const urlset = (rows) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows.map(([u, p, d]) =>
  `  <url><loc>${SITE}${u}</loc><lastmod>${d}</lastmod>${p ? `<priority>${p}</priority>` : ""}</url>`).join("\n")}
</urlset>
`;

/* One flat urlset, families in declaration order, de-duped on URL (a page listed
 * by two families would otherwise appear twice in the same sitemap). */
const seen = new Set();
const rows = [];
for (const familyRows of Object.values(families))
  for (const row of familyRows)
    if (!seen.has(row[0])) { seen.add(row[0]); rows.push(row); }

writeFileSync(join(root, "sitemap.xml"), urlset(rows));

/* The sidecar the IndexNow submitter compares against: FULL URL -> "date/rev",
 * keyed exactly like the sitemap's <loc> so the two can never disagree about
 * what a URL is. Both halves on purpose — the date keeps a diff of this file
 * readable, the rev is what actually decides. Committed, so the submission
 * workflow can read it without running a build. */
writeFileSync(join(root, "seo/_data/sitemap-revs.json"),
  `${JSON.stringify(Object.fromEntries(rows.map(([u, , d, r]) => [`${SITE}${u}`, `${d}/${r}`])), null, 1)}\n`);
/* ---- /llms.txt -----------------------------------------------------------
 * A plain-text map of the site for the crawlers that read one. Speculative:
 * there is no evidence it moves anything, and it should not be expected to.
 * It is here because it costs one file and because the alternative — a
 * hand-written description of fifteen families — would be wrong within a month.
 * COUNTS AND EXAMPLE URLS ARE DERIVED FROM THE SITEMAP ROWS ABOVE, so this file
 * cannot claim a page count the site does not have. */
const FAMILIES = [
  ["/alarm-clock/", "Alarm clock", "Set an alarm for any time, in the browser. Includes a page per half-hour ('set an alarm for 6:30 AM')."],
  ["/timer/", "Countdown timer", "A timer with a page per common duration and per use case (eggs, study, meditation)."],
  ["/stopwatch/", "Stopwatch", "Stopwatch with laps, CSV/image export, and a four-way version for classrooms."],
  ["/world-clock/", "World clock", "Current time, UTC offset and DST state for a city, one page per city."],
  ["/time-difference-calculator/", "Time difference calculator", "Hours and minutes between two clock times, in any time zone, daylight-saving aware."],
  ["/24-hour-clock-converter/", "12/24-hour clock converter", "Convert between the 12-hour clock and the 24-hour clock (military time), with a page per half hour."],
  ["/sun/", "Sunrise & sunset", "Sunrise, sunset, day length and twilight for a city and any date. Includes an any-location page."],
  ["/moon/", "Moon", "Moonrise, moonset, phase and illumination per city, plus phase calendars, eclipses, supermoons and blue moons."],
  ["/tides/", "Tide predictions", "Predicted tide times and heights for US NOAA stations, grouped by state and county."],
  ["/sun-moon-earth-movement-simulator/", "Sun, Earth & Moon simulator", "Where the sun and moon are from a given place at a given instant, scrubbable over a day, week or month."],
  ["/planets/", "The planets", "Every planet in orbital order with a picture and a couple of paragraphs each, the asteroid belt in its place, and a page for every one."],
  ["/solar-system-simulator/", "Solar system simulator", "The planets on their real orbits, with moon systems, the asteroid belt and comets."],
  ["/rocket-launch-simulator/", "Rocket launch simulator", "When the next launch window to Mars, Jupiter and Saturn opens, what it costs, and how the real missions compare."],
  ["/concepts/", "Questions & concepts", "One question per URL, answered in the first paragraph: why we have seasons, what causes tides, why the moon changes shape, what a time zone is — each with a computed drawing."],
  ["/glossary/", "Glossary", "Every term on the site, A to Z, each linking to the question page that explains it."],
  ["/countdown/", "Countdowns", "Countdown pages for holidays, celebrity birthdays, sports and anniversaries."],
  ["/calendar/", "Events calendar", "Every countdown by month. Also published as a subscribable feed at /calendar/events.ics."],
  ["/methodology/", "Methodology", "How each figure on the site is worked out, and where it stops being reliable."],
  ["/classroom/", "Classroom", "The invitation to teachers: bring a lesson you're proud of, we develop it together — on our tools or tools we build for it — and publish it free for every teacher."],
];
const under = (prefix) => rows.filter(([u]) => u.startsWith(prefix)).length;
const llms = `# Time and Space Science

> Free, no-sign-up clock tools and countdowns that run entirely in the browser.
> Static pages on Cloudflare Pages; no accounts, no tracking beyond analytics,
> nothing to install. ${rows.length} pages in all.

Everything below is a real, permanent URL. Figures on time-and-sky pages are
computed, not scraped: the methodology pages state the method and its limits.

## Sections

${FAMILIES.map(([u, name, desc]) => {
  const n = under(u);
  return `- [${name}](${SITE}${u})${n > 1 ? ` — ${n} pages` : ""}: ${desc}`;
}).join("\n")}

## Notes

- Tide predictions are NOAA CO-OPS astronomical predictions. They exclude
  weather, storm surge and atmospheric pressure, and are not for navigation.
- Sun and moon figures are computed in the browser, so they are never stale.
  Accuracy bounds are published at ${SITE}/methodology/.
- The planetary positions are approximate Keplerian elements valid 1800-2050.
  They are not an ephemeris.
- Timers and alarms only ring while the page is open.

## Full index

- [Sitemap](${SITE}/sitemap.xml)
`;
writeFileSync(join(root, "llms.txt"), llms);

/* the old per-family children are gone — remove them so nothing keeps serving a
 * stale copy at /sitemaps/<family>.xml (harmless if already absent) */
rmSync(join(root, "sitemaps"), { recursive: true, force: true });
console.log(`Generated sitemap.xml (${rows.length} URLs, ${Object.keys(families).length} families) + sitemap-revs.json + llms.txt.`);
