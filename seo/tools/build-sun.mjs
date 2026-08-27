#!/usr/bin/env node
/* build-sun.mjs — the /sun/ section: sunrise & sunset times.
 *   /sun/               hub: search, My Cities, mini dials, browse by state
 *   /sun/<city>/        per-city page: today's first light, sunrise, solar
 *                       noon, sunset, last light and day length, a date
 *                       picker, a 7-day table and an annual chart — ALL
 *                       computed in the visitor's browser with the same
 *                       SunCalc solar math the world clock uses (extended
 *                       with a civil-twilight angle), from baked lat/lon.
 *                       Times are shown in the CITY's own time zone via
 *                       Intl, so the pages are static, timezone-correct and
 *                       can never go stale — no API, no rebuild, ever.
 *   /sun/state/<state>/ per-state hub listing that state's city pages.
 *   /sun/anywhere/      NOINDEX utility page: sun times for ANY location —
 *                       local city index first, Open-Meteo geocoding for
 *                       small towns, or browser geolocation; the location
 *                       lives in the URL (?lat&lon&tz&name) so results are
 *                       shareable. Kept out of the sitemap on purpose.
 *   /sun/cities.json    search index (~1,000 US cities + world cities),
 *                       lazy-loaded by the search boxes on first keystroke.
 * World cities come from the shared cities.mjs database; US cities from
 * seo/_data/us-cities.json (census top-1000, see make-us-cities.mjs).
 *   node seo/tools/build-sun.mjs   (run before build-sitemap + build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, appLd, faqLd, breadcrumbLD, SUN_JS, SUNPOS_JS, AC_JS, DIAL_JS, nSunCalc, nSunPos, sunDialSvg } from "./lib.mjs";
import { ORRERY_JS, orreryFigure, orreryCaption } from "./orrery.mjs";
import { astroStrip, tideNote, simLink } from "./crosslinks.mjs";
import { placeFacts, placeLd, resolvePlace, nearestMajor, cityLabel, milesBetween } from "./place.mjs";
import { tideStatePages } from "./tide-stations.mjs";
import { MOON_CORE, moonIllum, moonName, moonGlyph, moonTimes, moonPos } from "./moon.mjs";
import { hubQuestionsCard } from "./concepts.mjs";
/* epoch of the city's local midnight (minute precision — moonTimes samples hourly) */
function mnDayStart(ms, tz) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms)).split(":");
  return ms - (+p[0] * 3600 + +p[1] * 60) * 1000 - (ms % 60000);
}
import { CITY_DB, citySlug } from "./cities.mjs";
import { localTimeLine, LOCALTIME_JS } from "./localtime.mjs";
import { sunToStation } from "./coastal.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;

export const SUN_CITIES = CITY_DB.map(([city, area, tz, lat, lon]) => ({ city, area, tz, lat, lon, slug: citySlug(city) }));

/* US expansion: census top-1000 cities (see make-us-cities.mjs). Entries with
 * an `alias` are already covered by a hand-curated cities.mjs page and get no
 * page of their own — state hubs and the search index point at the alias. */
const US_RAW = JSON.parse(readFileSync(join(root, "seo/_data/us-cities.json"), "utf8"));
export const SUN_US = US_RAW.filter((e) => !e.alias)
  .map((e) => ({ city: e.city, area: e.state, tz: e.tz, lat: e.lat, lon: e.lon, slug: e.slug, st: e.st, pop: e.pop }));
export const SUN_ALL = [...SUN_CITIES, ...SUN_US];
export const SUN_STATES = [...new Set(US_RAW.map((e) => e.state))].sort().map((state) => ({
  state,
  slug: citySlug(state),
  st: US_RAW.find((e) => e.state === state).st,
  /* the state's cities, largest first, each resolved to its real page slug */
  cities: US_RAW.filter((e) => e.state === state).sort((a, b) => b.pop - a.pop)
    .map((e) => ({ city: e.city, slug: e.slug || e.alias, pop: e.pop })),
}));

/* The census list carries `st`; the hand-curated US cities in cities.mjs don't,
 * so they're filled in here. A US page reads better — and matches how people
 * search — as "Nome, AK" than as "Nome". Washington, D.C. is left out on
 * purpose: its name already says where it is. */
const CURATED_ST = {
  Atlanta: "GA", Austin: "TX", Boston: "MA", Chicago: "IL", Dallas: "TX", Denver: "CO", Detroit: "MI",
  Honolulu: "HI", Houston: "TX", "Las Vegas": "NV", "Los Angeles": "CA", Miami: "FL", Minneapolis: "MN",
  Nashville: "TN", "New Orleans": "LA", "New York": "NY", Nome: "AK", Philadelphia: "PA", Phoenix: "AZ",
  Portland: "OR", "Salt Lake City": "UT", "San Diego": "CA", "San Francisco": "CA", Seattle: "WA",
  "Bar Harbor": "ME", "Cannon Beach": "OR", "Key West": "FL", Malibu: "CA", Sedona: "AZ", Anchorage: "AK",
};
for (const c of SUN_CITIES) if (c.area === "USA" && CURATED_ST[c.city]) c.st = CURATED_ST[c.city];

/* label with the state for the ~60 duplicated US city names (Springfield…) */
/* cityLabel now lives in place.mjs — build-moon needed the same function and
   kept its own identical copy, so a change had to be made in two files. */

/* ---- server-side sun math (Node) --------------------------------------------
 * A build-time port of the client SUN_JS sunCalc so the crawlable HTML ships
 * the ACTUAL sunrise/sunset/twilight values, the day length and a filled 7-day
 * table — not "—" placeholders that only resolve after JavaScript runs. The
 * client JS still recomputes everything for the visitor's exact current date on
 * load, so these baked values are a correct, indexable default (fresh as of the
 * last build; see the scheduled-rebuild note). Same algorithm + the same Intl
 * timezone formatting the client uses, so the two never disagree for the build
 * date. nSunCalc lives in lib.mjs (shared with build-home.mjs); ang: -0.833° =
 * sunrise/sunset, -6° = civil twilight (first/last light). */
const fmtTime = (ms, tz) => { try { return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(ms)); } catch (e) { return "—"; } };
const lenShort = (ms) => { const m = Math.round(ms / 60000); return `${Math.floor(m / 60)} h ${m % 60} m`; };
const lenWords = (ms) => { const m = Math.round(ms / 60000), h = Math.floor(m / 60), mm = m % 60; return `${h} hour${h === 1 ? "" : "s"} ${mm} minute${mm === 1 ? "" : "s"}`; };
/* compact day length for the search snippet, where every character counts */
const lenAbbr = (ms) => { const m = Math.round(ms / 60000); return `${Math.floor(m / 60)} hr ${m % 60} min`; };
const dayLongTz = (ms, tz) => { try { return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date(ms)); } catch (e) { return ""; } };
const dayShortTz = (ms, tz) => { try { return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(new Date(ms)); } catch (e) { return ""; } };
/* the city-local calendar day, in the format a <input type="date"> expects, so
 * the picker in the card heading shows the right day before any JS runs */
const ymdTz = (ms, tz) => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms)); } catch (e) { return ""; } };
const tzLongName = (tz, d) => { try { const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "long" }).formatToParts(d).find((x) => x.type === "timeZoneName"); return p ? p.value : ""; } catch (e) { return ""; } };
const mdTz = (ms, tz) => { try { return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "long", day: "numeric" }).format(new Date(ms)); } catch (e) { return ""; } };

/* ---- golden hour & blue hour (photographer's light) and moon phase ----
 * Golden hour = the sun between −4° and +6°; blue hour = the deeper twilight
 * between −6° and −4°. Two of each per day (morning ramp up, evening ramp
 * down), found by asking nSunCalc when the sun crosses those angles. Moon math
 * comes from the shared seo/tools/moon.mjs (there used to be a private copy
 * here, which is how /sun/ and /tides/ ended up disagreeing about the phase).
 * Both are baked into the HTML for crawlers and recomputed live in the browser
 * from the SAME source string, so the two can't drift. */
function sunBands(now, lat, lon, tz) {
  const a6 = nSunCalc(now, lat, lon, 6), am4 = nSunCalc(now, lat, lon, -4), am6 = nSunCalc(now, lat, lon, -6);
  /* the two deeper twilights: nautical ends at −12°, astronomical at −18°.
   * Above ~48–60° of latitude the sun never gets that far down in midsummer,
   * so nSunCalc returns no crossing and the row honestly reads "does not end"
   * rather than inventing a time. */
  const am12 = nSunCalc(now, lat, lon, -12), am18 = nSunCalc(now, lat, lon, -18);
  const s = nSunCalc(now, lat, lon, -0.833);
  const rng = (a, b) => (a && b && b > a) ? `${fmtTime(a, tz)} – ${fmtTime(b, tz)}` : "—";
  return {
    ghAm: rng(am4.rise, a6.rise), ghPm: rng(a6.set, am4.set),
    blAm: rng(am6.rise, am4.rise), blPm: rng(am4.set, am6.set),
    /* morning runs outward-in as the sun climbs (−18 → −12 → −6 → sunrise);
     * evening is the mirror. A missing crossing prints "—", and the flags
     * below turn that into a sentence instead of an unexplained dash. */
    civAm: rng(am6.rise, s.rise), civPm: rng(s.set, am6.set),
    nauAm: rng(am12.rise, am6.rise), nauPm: rng(am6.set, am12.set),
    astAm: rng(am18.rise, am12.rise), astPm: rng(am12.set, am18.set),
    noNaut: !am12.rise, noAstro: !am18.rise,
  };
}
/* ---- "Where the sun is right now" -------------------------------------
 * Every other number on the page is a time — a thing that happens once and is
 * then over. This is the one read-out that is different every time you look,
 * which is exactly what a page about the sun should have: altitude above the
 * horizon, the compass bearing to look along, and which band of daylight or
 * twilight is running. The baked values are stamped for the build minute (so
 * crawlers and no-JS visitors see real numbers, not placeholders) and the
 * browser overwrites them on load and then every 30 seconds.
 * `phase` names the band from altitude alone, which is the same rule the
 * twilight table uses — so the two always agree. */
const SUN_PHASES = [
  [6, "Full daylight", "The sun is well up."],
  [-0.833, "Daylight", "The sun is up, low in the sky."],
  [-6, "Civil twilight", "Below the horizon, but still bright enough to be outside without a light."],
  [-12, "Nautical twilight", "Deeper dusk — the horizon is still faintly visible."],
  [-18, "Astronomical twilight", "Nearly dark; the brightest stars are out."],
  [-90, "Night", "The sun is far below the horizon — full astronomical darkness."],
];
const sunPhaseOf = (alt) => SUN_PHASES.find(([a]) => alt >= a) || SUN_PHASES[SUN_PHASES.length - 1];
/* "Sunrise tomorrow in <city>" — a first-class answer, not row two of a table.
 * Baked so a crawler sees real times, and repainted by the client when the
 * city's local date rolls over (the page already watches for that; see chk()).
 * Deliberately states the delta as well: "tomorrow" queries are usually really
 * "is it getting earlier or later", which one row of a table cannot say. */
function sunTomorrowCard(ssr, city) {
  const t = ssr || {};
  const chg = t.tmwChg;
  const chgTxt = chg == null || chg === 0 ? "the same length as today"
    : `${Math.abs(chg)} minute${Math.abs(chg) === 1 ? "" : "s"} ${chg > 0 ? "longer" : "shorter"} than today`;
  return `  <div class="card sun-tmwcard" id="sun-tomorrow">
    <h2>Sunrise &amp; sunset tomorrow${city ? ` in ${esc(city)}` : ""}</h2>
    <p class="sun-tmwday" id="sun-tmw-day">${esc(t.tmwDay || "")}</p>
    <div class="sun-grid">
      <div class="sun-tile sun-main"><span class="sun-lab">Sunrise tomorrow</span><b id="sun-tmw-rise">${t.tmwRise || "—"}</b></div>
      <div class="sun-tile sun-main"><span class="sun-lab">Sunset tomorrow</span><b id="sun-tmw-set">${t.tmwSet || "—"}</b></div>
      <div class="sun-tile"><span class="sun-lab">Daylight tomorrow</span><b id="sun-tmw-len">${t.tmwLen || "—"}</b></div>
    </div>
    <p class="hint" id="sun-tmw-note">Tomorrow${city ? ` in ${esc(city)}` : ""} the sun rises at <b>${t.tmwRise || "—"}</b> and sets at <b>${t.tmwSet || "—"}</b>${t.tmwLenWords ? ` — ${esc(t.tmwLenWords)} of daylight, ${esc(chgTxt)}` : ""}. Recomputed in your browser, so it is always the next day from now.</p>
  </div>
`;
}

/* The moon line under the sun read-out. Deliberately a SENTENCE, not another
 * stat row: this card is about the sun, and the moon is context for it — most
 * of all at night, when "Night, −34°" is the whole of what the sun has to say.
 * The link is the same /moon/<city>/ page the strip further down points at, so
 * the reader can get there from the place they are actually looking. */
function moonNowLine(v) {
  return v.moonUp
    ? `The moon is up too — <b>${esc(v.moonAlt)}</b> above the horizon in the <b>${esc(v.moonDir)}</b>. <a href="${esc(v.moonUrl || "/moon/")}">Moonrise, moonset and tonight's phase &rarr;</a>`
    : `The moon is below the horizon here right now (<b>${esc(v.moonAlt)}</b>). <a href="${esc(v.moonUrl || "/moon/")}">When it rises, and tonight's phase &rarr;</a>`;
}
function sunNowCard(ssr, orrHtml = "", capHtml = "", tideHtml = "") {
  const n = ssr ? ssr.now : null;
  const v = n ? { ...n, moonUrl: (ssr && ssr.moonUrl) || "/moon/" } : { alt: "—", az: "—", dir: "—", phase: "—", phaseNote: "", stamp: "" };
  return `  <div class="card sun-nowcard">
    <h2 id="sun-now-h2">Where the sun is right now</h2>
    <div class="sun-nowgrid">
    ${/* The same instant, from outside: the sun, the reader's own spot on a
         turning Earth, and the moon around it. It leads the card — it is
         first, on the left — because it is the part that answers "where"; the
         numbers beside it answer "how high", and the explanation (below both)
         follows. It REPLACED a small horizon plot that used to sit here beside
         the stats: that plot showed the same two bodies against a compass
         line, which is what the Direction and Azimuth rows already say in
         words. Markup, painter and stylesheet section are shared with the
         /moon/ city pages — see seo/tools/orrery.mjs. The row layout
         (.sun-nowgrid, 20d-sun2.css) is new: on a wide page the picture alone
         left a band of card background beside it exactly the width these four
         numbers need — same sibling shape as .sun-dial-card/.sun-side above
         it on this page. Below ~700px it wraps to stacked, same as that card. */""
    }${orrHtml}    <div class="sun-nowstats">
      <div class="sun-srow sun-main"><span>Altitude</span><b id="sun-now-alt">${v.alt}</b></div>
      <div class="sun-srow sun-main"><span>Direction</span><b id="sun-now-dir">${v.dir}</b></div>
      <div class="sun-srow"><span>Azimuth</span><b id="sun-now-az">${v.az}</b></div>
      <div class="sun-srow"><span id="sun-now-rowlab">Right now</span><b id="sun-now-phase">${v.phase}</b></div>
    </div>
    </div>
${capHtml}${tideHtml}
    <p class="sun-nowmoon" id="sun-nowmoon">${v.moonAlt ? moonNowLine(v) : ""}</p>
    <p class="hint"><span id="sun-now-note">${esc(v.phaseNote)}</span> Altitude is how far above the horizon the sun sits; azimuth is the compass bearing to look along, measured clockwise from north. ${v.stamp ? `<span id="sun-now-stamp">Shown for ${esc(v.stamp)}; this updates to the live position when the page loads.</span>` : `<span id="sun-now-stamp"></span>`}</p>
  </div>
`;
}
/* the "Golden hour & blue hour + tonight's moon" card, shared by prebuilt city
 * pages (ssr filled) and the anywhere / near-me tools (ssr null → JS fills). */
function goldMoonCard(ssr) {
  const g = ssr || { ghAm: "—", ghPm: "—", blAm: "—", blPm: "—", civAm: "—", civPm: "—", nauAm: "—", nauPm: "—", astAm: "—", astPm: "—", moonSvg: "", moonName: "—", moonPct: "—", moonRise: "—", moonSet: "—", moonUrl: "/moon/" };
  return `  <div class="card sun-gbcard">
    <h2>Twilight, golden hour &amp; blue hour</h2>
    <div class="sun-gb">
      <div class="sun-gbcol"><div class="sun-gbh">Morning</div>
        <div class="sun-srow"><span>Astronomical twilight</span><b id="sun-ast-am">${g.astAm}</b></div>
        <div class="sun-srow"><span>Nautical twilight</span><b id="sun-nau-am">${g.nauAm}</b></div>
        <div class="sun-srow"><span>Civil twilight</span><b id="sun-civ-am">${g.civAm}</b></div>
        <div class="sun-srow"><span>Blue hour</span><b id="sun-bl-am">${g.blAm}</b></div>
        <div class="sun-srow sun-main"><span>Golden hour</span><b id="sun-gh-am">${g.ghAm}</b></div>
      </div>
      <div class="sun-gbcol"><div class="sun-gbh">Evening</div>
        <div class="sun-srow sun-main"><span>Golden hour</span><b id="sun-gh-pm">${g.ghPm}</b></div>
        <div class="sun-srow"><span>Blue hour</span><b id="sun-bl-pm">${g.blPm}</b></div>
        <div class="sun-srow"><span>Civil twilight</span><b id="sun-civ-pm">${g.civPm}</b></div>
        <div class="sun-srow"><span>Nautical twilight</span><b id="sun-nau-pm">${g.nauPm}</b></div>
        <div class="sun-srow"><span>Astronomical twilight</span><b id="sun-ast-pm">${g.astPm}</b></div>
      </div>
    </div>
    <div class="sun-moon">
      <span class="sun-moon-ico" id="sun-moon-ico" aria-hidden="true">${g.moonSvg || ""}</span>
      <span class="sun-moon-txt">Tonight's moon: <b id="sun-moon-name">${esc(g.moonName)}</b>, <b id="sun-moon-pct">${esc(g.moonPct)}</b> lit — rises <b id="sun-moon-rise">${esc(g.moonRise)}</b>, sets <b id="sun-moon-set">${esc(g.moonSet)}</b>. <a href="${esc(g.moonUrl)}">Moonrise, moonset &amp; the phase calendar &rarr;</a></span>
    </div>
    <p class="hint" id="sun-twi-note">The three twilights are just how far the sun is below the horizon: civil to −6° (bright enough to read outside), nautical to −12° (the horizon is still visible at sea), astronomical to −18° (true darkness for stargazing). Golden hour is the warm, low-angle light photographers love, when the sun sits between −4° and +6°; blue hour is the deep-blue band just beyond it, from −6° to −4°. A dash means the sun never gets that low here on this date.</p>
  </div>
`;
}

/* ---- extra solar facts for the crawlable copy (Priority 6): sun direction,
 * the summer↔winter daylight swing, the daily trend, and the next equinox or
 * solstice. Declination is latitude-independent, so the next event is computed
 * once for the whole build; direction and the solstice day-lengths are per
 * city. These make each page's copy genuinely different (by latitude, date and
 * season), not just a swapped city name. ---- */
function sunDecl(date) {
  const rad = Math.PI / 180, dayMs = 86400000, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397;
  const d = date.valueOf() / dayMs - 0.5 + J1970 - J2000, M = rad * (357.5291 + 0.98560028 * d);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  return Math.asin(Math.sin(e) * Math.sin(M + C + rad * 102.9372 + Math.PI));
}
const COMPASS16 = ["north", "north-northeast", "northeast", "east-northeast", "east", "east-southeast", "southeast", "south-southeast", "south", "south-southwest", "southwest", "west-southwest", "west", "west-northwest", "northwest", "north-northwest"];
const compass = (deg) => COMPASS16[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
/* sunrise/sunset compass direction from declination + latitude (geometric
 * horizon — accurate to a point of the compass, which is all the copy needs) */
function riseSetDir(date, lat) {
  const x = Math.sin(sunDecl(date)) / Math.cos(lat * Math.PI / 180);
  if (x < -1 || x > 1) return null;
  const A = Math.acos(x) * 180 / Math.PI;
  return { rise: compass(A), set: compass(360 - A) };
}
/* nearest equinox (declination zero-crossing) or solstice (declination
 * extremum) at or after `now` */
function nextSolarEvent(now) {
  const start = now.getTime(), decAt = (k) => sunDecl(new Date(start + k * 86400000));
  let d0 = decAt(0), d1 = decAt(1);
  for (let k = 1; k < 400; k++) {
    const d2 = decAt(k + 1);
    if ((d1 < 0 && d2 >= 0) || (d1 > 0 && d2 <= 0)) return { kind: "equinox", days: k + 1, ms: start + (k + 1) * 86400000 };
    if ((d1 >= d0 && d1 >= d2) || (d1 <= d0 && d1 <= d2)) return { kind: "solstice", days: k, ms: start + k * 86400000 };
    d0 = d1; d1 = d2;
  }
  return null;
}
/* hemisphere-correct season name for the event (a June solstice is summer in
 * the north, winter in the south) */
function seasonName(ev, lat) {
  if (!ev) return null;
  const north = lat >= 0, mon = new Date(ev.ms).getUTCMonth();
  if (ev.kind === "solstice") return (mon >= 4 && mon <= 7) === north ? "summer solstice" : "winter solstice";
  return (mon >= 1 && mon <= 6) === north ? "spring equinox" : "autumn equinox";
}

/* One fixed instant for the whole build so every page's "today" agrees. */
const BUILD_NOW = new Date();
/* the next equinox/solstice is the same date everywhere — compute it once */
const NEXT_EVENT = nextSolarEvent(BUILD_NOW);

/* Everything the crawlable HTML needs pre-filled for one city, for BUILD_NOW. */
function sunSSR(c) {
  const now = BUILD_NOW;
  const s = nSunCalc(now, c.lat, c.lon, -0.833), tw = nSunCalc(now, c.lat, c.lon, -6);
  const rows = [];
  /* daily-change column (roadmap #10): each day's daylight vs the day before */
  const chgCell = (ms) => { if (ms == null) return "—"; const m = Math.round(ms / 60000); return m === 0 ? "±0 min" : `${m > 0 ? "+" : "−"}${Math.abs(m)} min`; };
  let prevLen = (() => { const y = nSunCalc(new Date(now.getTime() - 86400000), c.lat, c.lon, -0.833); return y.rise ? (y.set - y.rise) : null; })();
  for (let k = 0; k < 7; k++) {
    const d = new Date(now.getTime() + k * 86400000), sk = nSunCalc(d, c.lat, c.lon, -0.833);
    const len = sk.rise ? (sk.set - sk.rise) : null;
    const chg = (len != null && prevLen != null) ? (len - prevLen) : null;
    /* "Fri, Jul 31" is the answer to "sunrise on July 31"; it is not the
       answer to "sunrise tomorrow", which is what people actually type. Naming
       the first two rows puts the word next to the time. */
    const dayCell = k === 0 ? `Today <span class="sun-wd">${dayShortTz(d.getTime(), c.tz)}</span>`
      : k === 1 ? `Tomorrow <span class="sun-wd">${dayShortTz(d.getTime(), c.tz)}</span>`
      : dayShortTz(d.getTime(), c.tz);
    rows.push(`<tr${k === 1 ? ` class="sun-tmw-row"` : ""}><td>${dayCell}</td><td>${sk.rise ? fmtTime(sk.rise, c.tz) : "—"}</td><td>${sk.set ? fmtTime(sk.set, c.tz) : "—"}</td><td>${sk.rise ? lenShort(sk.set - sk.rise) : "—"}</td><td>${chgCell(chg)}</td></tr>`);
    prevLen = len;
  }
  /* daylight change vs yesterday, in whole minutes (a per-day, per-latitude
   * fact that makes each page's copy genuinely different, not just the name) */
  const yest = nSunCalc(new Date(now.getTime() - 86400000), c.lat, c.lon, -0.833);
  const morrow = nSunCalc(new Date(now.getTime() + 86400000), c.lat, c.lon, -0.833);
  let delta = "";
  if (s.rise && yest.rise) {
    const diff = Math.round(((s.set - s.rise) - (yest.set - yest.rise)) / 60000);
    delta = diff === 0 ? "about the same as yesterday"
      : `${Math.abs(diff)} minute${Math.abs(diff) === 1 ? "" : "s"} ${diff > 0 ? "more" : "less"} than yesterday`;
  }
  /* daily trend, smoothed over ±1 day (steadier than a single-day diff) */
  let trendRate = null, trendDir = null;
  if (s.rise && yest.rise && morrow.rise) {
    const rate = Math.round((((morrow.set - morrow.rise) - (yest.set - yest.rise)) / 2) / 60000);
    trendRate = Math.abs(rate); trendDir = rate > 0 ? "longer" : rate < 0 ? "shorter" : "steady";
  }
  /* Annual scan. It used to step every OTHER day, which is fine for finding
   * the extremes but cannot rank today against the year — so it now walks
   * every day and keeps the lengths. A day with no sunrise is not a gap: at
   * high latitude it is either 24 hours of daylight or none, and which one it
   * is decides whether it sorts above or below every ordinary day. Solar noon
   * altitude is what tells them apart. */
  const yr = new Date(now.getTime()).getFullYear(), y0 = Date.UTC(yr, 0, 1);
  const inYear = (dd) => new Date(y0 + dd * 86400000).getUTCFullYear() === yr;
  const dayLen = (t) => {
    const sc = nSunCalc(t, c.lat, c.lon, -0.833);
    if (sc.rise) return sc.set - sc.rise;
    return nSunPos(new Date(sc.noon), c.lat, c.lon).alt > -0.833 ? 86400000 : 0;
  };
  let longest = null, shortest = null;
  const lengths = [];
  for (let dd = 0; dd < 366 && inYear(dd); dd++) {
    const t = new Date(y0 + dd * 86400000 + 12 * 3600000), L = dayLen(t);
    lengths.push(L);
    if (!longest || L > longest.L) longest = { L, ms: t.getTime() };
    if (!shortest || L < shortest.L) shortest = { L, ms: t.getTime() };
  }
  /* today's place in that list. Ranked on exact milliseconds, but ties are
   * counted with a one-minute tolerance: either side of a solstice the
   * neighbouring days differ by seconds, and calling one of them "the 3rd
   * longest" when it is a second off the 4th is false precision. */
  const todayL = dayLen(now);
  const daysLonger = lengths.filter((L) => L > todayL + 60000).length;
  const tied = lengths.filter((L) => Math.abs(L - todayL) <= 60000).length;
  const dayRank = daysLonger + 1;
  const ordinal = (k) => {
    const t2 = k % 100;
    if (t2 >= 11 && t2 <= 13) return k + "th";
    return k + (["th", "st", "nd", "rd"][k % 10] || "th");
  };
  /* days from today to a given instant, in whole local days */
  const daysTo = (ms) => Math.round((ms - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12)) / 86400000);
  const bands = sunBands(now, c.lat, c.lon, c.tz);
  const md = moonIllum(now);
  const dir = riseSetDir(now, c.lat);
  /* next solar event as of the build (roadmap #10): baked absolute time, which
   * the page's JS upgrades to a live "in Xh Ym" countdown for the visitor. */
  let nextLabel = "";
  if (s.rise && s.set) {
    const t = now.getTime();
    if (t < s.rise) nextLabel = `Sunrise at ${fmtTime(s.rise, c.tz)}`;
    else if (t < s.set) nextLabel = `Sunset at ${fmtTime(s.set, c.tz)}`;
    else if (morrow.rise) nextLabel = `Sunrise tomorrow at ${fmtTime(morrow.rise, c.tz)}`;
  }
  /* Tomorrow, as its own set of values rather than row 2 of a table. This is
   * the "sunrise tomorrow in <city>" query, and it was previously answerable
   * only by reading a date off the 7-day table — the word "tomorrow" appeared
   * on the page exactly once, inside a countdown that only renders after
   * sunset, so a crawl at midday saw none of it. */
  const tmwLen = morrow.rise ? morrow.set - morrow.rise : null;
  const todayLen = s.rise ? s.set - s.rise : null;
  const tmwChgMin = (tmwLen != null && todayLen != null) ? Math.round((tmwLen - todayLen) / 60000) : null;
  return {
    hasSun: !!s.rise,
    nextLabel,
    tmwRise: morrow.rise ? fmtTime(morrow.rise, c.tz) : null,
    tmwSet: morrow.set ? fmtTime(morrow.set, c.tz) : null,
    tmwLen: tmwLen != null ? lenShort(tmwLen) : null,
    tmwLenWords: tmwLen != null ? lenWords(tmwLen) : null,
    tmwChg: tmwChgMin,
    tmwDay: dayLongTz(morrow.noon, c.tz),
    /* tomorrow as the city's own calendar date — what ?date= takes */
    tmwYmd: ymdTz(now.getTime() + 86400000, c.tz),
    dialSvg: sunDialSvg(s, tw, c.tz),
    /* nowMs = null: the build's clock isn't the visitor's, so the baked chart
       ships without a "now" marker and the page adds one on load */
    arcSvg: sunArcInner(s, tw, c.tz, c.lat, now.getTime(), null),
    rise: s.rise ? fmtTime(s.rise, c.tz) : "—",
    set: s.set ? fmtTime(s.set, c.tz) : "—",
    noon: fmtTime(s.noon, c.tz),
    dawn: tw.rise ? fmtTime(tw.rise, c.tz) : "—",
    dusk: tw.set ? fmtTime(tw.set, c.tz) : "—",
    len: s.rise ? lenShort(s.set - s.rise) : "Midnight sun / polar night",
    lenWords: s.rise ? lenWords(s.set - s.rise) : "",
    lenAbbr: s.rise ? lenAbbr(s.set - s.rise) : "",
    delta,
    today: dayLongTz(now.getTime(), c.tz),
    ymd: ymdTz(now.getTime(), c.tz),
    weekTable: `<tr><th>Day</th><th>Sunrise</th><th>Sunset</th><th>Day length</th><th>Daily change</th></tr>${rows.join("")}`,
    tzName: tzLongName(c.tz, now),
    dirRise: dir ? dir.rise : null,
    dirSet: dir ? dir.set : null,
    trendRate, trendDir,
    swingWords: longest && shortest && longest.L > shortest.L ? lenWords(longest.L - shortest.L) : null,
    /* today's rank among the year's days. The polar cases get their own
     * sentence: "the 1st longest day" is technically true of every one of
     * Nome's midnight-sun days and tells the reader nothing. */
    rankWords: (() => {
      if (todayL >= 86400000) return `${esc(c.city)} is under midnight sun today — the sun does not set. ${lengths.filter((L) => L >= 86400000).length} days this year are like that.`;
      if (todayL <= 0) return `${esc(c.city)} is in polar night today — the sun does not rise. ${lengths.filter((L) => L <= 0).length} days this year are like that.`;
      if (tied > 3) return `Today is one of ${tied} days this year with the same length of daylight, within a minute of each other.`;
      return `Of the ${lengths.length} days this year, today is the ${ordinal(dayRank)} longest here.`;
    })(),
    solsticeWords: (() => {
      const cands = [[longest, "longest day"], [shortest, "shortest day"]]
        .filter(([e]) => e && daysTo(e.ms) > 0)
        .sort((a, b) => daysTo(a[0].ms) - daysTo(b[0].ms));
      if (!cands.length) return null;
      const [ev, name] = cands[0], d = daysTo(ev.ms);
      return `The ${name} of the year is ${d} day${d === 1 ? "" : "s"} away, on ${mdTz(ev.ms, c.tz)} — ${lenShort(ev.L)} of daylight.`;
    })(),
    nextSeason: seasonName(NEXT_EVENT, c.lat),
    nextDays: NEXT_EVENT ? NEXT_EVENT.days : null,
    nextDateMd: NEXT_EVENT ? mdTz(NEXT_EVENT.ms, c.tz) : "",
    yearNote: longest && shortest
      ? `Longest day: ${mdTz(longest.ms, c.tz)} — ${lenShort(longest.L)} of daylight. Shortest day: ${mdTz(shortest.ms, c.tz)} — ${lenShort(shortest.L)}.`
      : "",
    ghAm: bands.ghAm, ghPm: bands.ghPm, blAm: bands.blAm, blPm: bands.blPm,
    civAm: bands.civAm, civPm: bands.civPm, nauAm: bands.nauAm, nauPm: bands.nauPm,
    astAm: bands.astAm, astPm: bands.astPm,
    now: (() => {
      const p = nSunPos(now, c.lat, c.lon), ph = sunPhaseOf(p.alt);
      /* The moon, in the same card. This read-out is at its least interesting
         exactly when the sun is down — "Night, −34°" and nothing else — and
         that is when the other thing in the sky is worth naming. Same
         coordinates, same instant, one line. */
      const mp = moonPos(now.getTime(), c.lat, c.lon);   /* already in degrees, az from north */
      return { alt: `${p.alt.toFixed(1)}\u00b0`, az: `${p.az.toFixed(1)}\u00b0`,
        dir: compass(p.az), phase: ph[1], phaseNote: ph[2],
        moonUp: mp.alt > 0, moonAlt: `${mp.alt.toFixed(1)}\u00b0`, moonDir: compass(mp.az),
        stamp: fmtTime(now.getTime(), c.tz) };
    })(),
    moonSvg: moonGlyph(md.fraction, md.waxing, 22, c.lat < 0), moonName: moonName(md.phase), moonPct: `${Math.round(md.fraction * 100)}%`,
    /* moonrise/moonset for the city's own calendar day (the /moon/ twin shows
       the full week; this is the one-line answer with a link through) */
    ...(() => { const mt = moonTimes(mnDayStart(now.getTime(), c.tz), c.lat, c.lon); return {
      moonRise: mt.rise ? fmtTime(mt.rise, c.tz) : (mt.alwaysUp ? "up all day" : "—"),
      moonSet: mt.set ? fmtTime(mt.set, c.tz) : (mt.alwaysDown ? "down all day" : "—"),
      moonUrl: `/moon/${c.slug}/`,
    }; })(),
  };
}

/* search index served at /sun/cities.json — same tuple shape as the hub's
 * inline LIST so the client code can use either interchangeably:
 * [slug, label, tz, lat, lon]. US labels carry ", ST" (that's what the
 * state-aware search matches on); aliased cities point at the curated slug. */
const SEARCH_INDEX = [
  ...US_RAW.map((e) => [e.slug || e.alias, `${e.city}, ${e.st}`, e.tz, e.lat, e.lon]),
  ...SUN_CITIES.filter((c) => c.area !== "USA").map((c) => [c.slug, c.city, c.tz, c.lat, c.lon]),
  /* Curated US cities that are NOT in the census top 1,000 — Bar Harbor, Key
     West, Sedona, Nome. They have permanent pages, but the loaded index
     REPLACES the inline list, so once it arrived, searching "Bar Harbor" fell
     through to the Open-Meteo geocoder and /sun/anywhere/ (and on moon pages
     the result visibly vanished from the dropdown as the index loaded) even
     though the page existed all along. */
  ...SUN_CITIES.filter((c) => c.area === "USA" && !US_RAW.some((e) => (e.slug || e.alias) === c.slug))
    .map((c) => [c.slug, c.st ? `${c.city}, ${c.st}` : c.city, c.tz, c.lat, c.lon]),
];

/* full state names -> abbreviations, inlined into the search JS so typing
 * "oregon" (or "or") can list that state's cities */
const STATE_ABBR = Object.fromEntries(SUN_STATES.map((s) => [s.state, s.st]));

/* ---- the day's sun arc + twilight rail (the card above the dial) ----
 * ONE implementation, used two ways: the build evals this source to server-
 * render the SVG into the HTML (so crawlers and no-JS visitors get a real
 * chart), and the same source ships to the browser to redraw it for the
 * visitor's own date, any date they pick, and a live "now" marker. It's a pure
 * string-in/string-out function with no DOM, which is what lets one copy do
 * both — unlike the dial, which needs a hand-written Node twin.
 *
 * Two rows, which is what makes it taller than a plain arc:
 *   1. the sun's real ALTITUDE curve through the local day (not a decorative
 *      bezier) — it passes exactly through −0.833° at the same sunrise/sunset
 *      the rest of the page prints, because it's the same solar geometry, and
 *      its shape flattens with latitude and season the way the real sun does.
 *      The peak is labelled with solar noon and how high the sun actually gets.
 *   2. a full-day twilight rail: night → first light → daylight → last light →
 *      night, so dawn and dusk read as their own span rather than two more
 *      ticks on the arc.
 * S/TW are sunCalc results at −0.833° and −6°; lat in degrees; dateMs any
 * instant inside the day being drawn; nowMs the live clock, or null for no
 * marker (the build passes null — build time isn't the visitor's time). */
const ARC_JS = `
function sunArcInner(S,TW,tz,lat,dateMs,nowMs){
  var X0=32,X1=608,TOP=20,HZ=132,DIP=152,RT=172,RB=190,rad=Math.PI/180;
  function fmt(ms){ try{ return new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',minute:'2-digit'}).format(new Date(ms)); }catch(e){ return '—'; } }
  function hod(ms){ try{ var p=new Intl.DateTimeFormat('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ms)).split(':'); return +p[0]+p[1]/60; }catch(e){ return 12; } }
  /* solar declination for the day — same series sunCalc uses for the times */
  var dd=new Date(dateMs).valueOf()/86400000-0.5+2440588-2451545;
  var M=rad*(357.5291+0.98560028*dd);
  var Lc=M+rad*(1.9148*Math.sin(M)+0.02*Math.sin(2*M)+0.0003*Math.sin(3*M))+rad*102.9372+Math.PI;
  var dec=Math.asin(Math.sin(rad*23.4397)*Math.sin(Lc)), phi=rad*lat, hN=hod(S.noon);
  /* altitude in degrees at local hour h — it passes exactly through −0.833° at
     the sunrise and sunset the rest of the page prints, because it is the same
     geometry those times come from */
  function alt(h){ return Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(2*Math.PI*(h-hN)/24))/rad; }
  /* Where the day starts on the axis. Normally midnight, which is what people
     expect. But where the clock sits far from the sun — Nome in July sets at
     12:31 AM — a midnight-to-midnight axis chops the daylight in two and parks
     the halves at opposite ends of the chart. When the day's events stop
     falling in order, the window re-centres on solar noon (rounded to a whole
     hour, so the axis labels stay on the hour) and the daylight reads as one
     continuous band. */
  var evs=[TW.rise,S.rise,S.set,TW.set],hh=[],q,wraps=false;
  for(q=0;q<evs.length;q++) if(evs[q]) hh.push(hod(evs[q]));
  for(q=1;q<hh.length;q++) if(hh[q]<hh[q-1]) wraps=true;
  var h0=wraps?((Math.round(hN)-12)%24+24)%24:0;
  function U(h){ return ((h-h0)%24+24)%24; }                 /* clock hour → hours into the window */
  function XU(u){ return +(X0+(u/24)*(X1-X0)).toFixed(1); }  /* hours into the window → x */
  function X(h){ return XU(U(h)); }
  var peak=alt(hN),PK=TOP+24;
  /* height is drawn on a true 0–90° scale, so a June arc in Miami towers over a
     December one in Seattle instead of both filling the panel — the shape is
     part of the information. Below the horizon the scale compresses (0 to −18°
     in 20px) so the night dip stays a hint, not half the chart. */
  function Y(a){ return +(a>=0 ? HZ-(Math.min(a,90)/90)*(HZ-PK) : HZ+Math.min(-a,18)/18*(DIP-HZ)).toFixed(1); }
  function sunGlyph(x,y){ var g='<g transform="translate('+x+' '+y+')"><circle r="5" fill="#fcd34d"/>',k,a;
    for(k=0;k<8;k++){ a=k*Math.PI/4; g+='<line x1="'+(6.8*Math.cos(a)).toFixed(1)+'" y1="'+(6.8*Math.sin(a)).toFixed(1)+'" x2="'+(9.4*Math.cos(a)).toFixed(1)+'" y2="'+(9.4*Math.sin(a)).toFixed(1)+'" stroke="#fcd34d" stroke-width="1.5" stroke-linecap="round"/>'; }
    return g+'</g>'; }
  /* every label carries a dark outline (paint-order puts the stroke behind the
     glyphs) so it stays readable wherever it lands — over the gold fill, the
     curve, or the live sun riding it */
  function txt(x,y,anchor,size,fill,weight,s,cls){ return '<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="'+size+'" fill="'+fill+'" paint-order="stroke" stroke="#12172b" stroke-width="3.5" stroke-linejoin="round"'+(weight?' font-weight="'+weight+'"':'')+(cls?' class="'+cls+'"':'')+'>'+s+'</text>'; }
  /* two wordings of the same label — the long one on wide screens, the short
     one on phones, where the chart is scaled down to fit and CSS swaps them
     (a presentation attribute loses to a stylesheet rule, so the media query
     can also bump these back up to a legible size) */
  function two(long,short,time){ return '<tspan class="sun-aL">'+long+'</tspan><tspan class="sun-aS">'+short+'</tspan>'+time; }
  /* a label beside a point. Labels may run into the 32px margins either side of
     the panel (the viewBox is wider than the plot); they only flip to the other
     side of the point when they'd leave the chart entirely. */
  function side(x,y,right,s,size,fill,weight,cls){ var a=right?'start':'end', xx=x+(right?9:-9);
    if(right&&xx>540){ a='end'; xx=x-9; } if(!right&&xx<100){ a='start'; xx=x+9; }
    return txt(xx.toFixed(1),y,a,size,fill,weight,s,cls); }

  var out='<defs>'
    +'<linearGradient id="sunArcG" x1="0" y1="'+TOP+'" x2="0" y2="'+HZ+'" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fcd34d" stop-opacity=".40"/><stop offset="1" stop-color="#fcd34d" stop-opacity=".04"/></linearGradient>'
    +'<linearGradient id="sunTwA" x1="0" x2="1"><stop offset="0" stop-color="#141c3a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>'
    +'<linearGradient id="sunTwB" x1="0" x2="1"><stop offset="0" stop-color="#f59e0b"/><stop offset="1" stop-color="#141c3a"/></linearGradient>'
    +'<clipPath id="sunRailC"><rect x="'+X0+'" y="'+RT+'" width="'+(X1-X0)+'" height="'+(RB-RT)+'" rx="9"/></clipPath></defs>';
  out+='<rect x="'+X0+'" y="'+TOP+'" width="'+(X1-X0)+'" height="'+(DIP-TOP)+'" rx="10" fill="#12172b"/>';
  out+='<rect x="'+X0+'" y="'+HZ+'" width="'+(X1-X0)+'" height="'+(DIP-HZ)+'" fill="#0a0f22"/>';
  for(var g=6;g<24;g+=6) out+='<line x1="'+XU(g)+'" y1="'+TOP+'" x2="'+XU(g)+'" y2="'+DIP+'" stroke="rgba(148,163,184,.13)" stroke-width="1"/>';

  /* sample the altitude across the local day, then split into above/below-
     horizon runs so each can be drawn in its own style (and so midnight sun,
     polar night and a sunset after midnight all fall out for free) */
  var pts=[],i,u,a;
  for(i=0;i<=96;i++){ u=i*0.25; a=alt(h0+u); pts.push([XU(u),Y(a),a]); }
  var runs=[],cur=null;
  for(i=0;i<pts.length;i++){ var up=pts[i][2]>=0;
    if(!cur||cur.up!==up){ cur={up:up,p:[]}; runs.push(cur); if(i>0) cur.p.push(pts[i-1]); }
    cur.p.push(pts[i]); }
  for(i=0;i<runs.length;i++){
    var r=runs[i],dPath='',k;
    for(k=0;k<r.p.length;k++) dPath+=(k?'L':'M')+r.p[k][0]+' '+r.p[k][1]+' ';
    /* a daylight run is one path doing two jobs: stroked as the curve, and
       filled as the area under it — an open path fills as if closed, and the
       closing chord runs between the two horizon crossings, i.e. along the
       horizon. Saves emitting the whole curve twice on every page. */
    out+=r.up
      ? '<path d="'+dPath+'" fill="url(#sunArcG)" stroke="#fcd34d" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<path d="'+dPath+'" fill="none" stroke="#64748b" stroke-width="1.6" stroke-dasharray="4 5" opacity=".6" stroke-linecap="round"/>';
  }
  out+='<line x1="'+X0+'" y1="'+HZ+'" x2="'+X1+'" y2="'+HZ+'" stroke="rgba(148,163,184,.5)" stroke-width="1"/>';

  /* the live sun goes on before the labels so the text sits on top of it */
  var hn=null;
  if(nowMs!=null){ hn=hod(nowMs); var an=alt(hn);
    out+=an>=0?sunGlyph(X(hn),Y(an)):'<circle cx="'+X(hn)+'" cy="'+Y(an)+'" r="3.6" fill="#cbd5e1"/>'; }

  var hasSun=!!(S.rise&&S.set), hr=hasSun?hod(S.rise):null, hs=hasSun?hod(S.set):null;
  if(hasSun){
    out+='<circle cx="'+X(hr)+'" cy="'+HZ+'" r="4.5" fill="#fcd34d" stroke="#12172b" stroke-width="1.5"/>';
    out+='<circle cx="'+X(hs)+'" cy="'+HZ+'" r="4.5" fill="#fcd34d" stroke="#12172b" stroke-width="1.5"/>';
    /* labels sit on the NIGHT side of each dot, where the panel is empty —
       inside the arc they'd land on the curve. side() flips them back in only
       when a very early rise or late set would push them off the chart. */
    out+=side(X(hr),HZ-11,false,two('Sunrise ','',fmt(S.rise)),12,'#e2e8f0','700');
    out+=side(X(hs),HZ-11,true,two('Sunset ','',fmt(S.set)),12,'#e2e8f0','700');
  } else {
    out+=txt(320,TOP+16,'middle',12,'#94a3b8','700',peak>-0.833?'Midnight sun — the sun never sets today':'Polar night — the sun never rises today');
  }
  var py=Y(peak);
  out+=sunGlyph(X(hN),py);
  out+=txt(X(hN),Math.max(py-17,TOP+9).toFixed(1),'middle',11,'#94a3b8','',two(hasSun?'Solar noon ':'Highest ',hasSun?'Noon ':'Peak ',fmt(S.noon))+' · '+two('sun ','',Math.round(peak)+'° high'),'sun-pk');

  /* row 2 — the twilight rail: night, first light, daylight, last light, night */
  out+='<rect x="'+X0+'" y="'+RT+'" width="'+(X1-X0)+'" height="'+(RB-RT)+'" rx="9" fill="#0a0f22" stroke="rgba(148,163,184,.25)"/>';
  /* segments are placed in window hours, so a span that runs past the window's
     end simply splits and continues at the left edge */
  function seg(a1,a2,fill){ if(a1==null||a2==null) return '';
    var u1=U(a1),u2=U(a2);
    if(u2<u1) return segU(u1,24,fill)+segU(0,u2,fill);
    return segU(u1,u2,fill); }
  function segU(u1,u2,fill){ if(XU(u2)-XU(u1)<0.4) return '';
    return '<rect x="'+XU(u1)+'" y="'+RT+'" width="'+(XU(u2)-XU(u1)).toFixed(1)+'" height="'+(RB-RT)+'" fill="'+fill+'" clip-path="url(#sunRailC)"/>'; }
  var hd=TW.rise?hod(TW.rise):null, hk=TW.set?hod(TW.set):null;
  out+=seg(hd,hr,'url(#sunTwA)')+seg(hr,hs,'#fbbf24')+seg(hs,hk,'url(#sunTwB)');
  if(!hasSun&&peak>-0.833) out+=segU(0,24,'#fbbf24');
  /* far north in summer, last light lands after midnight — i.e. at the LEFT end
     of the same day, right next to first light. Stack the two labels when that
     happens instead of printing them over each other. */
  var stack=(hd!=null&&hk!=null&&Math.abs(X(hk)-X(hd))<200);
  if(hd!=null){ out+='<line x1="'+X(hd)+'" y1="'+(RT-4)+'" x2="'+X(hd)+'" y2="'+(RB+4)+'" stroke="#93c5fd" stroke-width="1.4"/>';
    out+=side(X(hd),RT-9,false,two('First light ','First ',fmt(TW.rise)),11,'#93c5fd','700'); }
  if(hk!=null){ out+='<line x1="'+X(hk)+'" y1="'+(RT-4)+'" x2="'+X(hk)+'" y2="'+(RB+4)+'" stroke="#93c5fd" stroke-width="1.4"/>';
    out+=side(X(hk),stack?RT-23:RT-9,true,two('Last light ','Last ',fmt(TW.set)),11,'#93c5fd','700'); }
  /* axis labels follow the window, so a noon-centred chart reads 3 AM … 3 AM */
  for(i=0;i<=24;i+=6){ var ah=(h0+i)%24, ap=ah<12?' AM':' PM', a12=ah%12; if(a12===0) a12=12;
    out+=txt(XU(i),RB+16,'middle',9.5,'#7c88a8','',a12+ap,'sun-ax'); }

  /* the "now" hairline goes on last so it reads across both rows */
  if(hn!=null) out+='<line x1="'+X(hn)+'" y1="'+TOP+'" x2="'+X(hn)+'" y2="'+RB+'" stroke="rgba(226,232,240,.4)" stroke-width="1" stroke-dasharray="3 4"/>';
  return out;
}`;
/* build-time instance of the very same source the browser gets */
const sunArcInner = new Function(`${ARC_JS}\nreturn sunArcInner;`)();

/* the arc card itself — prebuilt city pages pass their ssr; the /sun/anywhere/
 * and /sun/near-me/ tools pass null and the page JS fills it on load. */
function sunArcCard(ssr, place, slug = null) {
  const a = ssr || {};
  /* The pointer to tomorrow is now a real URL, not an in-page anchor: it loads
   * this same page with tomorrow's date already selected, so everything on it —
   * dial, arc, twilight bands, 7-day table — is showing the day the reader
   * asked for rather than jumping them to one card about it. ?date= is read
   * back by the page JS below.
   * The page's canonical stays the clean URL, so the dated variants consolidate
   * into it rather than competing with it. The href is baked from the build's
   * tomorrow and re-set by paintTomorrow() from the VISITOR's tomorrow, which
   * can already be a different date at 11pm local. */
  const tmwHref = slug && a.tmwYmd ? `/sun/${slug}/?date=${a.tmwYmd}` : "#sun-tomorrow";
  /* The heading carries the date (it follows the date picker), then one fact
   * per line: how long the day is, what the sun does next, and the two times.
   * #sun-next is the live countdown that used to sit under the H1. */
  return `  <div class="card sun-arccard">
    <h2>Daylight${place ? ` in ${esc(place)}` : ""} <input type="date" class="sun-hdate" id="sun-date2" aria-label="Pick any date"${a.ymd ? ` value="${a.ymd}"` : ""}></h2>
    <p class="sun-arcbar"><b id="sun-arc-len">${a.lenWords || "—"}</b> of daylight</p>
    <p class="sun-next" id="sun-next">${a.nextLabel ? `Next: ${a.nextLabel}` : ""}</p>
    <p class="sun-arctimes">Sunrise <b id="sun-arc-rise">${a.rise || "—"}</b> <span class="sun-arcsep">·</span> Sunset <b id="sun-arc-set">${a.set || "—"}</b></p>
    <svg id="sun-arc" viewBox="0 0 640 216" role="img" aria-label="The sun's path through the day: sunrise, solar noon, sunset, and the first-light to last-light band">${a.arcSvg || ""}</svg>
    <p class="hint">The curve is how high the sun climbs through the day; the band beneath it runs from first light to last light.</p>
    ${/* By mid-afternoon today's sunrise has already happened and the number
         people actually want is tomorrow's. The page has always answered that
         further down; this is the pointer, with the time itself in the link so
         it is useful without the click. */""
    }<p class="sun-tmwlink"><a href="${tmwHref}" id="sun-tmwlink-a"${slug ? ` data-sun-base="/sun/${slug}/"` : ""}>Tomorrow's sunrise${place ? ` in ${esc(place)}` : ""} &middot; <b id="sun-tmwlink-rise">${a.tmwRise || "—"}</b> &rarr;</a></p>
  </div>
`;
}

/* everything on a sun page that depends only on the runtime constant C
 * ({lat,lon,tz}): stat rows, dial, any-date picker, 7-day table, annual
 * chart. Shared verbatim by the prebuilt city pages and /sun/anywhere/. */
const PAGE_BODY_JS = `
  ${SUN_JS}
  ${SUNPOS_JS}
  ${MOON_CORE}
  ${ORRERY_JS}
  ${ARC_JS}
  /* ---- the live sun position. Same phase thresholds as the build-time
     SUN_PHASES table, in the same order, so the baked copy and the live one
     can never disagree about which twilight is running. ---- */
  var SUN_PHASES=[[6,'Full daylight','The sun is well up.'],
    [-0.833,'Daylight','The sun is up, low in the sky.'],
    [-6,'Civil twilight','Below the horizon, but still bright enough to be outside without a light.'],
    [-12,'Nautical twilight','Deeper dusk — the horizon is still faintly visible.'],
    [-18,'Astronomical twilight','Nearly dark; the brightest stars are out.'],
    [-90,'Night','The sun is far below the horizon — full astronomical darkness.']];
  /* The whole card is drawn for ONE instant, and the control under the picture
     owns which one: live by default, or whatever date and time the reader set.
     Everything here therefore reads orrWhen() rather than Date.now() — a card
     whose picture showed next October under an altitude row still labelled
     "right now" would be worse than having no control at all. */
  function sunNowPaint(){
    var box=document.getElementById('sun-now-alt'); if(!box) return;
    var t=orrWhen(), live=orrLive();
    var p=sunPosition(new Date(t),C.lat,C.lon), i, ph=SUN_PHASES[SUN_PHASES.length-1];
    for(i=0;i<SUN_PHASES.length;i++){ if(p.alt>=SUN_PHASES[i][0]){ ph=SUN_PHASES[i]; break; } }
    put('sun-now-alt',p.alt.toFixed(1)+'\\u00b0');
    put('sun-now-az',p.az.toFixed(1)+'\\u00b0');
    put('sun-now-dir',sunCompassLong(p.az));
    put('sun-now-phase',ph[1]);
    put('sun-now-note', live?ph[2]:('At the time shown, '+ph[2].charAt(0).toLowerCase()+ph[2].slice(1)));
    /* the baked stamp said "shown for 2:14 PM"; once we are live it is simply now */
    put('sun-now-stamp','');
    /* Heading and row label follow the instant too. These two lines are the
       difference between a read-out and a claim about the present. */
    var h2=document.getElementById('sun-now-h2');
    if(h2) h2.textContent = live ? 'Where the sun is right now'
      : (t>Date.now()+60000 ? 'Where the sun will be' : 'Where the sun was');
    put('sun-now-rowlab', live?'Right now':'At that time');
    /* the moon line, live from the same instant — mnPos already ships in this
       controller for the moonrise/moonset rows, so this costs no extra code */
    var ml=document.getElementById('sun-nowmoon');
    if(ml){ var mp=mnPos(t,C.lat,C.lon), href=ml.querySelector('a');
      var url=(href&&href.getAttribute('href'))||'/moon/';
      ml.innerHTML = mp.alt>0
        ? 'The moon is up too — <b>'+mp.alt.toFixed(1)+'\u00b0</b> above the horizon in the <b>'+mnCompass(mp.az)+'</b>. <a href="'+url+'">Moonrise, moonset and tonight\u2019s phase &rarr;</a>'
        : 'The moon is below the horizon here '+(live?'right now':'at that time')+' (<b>'+mp.alt.toFixed(1)+'\u00b0</b>). <a href="'+url+'">When it rises, and tonight\u2019s phase &rarr;</a>'; }
    /* and the view from outside — same instant, same series (orrery.mjs) */
    orrPaint(t,C.lat,C.lon,C.city||'',C.tz);
  }
  /* The control under the picture owns the instant for the WHOLE page. Move the
     time of day and only this card repaints (the day's own facts have not
     changed); move the day and the page follows — dial, arc, twilight bands,
     7-day table, the answer sentence — because a page showing two different
     days at once is exactly the confusion the control is meant to remove. */
  orrOnChange(function(dayChanged){
    sunNowPaint();
    if(dayChanged&&goToDate) goToDate(orrDayOf(orrWhen(),C.tz));
  });
  /* ...and the reverse: the page's own date pickers move the instant with them,
     keeping the time of day, so the two controls can never disagree. Picking
     today hands the picture back to the live clock. */
  function orrFromDate(v){
    var tz=C.tz;
    if(v===orrDayOf(Date.now(),tz)){ orrSet(null,false); return; }
    var t=orrParse(v+'T'+orrLocalValue(orrWhen(),tz).slice(11),tz);
    if(t!=null) orrSet(t,false);
  }
  function hm(ms){ try{ return new Intl.DateTimeFormat('en-US',{timeZone:C.tz,hour:'numeric',minute:'2-digit'}).format(new Date(ms)); }catch(e){ return '—'; } }
  function dur(ms){ var m=Math.round(ms/60000); return Math.floor(m/60)+' h '+(m%60)+' m'; }
  function dayLabel(ms){ try{ return new Intl.DateTimeFormat('en-US',{timeZone:C.tz,weekday:'short',month:'short',day:'numeric'}).format(new Date(ms)); }catch(e){ return ''; } }
  function dayLong(ms){ try{ return new Intl.DateTimeFormat('en-US',{timeZone:C.tz,weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(new Date(ms)); }catch(e){ return ''; } }
  function lenWords(ms){ var m=Math.round(ms/60000),h=Math.floor(m/60),mm=m%60; return h+' hour'+(h===1?'':'s')+' '+mm+' minute'+(mm===1?'':'s'); }
  function put(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }
  /* golden hour (sun −4°→+6°) & blue hour (−6°→−4°): morning & evening ranges */
  function sunBands(d,lat,lon){ var a6=sunCalc(d,lat,lon,6),am4=sunCalc(d,lat,lon,-4),am6=sunCalc(d,lat,lon,-6);
    var am12=sunCalc(d,lat,lon,-12), am18=sunCalc(d,lat,lon,-18), s0=sunCalc(d,lat,lon,-0.833);
    function rng(a,b){ return (a&&b&&b>a)?(hm(a)+' – '+hm(b)):'—'; }
    return { ghAm:rng(am4.rise,a6.rise), ghPm:rng(a6.set,am4.set), blAm:rng(am6.rise,am4.rise), blPm:rng(am4.set,am6.set),
      civAm:rng(am6.rise,s0.rise), civPm:rng(s0.set,am6.set),
      nauAm:rng(am12.rise,am6.rise), nauPm:rng(am6.set,am12.set),
      astAm:rng(am18.rise,am12.rise), astPm:rng(am12.set,am18.set) }; }
  /* Moon illumination + glyph now come from the shared MOON_CORE inlined
     above (seo/tools/moon.mjs), not a local copy — the whole point of that
     module is that /moon/, /sun/ and /tides/ can't drift apart on what phase
     it is. The glyph mirrors below the equator, which the local copy didn't. */
  function updateMoon(){ var m=mnIllum(Date.now()), ico=document.getElementById('sun-moon-ico');
    if(ico) ico.innerHTML=mnGlyph(m.fraction,m.waxing,22,C.lat<0); put('sun-moon-name',mnName(m.phase)); put('sun-moon-pct',Math.round(m.fraction*100)+'%');
    /* moonrise/moonset for the city's local day (mnTimes is in MOON_CORE above) */
    var mp=new Intl.DateTimeFormat('en-GB',{timeZone:C.tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).split(':');
    var mds=Date.now()-(+mp[0]*3600+ +mp[1]*60)*1000-(Date.now()%60000), mt=mnTimes(mds,C.lat,C.lon);
    put('sun-moon-rise', mt.rise?hm(mt.rise):(mt.alwaysUp?'up all day':'—'));
    put('sun-moon-set', mt.set?hm(mt.set):(mt.alwaysDown?'down all day':'—')); }
  /* the arc card above the dial: its stat line + the two-row chart. The live
     "now" marker only means anything on today, so other dates draw without it
     (and so does the baked server-rendered copy). */
  var arcToday=true, updNext=function(){};   /* set by the countdown block below */
  var setDates=function(){};                 /* set by the date-picker block below */
  var goToDate=null;                         /* ditto: jump the page to a YYYY-MM-DD */
  /* the answer sentence as the build wrote it, so returning to today restores
     the exact markup renderFor() fills in rather than a rebuilt copy */
  var ANSWER0=(document.getElementById('sun-answer')||{}).innerHTML||'';
  function esc0(x){ return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function paintArc(d,isToday,s2,tw2){
    arcToday=isToday;
    put('sun-arc-len', s2.rise?lenWords(s2.set-s2.rise):'Midnight sun / polar night');
    put('sun-arc-rise', s2.rise?hm(s2.rise):'—');
    put('sun-arc-set', s2.set?hm(s2.set):'—');
    /* the countdown only means anything on today; on any other date the row
       says which day is being shown instead of ticking toward nothing */
    var nx=document.getElementById('sun-next');
    if(nx&&!isToday) nx.textContent='Showing '+dayLabel(d.getTime());
    if(isToday) updNext();
    var el=document.getElementById('sun-arc'); if(!el) return;
    el.innerHTML=sunArcInner(s2,tw2,C.tz,C.lat,d.getTime(),isToday?Date.now():null);
  }
  /* keep the sun riding the curve while the tab is open (today only) */
  (function(){ if(!document.getElementById('sun-arc')) return;
    setInterval(function(){ if(!arcToday) return; var t=new Date();
      paintArc(t,true,sunCalc(t,C.lat,C.lon,-0.833),sunCalc(t,C.lat,C.lon,-6)); },60000); })();

  var now=new Date();
  var s=sunCalc(now,C.lat,C.lon,-0.833), tw=sunCalc(now,C.lat,C.lon,-6);
  /* stats + dial for any chosen date (the dropdown below the dial) */
  function renderFor(d,isToday){
    var s2=sunCalc(d,C.lat,C.lon,-0.833), tw2=sunCalc(d,C.lat,C.lon,-6);
    if(s2.rise){ put('sun-rise',hm(s2.rise)); put('sun-set',hm(s2.set)); put('sun-len',dur(s2.set-s2.rise)); }
    else { put('sun-rise','—'); put('sun-set','—'); put('sun-len','Midnight sun / polar night'); }
    put('sun-noon',hm(s2.noon));
    put('sun-dawn', tw2.rise?hm(tw2.rise):'—');
    put('sun-dusk', tw2.set?hm(tw2.set):'—');
    var bands=sunBands(d,C.lat,C.lon);
    put('sun-gh-am',bands.ghAm); put('sun-gh-pm',bands.ghPm); put('sun-bl-am',bands.blAm); put('sun-bl-pm',bands.blPm);
    put('sun-civ-am',bands.civAm); put('sun-civ-pm',bands.civPm);
    put('sun-nau-am',bands.nauAm); put('sun-nau-pm',bands.nauPm);
    put('sun-ast-am',bands.astAm); put('sun-ast-pm',bands.astPm);
    paintArc(d,isToday,s2,tw2);
    if(isToday) updateMoon();
    /* The answer-first sentence. On today it is refreshed in place (the build
       baked yesterday-or-today's values into it for crawlers). On any other
       date it is REWRITTEN to name that date: a page reached by the tomorrow
       link, showing tomorrow in every card, must not still open with a line
       that says "today" — that is the contradiction the date link would
       otherwise create on the most-read line of the page. */
    var ansEl=document.getElementById('sun-answer');
    if(ansEl&&!isToday){
      var dl=dayLong(d.getTime()), city=esc0(C.city||'this location');
      ansEl.innerHTML = s2.rise
        ? 'On <b>'+esc0(dl)+'</b> the sun rises in '+city+' at <b>'+hm(s2.rise)+'</b> and sets at <b>'+hm(s2.set)+'</b>, giving <b>'+lenWords(s2.set-s2.rise)+'</b> of daylight. First light is at <b>'+(tw2.rise?hm(tw2.rise):'—')+'</b>, last light at <b>'+(tw2.set?hm(tw2.set):'—')+'</b>, and solar noon at <b>'+hm(s2.noon)+'</b>.'
        : 'On <b>'+esc0(dl)+'</b> '+city+' has no ordinary sunrise or sunset — at this latitude the sun stays continuously above or below the horizon. Solar noon is <b>'+hm(s2.noon)+'</b>.';
    }
    if(isToday){
      if(ansEl&&ANSWER0) ansEl.innerHTML=ANSWER0;
      put('sun-a-rise', s2.rise?hm(s2.rise):'—');
      put('sun-a-set', s2.set?hm(s2.set):'—');
      put('sun-a-noon', hm(s2.noon));
      put('sun-a-len', s2.rise?lenWords(s2.set-s2.rise):'—');
      put('sun-a-dawn', tw2.rise?hm(tw2.rise):'—');
      put('sun-a-dusk', tw2.set?hm(tw2.set):'—');
      var yd=sunCalc(new Date(d.getTime()-86400000),C.lat,C.lon,-0.833);
      if(s2.rise&&yd.rise){ var df=Math.round(((s2.set-s2.rise)-(yd.set-yd.rise))/60000);
        put('sun-a-delta', df===0?'about the same as yesterday':(Math.abs(df)+' minute'+(Math.abs(df)===1?'':'s')+' '+(df>0?'more':'less')+' than yesterday')); }
    }
    drawDial(s2,tw2,C.tz,document.getElementById('sun-dial'),{noteEl:document.getElementById('sun-dial-note'),hand:isToday,live:isToday});
    var note=document.getElementById('sun-dial-note');
    if(note&&!isToday) note.textContent=note.textContent.replace(' The hand shows the time there right now.',' Showing '+dayLabel(d.getTime())+'.');
  }
  /* TWO date pickers now — one in the daylight card's heading, one under the
     dial — and they are the same control: changing either moves both and
     redraws everything once. */
  var dateEls=[document.getElementById('sun-date2'),document.getElementById('sun-date')].filter(Boolean);
  if(dateEls.length){
    /* the picker accepts ANY date; sun math is valid for centuries either way */
    function ymdTz(ms){ return new Intl.DateTimeFormat('en-CA',{timeZone:C.tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms)); }
    function hodTz2(ms){ var p=new Intl.DateTimeFormat('en-GB',{timeZone:C.tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ms)).split(':'); return +p[0]+p[1]/60; }
    /* an instant near local noon of the picked calendar day in the CITY's zone */
    function cityNoon(ymd){ var pp=ymd.split('-'), guess=Date.UTC(+pp[0],+pp[1]-1,+pp[2],12,0,0);
      var off=hodTz2(guess)-12; var t=guess-off*3600e3;
      if(ymdTz(t)!==ymd){ t+= (ymdTz(t)<ymd?86400e3:-86400e3)/2; }
      return new Date(t); }
    setDates=function(v){ for(var i=0;i<dateEls.length;i++) if(dateEls[i].value!==v) dateEls[i].value=v; };
    goToDate=function(v){ setDates(v); renderFor(cityNoon(v), v===ymdTz(now.getTime())); };
    setDates(ymdTz(now.getTime()));
    dateEls.forEach(function(el){ el.min='1900-01-01'; el.max='2099-12-31';
      el.addEventListener('change',function(){ if(!el.value) return;
        setDates(el.value);
        renderFor(cityNoon(el.value), el.value===ymdTz(now.getTime()));
        orrFromDate(el.value); }); });
  }
  put('sun-today', dayLong(now.getTime()));
  /* 7-day table (rebuilt on midnight rollover) */
  function chgCell(ms){ if(ms==null) return '—'; var m=Math.round(ms/60000); return m===0?'\\u00b10 min':(m>0?'+':'\\u2212')+Math.abs(m)+' min'; }
  function buildWeek(){
    var rows='';
    var yw=sunCalc(new Date(now.getTime()-86400000),C.lat,C.lon,-0.833);
    var prevLen=yw.rise?(yw.set-yw.rise):null;
    for(var k=0;k<7;k++){
      var d=new Date(now.getTime()+k*86400000), sk=sunCalc(d,C.lat,C.lon,-0.833);
      var len=sk.rise?(sk.set-sk.rise):null, chg=(len!=null&&prevLen!=null)?(len-prevLen):null;
      var cell=k===0?('Today <span class="sun-wd">'+dayLabel(d.getTime())+'</span>')
        :k===1?('Tomorrow <span class="sun-wd">'+dayLabel(d.getTime())+'</span>')
        :dayLabel(d.getTime());
      rows+='<tr'+(k===1?' class="sun-tmw-row"':'')+'><td>'+cell+'</td><td>'+(sk.rise?hm(sk.rise):'—')+'</td><td>'+(sk.set?hm(sk.set):'—')+'</td><td>'+(sk.rise?dur(sk.set-sk.rise):'—')+'</td><td>'+chgCell(chg)+'</td></tr>';
      prevLen=len;
    }
    var tbl=document.getElementById('sun-week');
    if(tbl) tbl.innerHTML='<tr><th>Day</th><th>Sunrise</th><th>Sunset</th><th>Day length</th><th>Daily change</th></tr>'+rows;
  }
  buildWeek();

  /* tomorrow, recomputed from the visitor's now. The baked values come from the
     build clock; someone reading at 11pm local on the day of a build wants the
     day after THEIR today, which can already be a different date. */
  function paintTomorrow(){
    if(!document.getElementById('sun-tmw-rise')) return;
    var t=new Date(Date.now()+86400000), sc=sunCalc(t,C.lat,C.lon,-0.833);
    var today=sunCalc(new Date(),C.lat,C.lon,-0.833);
    put('sun-tmw-rise', sc.rise?hm(sc.rise):'—');
    put('sun-tmwlink-rise', sc.rise?hm(sc.rise):'—');   /* the pointer in the arc card */
    /* ...and its href, for the same reason the time beside it is repainted: at
       11pm local the build's tomorrow is already today. */
    var tl=document.getElementById('sun-tmwlink-a'), base=tl&&tl.getAttribute('data-sun-base');
    if(base){ try{ tl.setAttribute('href', base+'?date='+new Intl.DateTimeFormat('en-CA',{timeZone:C.tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(t)); }catch(e){} }
    put('sun-tmw-set', sc.set?hm(sc.set):'—');
    put('sun-tmw-len', sc.rise?dur(sc.set-sc.rise):'—');
    put('sun-tmw-day', dayLong(sc.noon));
    var note=document.getElementById('sun-tmw-note'); if(!note) return;
    if(!sc.rise){ note.textContent='Tomorrow the sun does not rise or set here — at this latitude it stays above or below the horizon around this date.'; return; }
    var chg=today.rise?Math.round(((sc.set-sc.rise)-(today.set-today.rise))/60000):null;
    var chgTxt=(chg==null||chg===0)?'the same length as today'
      :(Math.abs(chg)+' minute'+(Math.abs(chg)===1?'':'s')+' '+(chg>0?'longer':'shorter')+' than today');
    note.innerHTML='Tomorrow the sun rises at <b>'+hm(sc.rise)+'</b> and sets at <b>'+hm(sc.set)+'</b> — '
      +lenWords(sc.set-sc.rise)+' of daylight, '+chgTxt+'.';
  }
  paintTomorrow();

  /* next solar event — a live "in Xh Ym" countdown that upgrades the baked
     absolute time (#sun-next; guarded, so tool pages without it are unaffected).
     It sits in the daylight card and only ticks while that card is showing
     today — on any other picked date paintArc owns the line instead. */
  (function(){
    var el=document.getElementById('sun-next'); if(!el) return;
    function gap(ms){ var m=Math.round(ms/60000), h=Math.floor(m/60), mm=m%60;
      return h<=0 ? (mm+' minute'+(mm===1?'':'s')) : (h+' hour'+(h===1?'':'s')+' '+mm+' minute'+(mm===1?'':'s')); }
    function upd(){ if(!arcToday) return;
      var t=Date.now(), sc=sunCalc(new Date(t),C.lat,C.lon,-0.833); if(!sc.rise||!sc.set){ el.textContent=''; return; }
      var txt;
      if(t<sc.rise) txt='Sunrise in '+gap(sc.rise-t);
      else if(t<sc.set) txt='Sunset in '+gap(sc.set-t);
      else { var tm=sunCalc(new Date(t+86400000),C.lat,C.lon,-0.833); txt=tm.rise?('Sunrise tomorrow at '+hm(tm.rise)):''; }
      el.textContent=txt; }
    updNext=upd; upd(); setInterval(upd,30000);
    document.addEventListener('visibilitychange',function(){ if(!document.hidden) upd(); });
  })();

  ${DIAL_JS}
  /* ?date=YYYY-MM-DD — where the "Tomorrow's sunrise" link lands. The page is
     static and its canonical is the clean URL, so this is one page rendered for
     a different day, not a second page: no crawler is offered anything it
     cannot already reach, and the reader gets the day they clicked for. */
  (function(){
    var q=null; try{ q=new URLSearchParams(location.search).get('date'); }catch(e){}
    if(q&&/^\\d{4}-\\d{2}-\\d{2}$/.test(q)&&q>='1900-01-01'&&q<='2099-12-31'&&goToDate){ goToDate(q); orrFromDate(q); return; }
    renderFor(now,true);
  })();

  /* midnight rollover: if the tab stays open past midnight (or is refocused
     on a later day) and the picker is still on "today", flip the dial,
     stats, date field and 7-day table to the new day */
  (function(){
    function dkey(){ try{ return new Intl.DateTimeFormat('en-CA',{timeZone:C.tz}).format(new Date()); }catch(e){ return ''; } }
    var k0=dkey();
    function chk(){ var k=dkey(); if(k===k0) return;
      var ds=document.getElementById('sun-date')||document.getElementById('sun-date2');
      var onToday=!ds||!ds.value||ds.value===k0; k0=k;
      if(!onToday) return;
      now=new Date(); setDates(k);
      put('sun-today', dayLong(now.getTime()));
      renderFor(now,true); buildWeek(); paintTomorrow(); }
    setInterval(chk,60000);
    document.addEventListener('visibilitychange',function(){ if(!document.hidden) chk(); });
  })();

  /* ---- annual sunrise/sunset trend with solstice markers ---- */
  (function(){
    var svg=document.getElementById('sun-year'); if(!svg) return;
    function hodTz(ms){ var p=new Intl.DateTimeFormat('en-GB',{timeZone:C.tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ms)).split(':'); return +p[0]+p[1]/60; }
    function unwrap(h,ref){ while(h-ref>12) h-=24; while(ref-h>12) h+=24; return h; }
    var W=640,H=260,padL=46,padR=12,padT=14,padB=26,iw=W-padL-padR,ih=H-padT-padB;
    var yr=new Date().getFullYear(), y0=new Date(yr,0,1), rise=[], set=[], longest=null, shortest=null;
    for(var d=0;d<365;d+=3){
      var t=new Date(y0.getTime()+d*86400e3+12*3600e3), sc=sunCalc(t,C.lat,C.lon,-0.833);
      if(!sc.rise){ rise.push([d,null]); set.push([d,null]); continue; }
      /* Plot each day's times relative to ITS OWN solar noon rather than on a
         fixed 12 AM–12 AM scale. Where the clock runs far from the sun (Nome
         sets at 12:31 AM in July) the sunset curve otherwise falls off the
         bottom of the chart and reappears at the top, splitting the daylight
         band in two. Unwrapping keeps the curves continuous and the daylight
         centred; the axis labels below wrap the hours back into clock time. */
      var hN=hodTz(sc.noon);
      rise.push([d,unwrap(hodTz(sc.rise),hN)]); set.push([d,unwrap(hodTz(sc.set),hN)]);
    }
    /* The extremes get their OWN every-day scan. Taking them from the
       every-third-day drawing samples put the solstice on whichever of the
       three days happened to be sampled — the chart said Jun 21 while the
       facts card, which walks every day, said Jun 20. Sampling is fine for a
       curve and wrong for a date. */
    for(var e2=0;e2<366;e2++){
      var t2=new Date(y0.getTime()+e2*86400e3+12*3600e3);
      if(t2.getFullYear()!==yr) break;
      var s2=sunCalc(t2,C.lat,C.lon,-0.833); if(!s2.rise) continue;
      var L2=s2.set-s2.rise;
      if(!longest||L2>longest.L) longest={d:e2,t:t2,L:L2};
      if(!shortest||L2<shortest.L) shortest={d:e2,t:t2,L:L2};
    }
    var vals=rise.concat(set).map(function(p){return p[1];}).filter(function(v){return v!=null;});
    var lo=Math.floor(Math.min.apply(null,vals))-1, hi=Math.ceil(Math.max.apply(null,vals))+1;
    function X(d){ return padL+d/364*iw; }
    function Y(h){ return padT+(h-lo)/(hi-lo)*ih; }
    function fmtH(h){ var hh=((Math.round(h)%24)+24)%24; var ap=hh<12?' AM':' PM'; var v=hh%12; if(v===0)v=12; return v+ap; }
    function md(t){ return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(t); }
    function line(pts){ var o='',pen=false; pts.forEach(function(p){ if(p[1]==null){pen=false;return;} o+=(pen?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1); pen=true; }); return o; }
    var out='';
    for(var g=Math.ceil(lo/3)*3; g<=hi; g+=3){
      out+='<line x1="'+padL+'" y1="'+Y(g).toFixed(1)+'" x2="'+(W-padR)+'" y2="'+Y(g).toFixed(1)+'" stroke="#2b3350" stroke-width="1"/>'
        +'<text x="'+(padL-6)+'" y="'+Y(g).toFixed(1)+'" text-anchor="end" dy=".34em" font-size="10" fill="#94a3b8">'+fmtH(g)+'</text>';
    }
    var MON='JFMAMJJASOND';
    for(var m=0;m<12;m++){ var dd=Math.round(m*30.4);
      out+='<text x="'+X(dd+15).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" fill="#94a3b8">'+MON[m]+'</text>'; }
    /* shaded daylight band between the curves */
    var band='',i;
    for(i=0;i<rise.length;i++){ if(rise[i][1]==null) continue; band+=(band?'L':'M')+X(rise[i][0]).toFixed(1)+' '+Y(rise[i][1]).toFixed(1); }
    for(i=set.length-1;i>=0;i--){ if(set[i][1]==null) continue; band+='L'+X(set[i][0]).toFixed(1)+' '+Y(set[i][1]).toFixed(1); }
    if(band) out+='<path d="'+band+'Z" fill="rgba(252,211,77,.08)"/>';
    /* daylight-saving clock-change markers (offset shifts), like the
       solstice lines but gray */
    function offAt(dd){ try{ var pr=new Intl.DateTimeFormat('en-US',{timeZone:C.tz,timeZoneName:'shortOffset'}).formatToParts(new Date(y0.getTime()+dd*86400e3+12*3600e3)); for(var q=0;q<pr.length;q++){ if(pr[q].type==='timeZoneName') return pr[q].value; } }catch(e){} return ''; }
    var prevOff=offAt(0);
    for(var dd=1;dd<365;dd++){
      var od=offAt(dd);
      if(od!==prevOff){
        var tt=new Date(y0.getTime()+dd*86400e3);
        out+='<line x1="'+X(dd).toFixed(1)+'" y1="'+padT+'" x2="'+X(dd).toFixed(1)+'" y2="'+(H-padB)+'" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="2 5" opacity=".8"/>'
          +'<text x="'+X(dd).toFixed(1)+'" y="'+(H-padB-4)+'" text-anchor="middle" font-size="9" fill="#94a3b8">'+md(tt)+' clocks</text>';
        prevOff=od;
      } else if(dd%2===0){ dd++; } /* coarse scan: offsets only change twice a year */
    }
    /* solstice markers */
    [[longest,'Summer solstice'],[shortest,'Winter solstice']].forEach(function(pair){
      var p=pair[0]; if(!p) return;
      out+='<line x1="'+X(p.d).toFixed(1)+'" y1="'+padT+'" x2="'+X(p.d).toFixed(1)+'" y2="'+(H-padB)+'" stroke="#fb923c" stroke-width="1.4" stroke-dasharray="4 4"/>'
        +'<text x="'+X(p.d).toFixed(1)+'" y="'+(padT-3)+'" text-anchor="middle" font-size="9.5" fill="#fb923c">'+md(p.t)+'</text>';
    });
    out+='<path d="'+line(rise)+'" fill="none" stroke="#7dd3fc" stroke-width="2"/>'
      +'<path d="'+line(set)+'" fill="none" stroke="#fcd34d" stroke-width="2"/>'
      +'<text x="'+(padL+6)+'" y="'+(padT+12)+'" font-size="10.5" fill="#7dd3fc">Sunrise</text>'
      +'<text x="'+(padL+6)+'" y="'+(H-padB-6)+'" font-size="10.5" fill="#fcd34d">Sunset</text>';
    /* today's date, marked with a dotted vertical line */
    var tdy=Math.floor((Date.now()-y0.getTime())/86400e3);
    if(tdy>=0&&tdy<365){
      out+='<line x1="'+X(tdy).toFixed(1)+'" y1="'+padT+'" x2="'+X(tdy).toFixed(1)+'" y2="'+(H-padB)+'" stroke="#e2e8f0" stroke-width="1.2" stroke-dasharray="2 3" opacity=".85"/>'
        +'<text x="'+X(tdy).toFixed(1)+'" y="'+(padT-3)+'" text-anchor="middle" font-size="9.5" fill="#e2e8f0">Today</text>';
    }
    /* the hover furniture, drawn once and moved rather than re-created: a
       guide line, a dot on each curve, and a wide transparent rect that is
       what actually receives the pointer (the 2px-wide curves are impossible
       to hit, and on a phone there is no pointer at all — you drag) */
    out+='<g id="sun-yhover" style="display:none" pointer-events="none">'
      +'<line id="sun-yline" y1="'+padT+'" y2="'+(H-padB)+'" stroke="#e2e8f0" stroke-width="1.2" opacity=".75"/>'
      +'<circle id="sun-ydot1" r="3.6" fill="#7dd3fc" stroke="#0b1020" stroke-width="1.4"/>'
      +'<circle id="sun-ydot2" r="3.6" fill="#fcd34d" stroke="#0b1020" stroke-width="1.4"/></g>'
      +'<rect id="sun-yhit" x="'+padL+'" y="'+padT+'" width="'+iw+'" height="'+ih+'" fill="transparent" style="cursor:crosshair"/>';
    svg.innerHTML=out;
    function dl(ms){ var m2=Math.round(ms/60000); return Math.floor(m2/60)+' h '+(m2%60)+' m'; }
    var note=document.getElementById('sun-year-note');
    if(note&&longest&&shortest) note.textContent='Summer solstice (longest day): '+md(longest.t)+' — '+dl(longest.L)+' of daylight · Winter solstice (shortest day): '+md(shortest.t)+' — '+dl(shortest.L)+'. Steps in the curves are the clock changes (daylight saving time).';

    /* ---- read any date off the chart ------------------------------------
       The curves are sampled every third day for drawing, but the read-out
       solves the exact day under the pointer — so what it reports is the real
       answer for that date, not the nearest plotted sample. */
    (function(){
      var wrap=document.getElementById('sun-year-wrap'), tip=document.getElementById('sun-yt'),
          live=document.getElementById('sun-yt-live'), hit=document.getElementById('sun-yhit'),
          grp=document.getElementById('sun-yhover'), ln=document.getElementById('sun-yline'),
          d1=document.getElementById('sun-ydot1'), d2=document.getElementById('sun-ydot2');
      if(!wrap||!tip||!hit) return;
      var cur=-1;
      function hide(){ cur=-1; grp.style.display='none'; tip.hidden=true; }
      function show(d){
        d=Math.max(0,Math.min(364,d)); if(d===cur) return; cur=d;
        var t=new Date(y0.getTime()+d*86400e3+12*3600e3), sc=sunCalc(t,C.lat,C.lon,-0.833);
        var x=X(d);
        ln.setAttribute('x1',x.toFixed(1)); ln.setAttribute('x2',x.toFixed(1));
        var html='<b>'+md(t)+'</b>';
        if(sc.rise){
          var hN=hodTz(sc.noon), yr2=Y(unwrap(hodTz(sc.rise),hN)), ys=Y(unwrap(hodTz(sc.set),hN));
          d1.setAttribute('cx',x.toFixed(1)); d1.setAttribute('cy',yr2.toFixed(1));
          d2.setAttribute('cx',x.toFixed(1)); d2.setAttribute('cy',ys.toFixed(1));
          d1.style.display=d2.style.display='';
          /* golden hour: the sun between −4° and +6°, the same definition the
             card above the chart uses */
          var a6=sunCalc(t,C.lat,C.lon,6), am4=sunCalc(t,C.lat,C.lon,-4);
          var gh=(a6.set&&am4.set&&am4.set>a6.set)?(hm(a6.set)+' – '+hm(am4.set)):null;
          /* how the day compares with the one before it — the trend is the
             thing the curve shows and a single date cannot */
          var yd=sunCalc(new Date(t.getTime()-86400e3),C.lat,C.lon,-0.833);
          var delta=(yd.rise)?Math.round(((sc.set-sc.rise)-(yd.set-yd.rise))/60000):null;
          html+='<span><i>Sunrise</i>'+hm(sc.rise)+'</span><span><i>Sunset</i>'+hm(sc.set)+'</span>'
            +'<span><i>Daylight</i>'+dl(sc.set-sc.rise)
            +(delta===null||delta===0?'':' <em>'+(delta>0?'+':'−')+Math.abs(delta)+' min</em>')+'</span>'
            +(gh?'<span><i>Golden hour</i>'+gh+'</span>':'');
        } else {
          d1.style.display=d2.style.display='none';
          html+='<span>'+(sunPosition(new Date(sc.noon),C.lat,C.lon).alt>-0.833?'Midnight sun — the sun does not set':'Polar night — the sun does not rise')+'</span>';
        }
        tip.innerHTML=html;
        grp.style.display=''; tip.hidden=false;
        /* Sit BESIDE the guide line, not centred on it: centred, the panel
           covered the sunrise curve and the dot the reader is looking at.
           It flips to the other side past the halfway mark so it never runs
           off the edge in November and December either. */
        tip.style.left=(x/W*100)+'%';
        tip.classList.toggle('is-left', d>182);
        if(live) live.textContent=tip.textContent;
      }
      function dayFromClientX(cx){
        var r=svg.getBoundingClientRect(); if(!r.width) return 0;
        return Math.round(((cx-r.left)/r.width*W-padL)/iw*364);
      }
      hit.addEventListener('pointermove',function(e){ show(dayFromClientX(e.clientX)); });
      hit.addEventListener('pointerdown',function(e){ show(dayFromClientX(e.clientX)); });
      hit.addEventListener('pointerleave',function(e){ if(e.pointerType==='mouse') hide(); });
      /* keyboard: the chart is a real control, so it takes focus and arrows.
         Home/End jump to the ends of the year. */
      wrap.addEventListener('keydown',function(e){
        var step=e.shiftKey?7:1, d=cur<0?Math.floor((Date.now()-y0.getTime())/86400e3):cur;
        if(e.key==='ArrowRight') show(d+step);
        else if(e.key==='ArrowLeft') show(d-step);
        else if(e.key==='Home') show(0);
        else if(e.key==='End') show(364);
        else if(e.key==='Escape'){ hide(); return; }
        else return;
        e.preventDefault();
      });
      wrap.addEventListener('blur',hide);
    })();
  })();

  /* ---- today's place in the year -------------------------------------
     Baked at build time, but the build is not what the visitor is reading —
     the rank changes at local midnight and the page can be served from cache
     for hours. So it is recomputed here from the visitor's own today.
     A full 365-day scan, not the every-third-day sampling the year chart
     uses: a rank has to see every day or it is not a rank. Scheduled on idle
     because nothing above the fold waits on it. */
  function sunRankPaint(){
    var el=document.getElementById('sun-rank'); if(!el) return;
    function len(t){ var sc=sunCalc(t,C.lat,C.lon,-0.833);
      if(sc.rise) return sc.set-sc.rise;
      /* no rise/set: midnight sun or polar night, and which one decides
         whether the day sorts above or below every ordinary one */
      return sunPosition(new Date(sc.noon),C.lat,C.lon).alt>-0.833?86400000:0; }
    /* "the 78th longest day in Portland" is a fact about PORTLAND, so today
       and the year are read in the CITY's zone (the same dkey() rule the rest
       of the page uses), and the days are stepped on UTC noon exactly as the
       build does. Keyed off the visitor's own calendar instead, a reader in
       Tokyo got a different answer about Portland than a reader in Portland. */
    var key; try{ key=new Intl.DateTimeFormat('en-CA',{timeZone:C.tz}).format(new Date()); }
    catch(e){ key=new Date().toISOString().slice(0,10); }
    var kp=key.split('-'), yr=+kp[0];
    var todayMs=Date.UTC(yr,+kp[1]-1,+kp[2],12);
    var L=[], longest=null, shortest=null, d;
    for(d=0;d<366;d++){
      var ms=Date.UTC(yr,0,1+d,12); if(new Date(ms).getUTCFullYear()!==yr) break;
      var v=len(new Date(ms)); L.push(v);
      if(!longest||v>longest.L) longest={L:v,t:ms};
      if(!shortest||v<shortest.L) shortest={L:v,t:ms};
    }
    var todayL=len(new Date(todayMs)), longerN=0, tied=0, i;
    for(i=0;i<L.length;i++){ if(L[i]>todayL+60000) longerN++;
      if(Math.abs(L[i]-todayL)<=60000) tied++; }
    function ord(k){ var t2=k%100; if(t2>=11&&t2<=13) return k+'th';
      return k+(['th','st','nd','rd'][k%10]||'th'); }
    var txt;
    if(todayL>=86400000){ var n1=0; for(i=0;i<L.length;i++) if(L[i]>=86400000) n1++;
      txt=C.city+' is under midnight sun today — the sun does not set. '+n1+' days this year are like that.'; }
    else if(todayL<=0){ var n2=0; for(i=0;i<L.length;i++) if(L[i]<=0) n2++;
      txt=C.city+' is in polar night today — the sun does not rise. '+n2+' days this year are like that.'; }
    else if(tied>3) txt='Today is one of '+tied+' days this year with the same length of daylight, within a minute of each other.';
    else txt='Of the '+L.length+' days this year, today is the '+ord(longerN+1)+' longest here.';
    el.textContent=txt;
    var sol=document.getElementById('sun-solstice'); if(!sol) return;
    function daysTo(ms){ return Math.round((ms-todayMs)/86400000); }
    var cands=[[longest,'longest day'],[shortest,'shortest day']].filter(function(p){ return p[0]&&daysTo(p[0].t)>0; })
      .sort(function(a,b){ return daysTo(a[0].t)-daysTo(b[0].t); });
    if(!cands.length){ sol.textContent=''; return; }
    var ev=cands[0][0], nm=cands[0][1], dd=daysTo(ev.t);
    var md2; try{ md2=new Intl.DateTimeFormat('en-US',{timeZone:C.tz,month:'long',day:'numeric'}).format(new Date(ev.t)); }
    catch(e){ md2=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric'}).format(new Date(ev.t)); }
    sol.textContent='The '+nm+' of the year is '+dd+' day'+(dd===1?'':'s')+' away, on '+md2+' — '+dur(ev.L)+' of daylight.';
  }
  (function(){ if(!document.getElementById('sun-rank')) return;
    if(window.requestIdleCallback) requestIdleCallback(sunRankPaint,{timeout:3000});
    else setTimeout(sunRankPaint,400); })();

  /* the live position: paint immediately over the baked build-minute values,
     then every 30s. Unlike the rest of the page this is not tied to the date
     picker — "right now" is always right now. */
  (function(){ if(!document.getElementById('sun-now-alt')) return;
    sunNowPaint(); setInterval(sunNowPaint,30000);
    /* a phone that has been asleep comes back with a stale reading */
    document.addEventListener('visibilitychange',function(){ if(!document.hidden) sunNowPaint(); }); })();

`;

/* ＋ Save to My Cities (shared sun_favs store, also read by the tides page).
 * ME = {slug, city, tz, lat, lon} plus, for anywhere-page saves, a url.
 * Only the /sun/anywhere/ and /sun/near-me/ tools carry the button now —
 * they resolve a location that exists nowhere else, so saving is the only way
 * to keep it. Prebuilt city pages dropped it (the /sun/ hub's search adds any
 * of them in one click), and with it the SAVE_JS they no longer need. */
const SAVE_JS = `
  function wireSave(ME){
    var btn=document.getElementById('sun-save'), okEl=document.getElementById('sun-saveok'); if(!btn) return;
    function favs(){ try{ return JSON.parse(localStorage.getItem('sun_favs'))||[]; }catch(e){ return []; } }
    function show(){ var have=favs().some(function(f){ return f.slug===ME.slug; }); btn.hidden=have; okEl.hidden=!have; }
    btn.addEventListener('click',function(){ var f=favs(); if(!f.some(function(x){return x.slug===ME.slug;})){ f.push(ME); try{ localStorage.setItem('sun_favs',JSON.stringify(f)); }catch(e){} } show(); });
    show();
  }`;

/* The controller is 61KB and BYTE-IDENTICAL on all ~1,100 city pages apart
 * from this one config line — it was the single largest gzip contributor on
 * the site's largest page family. Split in two: the config stays inline (it is
 * per-city and tiny), and the shared half is tagged data-ac="shared" so
 * build-inline can hoist it into one cached file that every /sun/ page reuses.
 * The page is fully server-rendered, so nothing above the fold waits on it. */
const cityPageJs = (c) => `<script>window.AC_SUN_C=${JSON.stringify({ lat: c.lat, lon: c.lon, tz: c.tz, city: c.city })};</script>
<script data-ac="shared" data-name="sun-city">
(function(){
  var C=window.AC_SUN_C;
  ${PAGE_BODY_JS}
})();
</script>`;

/* `preconnect`: hosts this page is CERTAIN to fetch from, warmed early so the
 * DNS+TLS handshake isn't on the critical path of the first data render. Opt-in
 * per page — only the hub, /sun/anywhere/ and /sun/near-me/ call out at all,
 * and a preconnect the page never uses is wasted work for the browser. */
const head = ({ title, desc, path, faq, ld = "", noindex = false, preconnect = [] }) => `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">${noindex ? `\n<meta name="robots" content="noindex,follow">` : ""}
<link rel="canonical" href="${SITE}${path}">${preconnect.map((h) => `\n<link rel="preconnect" href="${h}" crossorigin>`).join("")}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/css/style.css">
${appLd({ name: title, url: `${SITE}${path}`, description: desc })}
${faq ? faqLd(faq) : ""}${ld}
${GA_SNIPPET}`;

/* Reciprocal coastal link (roadmap #9): a coastal sun city (one mapped to a
 * nearby NOAA tide station in coastal.mjs) gets a tide card linking to that
 * station's page; the station links back here, so the pairing is reciprocal.
 * Inland cities have no mapping and get nothing. */

/* Only generate when run directly (`node build-sun.mjs`) — build-inline and
 * build-sitemap import SUN_CITIES from here and must not rewrite the pages as
 * an import side effect (same pattern as build-420.mjs). */
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

/* ---- per-city pages (curated world cities + census US top-1000) ---- */
if (isMain) for (const c of SUN_ALL) {
  const path = `/sun/${c.slug}/`;
  const label = cityLabel(c);
  const ssr = sunSSR(c);
  /* locally-computed seasonal facts (Priority 6) — different per city by
   * latitude, date and season, not just a swapped name. Build-stable text
   * (refreshed by the scheduled rebuild), unlike the JS-live answer sentence. */
  const sunFacts = [];
  if (ssr.dirRise) sunFacts.push(`The sun rises in the ${ssr.dirRise} and sets in the ${ssr.dirSet} today.`);
  if (ssr.trendDir && ssr.trendDir !== "steady") sunFacts.push(`Days are getting ${ssr.trendDir} by about ${ssr.trendRate} minute${ssr.trendRate === 1 ? "" : "s"} a day right now.`);
  if (ssr.swingWords) sunFacts.push(`${esc(c.city)} gets about ${ssr.swingWords} more daylight on its longest day than its shortest.`);
  if (ssr.nextSeason) sunFacts.push(`The next ${ssr.nextSeason} is ${ssr.nextDays} day${ssr.nextDays === 1 ? "" : "s"} away, on ${ssr.nextDateMd}.`);
  if (ssr.rankWords) sunFacts.push(`<span id="sun-rank">${ssr.rankWords}</span>`);
  if (ssr.solsticeWords) sunFacts.push(`<span id="sun-solstice">${ssr.solsticeWords}</span>`);
  const factsCard = sunFacts.length
    ? `  <div class="card">
    <h2>Daylight &amp; seasons in ${esc(c.city)}</h2>
    <ul class="sun-facts">${sunFacts.map((f) => `<li>${f}</li>`).join("")}</ul>
  </div>`
    : "";
  const faq = [
    ...(ssr.tmwRise ? [[`What time is sunrise tomorrow in ${label}?`,
      `Tomorrow (${ssr.tmwDay}) the sun rises at ${ssr.tmwRise} in ${c.city} and sets at ${ssr.tmwSet}${ssr.tmwLenWords ? `, giving ${ssr.tmwLenWords} of daylight` : ""}. The card above recomputes this in your browser, so it is always the day after today wherever you are reading it.`]] : []),
    [`What time is sunrise in ${label} today?`, `The card above computes it live in your browser for today's date, using ${c.city}'s coordinates — along with sunset, solar noon, first light and last light, all in ${c.city}'s own time zone.`],
    ["What are first light and last light?", "Civil twilight — when the sun is less than 6° below the horizon. It's bright enough for most outdoor activities before sunrise and after sunset."],
    ["Why do the times change every day?", "Earth's tilted axis means the sun's path moves through the seasons — days lengthen toward the summer solstice and shorten toward the winter solstice, so sunrise and sunset shift a little every day."],
  ];
  /* rendered once here because the FAQ card is emitted from two branches
     below — paired with the seasons card when there is one, alone when
     there is not — and the two must not drift apart */
  const faqHtml = faq.map(([q, a]) => `<h2>${esc(q)}</h2><p>${esc(a)}</p>`).join("\n    ");
  /* Interlink each page with its 8 geographically nearest siblings. Real
     great-circle miles, not squared degrees: a degree of longitude shrinks
     toward the poles, and −180 and +180 are the same meridian, so the degree
     sort put Hawaii next to Pago Pago instead of Apia or Auckland. Same
     haversine the client's "nearby cities" list uses. */
  const neighbors = SUN_ALL.filter((n) => n.slug !== c.slug)
    .map((n) => ({ n, mi: milesBetween(c.lat, c.lon, n.lat, n.lon) }))
    .sort((a, b) => a.mi - b.mi).slice(0, 8).map((x) => x.n);
  const stateHub = c.st ? SUN_STATES.find((s) => s.st === c.st) : null;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${head({
  /* Title = what the page IS, city first; the specifics (today's times, daylight
   * length, the date picker) belong in the description below, not here. One
   * pattern for every city, state abbreviation included, never shortened. */
  /* "Today & Tomorrow" is deliberate: "sunrise tomorrow <city>" is its own
   * query family and the page now answers it outright. The head term
   * ("<city> Sunrise & Sunset Times") is untouched and still leads. */
  title: `${label} Sunrise & Sunset Times — Today & Tomorrow`,
  /* dynamic (roadmap #10): today's actual sunrise/sunset — day-stable, so baking
   * them is safe, and each hourly rebuild keeps the date current. The snippet
   * answers the search outright (both times AND how much daylight that adds up
   * to, which is the thing neither time tells you on its own) and then says the
   * page isn't only about today. Longest-first, first fit under ~160 wins. */
  desc: ssr.hasSun
    ? (() => {
      const lead = `Today's ${label} sunrise is ${ssr.rise} and sunset is ${ssr.set} — ${ssr.lenAbbr} of daylight.`;
      /* RICHEST FIRST, first fit under ~160 wins. The list used to be ordered
         shortest-first, which meant the shortest candidate always matched and
         the richer ones were dead code — that is how the tomorrow variants
         added below would have silently never shipped. */
      const tmw = ssr.tmwRise ? ` Tomorrow's sunrise is ${ssr.tmwRise}.` : "";
      const cands = [
        `${lead}${tmw} Plus first light, last light, solar noon and any date you pick.`,
        `${lead}${tmw} Plus twilight, solar noon and any date you pick.`,
        `${lead}${tmw} See twilight and any date you pick.`,
        `${lead}${tmw}`,
        `${lead} See first light, last light, solar noon, and any date you pick.`,
      ];
      return cands.find((x) => x.length <= 160) || cands[cands.length - 1];
    })()
    : `Sun times for ${c.city} today — around now the sun stays up or down at this latitude (midnight sun or polar night). See solar noon, twilight and the 7-day outlook.`,
  path,
  faq,
  /* Place alongside the breadcrumb: the page is about a city, and until now
     the only thing asserting WHICH city was the URL. */
  ld: `\n<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Sunrise & Sunset", url: "/sun/" }, { name: label, url: path }])}</script>\n${placeLd({ ...resolvePlace(c), elevKey: c.slug, url: `${SITE}${path}` })}`,
})}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "sun", url: "/sun/" }, page: { label, url: path } })}
  <h1>Sunrise &amp; Sunset in ${esc(label)}</h1>
  ${/* The answer, in a sentence, server-rendered. The tiles below carry the same
       six numbers, but only as label/value pairs — a search engine reading this
       page had no prose statement of what time the sun rises here, which is the
       question the page exists to answer. The <b> ids are the ones renderFor()
       already updates, so the sentence follows the visitor's real "today" (and
       any date they pick) instead of the build's. The polar case gets its own
       wording, because "rises at —" would be nonsense there. */
    ssr.hasSun ? `<p class="sub" id="sun-answer">The sun rises in ${esc(c.city)} today at <b id="sun-a-rise">${ssr.rise}</b> and sets at <b id="sun-a-set">${ssr.set}</b>, giving <b id="sun-a-len">${ssr.lenWords}</b> of daylight${ssr.delta ? ` — <span id="sun-a-delta">${esc(ssr.delta)}</span>` : ""}. First light is at <b id="sun-a-dawn">${ssr.dawn}</b>, last light at <b id="sun-a-dusk">${ssr.dusk}</b>, and solar noon at <b id="sun-a-noon">${ssr.noon}</b>.</p>
  ` : `<p class="sub" id="sun-answer">${esc(c.city)} has no ordinary sunrise or sunset around this date — at this latitude the sun stays continuously above or below the horizon (midnight sun or polar night). Solar noon is <b id="sun-a-noon">${ssr.noon}</b>.</p>
  `}${localTimeLine(c.city, c.tz)}<p class="hint sun-tzline">${ssr.tzName ? `${esc(ssr.tzName)} · ` : ``}<span id="sun-today">${ssr.today}</span> · Calculated for central ${esc(c.city)} — recomputed live in your browser for today's date.</p>
${sunArcCard(ssr, c.city, c.slug)}  <div class="card sun-dial-card">
    <h2>24-hour sun clock <input type="date" class="sun-hdate" id="sun-date" aria-label="Pick any date"${ssr.ymd ? ` value="${ssr.ymd}"` : ""}></h2>
    <div class="sun-dial-wrap">
      <svg id="sun-dial" viewBox="0 0 292 292" role="img" aria-label="24-hour sun clock for ${esc(c.city)}">${ssr.dialSvg}</svg>
    </div>
    <div class="sun-side">
      <div class="sun-srow"><span>First light</span><b id="sun-dawn">${ssr.dawn}</b></div>
      <div class="sun-srow sun-main"><span>Sunrise</span><b id="sun-rise">${ssr.rise}</b></div>
      <div class="sun-srow"><span>Solar noon</span><b id="sun-noon">${ssr.noon}</b></div>
      <div class="sun-srow sun-main"><span>Sunset</span><b id="sun-set">${ssr.set}</b></div>
      <div class="sun-srow"><span>Last light</span><b id="sun-dusk">${ssr.dusk}</b></div>
      <div class="sun-srow"><span>Day length</span><b id="sun-len">${ssr.len}</b></div>
    </div>
  </div>
${sunNowCard(ssr, orreryFigure({ ms: BUILD_NOW.getTime(), lat: c.lat, lon: c.lon, place: c.city, tz: c.tz }), orreryCaption({ ms: BUILD_NOW.getTime(), lat: c.lat, lon: c.lon, place: c.city }), tideNote(c.slug) + simLink({ slug: c.slug, from: "sun", city: c.city }))}${/* TOMORROW beside TWILIGHT: both answer "what are the other times for
     this place" — one the next day's headline figures, the other today's
     light quality — and each was a 1400px band holding three stat tiles. */""
}<div class="duo">${sunTomorrowCard(ssr, c.city)}${goldMoonCard(ssr)}</div>
  ${/* THE WEEK beside THE YEAR: the same quantity at two time scales, which
       is exactly the pairing that teaches — the table shows tomorrow shifting
       by a minute or two, the chart shows where a year of those minutes goes.
       The year chart caps itself at 660px, so a half-width column costs it
       nothing on a wide screen. */""
  }<div class="duo">
  <div class="card">
    <h2>Next 7 days</h2>
    <div class="td-tablewrap"><table class="sun-table" id="sun-week">${ssr.weekTable}</table></div>
  </div>
  <div class="card">
    <h2>Sunrise &amp; sunset through the year</h2>
    <div class="sun-year-wrap" id="sun-year-wrap" tabindex="0" role="group" aria-label="Annual sunrise and sunset trend for ${esc(c.city)}. Use the left and right arrow keys to read any date.">
      <svg id="sun-year" viewBox="0 0 640 260" role="img" aria-label="Annual sunrise and sunset trend for ${esc(c.city)}"></svg>
      <div class="sun-yt" id="sun-yt" hidden aria-hidden="true"></div>
      <p class="visually-hidden" id="sun-yt-live" role="status" aria-live="polite"></p>
    </div>
    <p class="hint" id="sun-year-note">${ssr.yearNote}</p>
  </div>
  </div>
${/* the two prose cards — why the day length moves here, then the direct
     questions — side by side, but ONLY when the facts card exists. It is
     conditional on having facts to state, and a .duo holding one child would
     leave a half-width column of empty page beside it. */""
}${factsCard ? `<div class="duo">${factsCard}
  <div class="card">
    ${faqHtml}
  </div>
  </div>` : `  <div class="card">
    ${faqHtml}
  </div>`}
${placeFacts({ ...resolvePlace(c), nearby: nearestMajor(c, SUN_ALL), kind: "sun" , elevKey: c.slug })}${astroStrip({ from: "sun", slug: c.slug, city: c.city, lat: c.lat, lon: c.lon, tz: c.tz })}${neighbors.length ? `
  <div class="card">
    <h2>Nearby &amp; related</h2>
    <div class="timer-presets">${neighbors.map((n) => `<a class="chip" href="/sun/${n.slug}/">${esc(cityLabel(n))}</a>`).join("")}${stateHub ? `<a class="chip" href="/sun/state/${stateHub.slug}/">All ${esc(stateHub.state)} cities →</a>` : ""}<a class="chip" href="/sun/">All cities →</a></div>
  </div>` : ""}
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${cityPageJs(c)}
</body>
</html>
`;
  mkdirSync(join(root, "sun", c.slug), { recursive: true });
  writeFileSync(join(root, "sun", c.slug, "index.html"), html);
}

/* States that actually have a tide hub. NOAA covers US coastal states only, so
 * an unconditional "tide charts" link would 404 for most of them. */
const TIDE_STATE_SLUGS = new Set(tideStatePages().map((p) => p.slug));

/* ---- per-state hubs (/sun/state/<state>/) — the crawl path into the US
 * pages; /sun/state/ avoids colliding with city slugs like /sun/new-york/ */
if (isMain) for (const s of SUN_STATES) {
  const path = `/sun/state/${s.slug}/`;
  const big = s.cities.slice(0, 3).map((c) => c.city).join(", ");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${head({
  title: `Sunrise & Sunset Times in ${s.state} — ${s.cities.length} Cities`,
  desc: `Today's sunrise and sunset times for ${s.cities.length} ${s.state} cities including ${big} — first light, last light, solar noon and day length, always current.`,
  path,
  ld: `\n<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Sunrise & Sunset", url: "/sun/" }, { name: s.state, url: path }])}</script>`,
})}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "sun", url: "/sun/" }, page: { label: s.state, url: path } })}
  <h1>Sunrise &amp; Sunset in ${esc(s.state)}</h1>
  <p class="sub">Pick a city for today's sunrise, sunset, first light, last light, solar noon and day length — plus a date picker, a 7-day outlook and the annual daylight curve. Largest cities first.</p>
  <div class="card">
    <h2>${esc(s.state)} cities</h2>
    <div class="timer-presets">${s.cities.map((c) => `<a class="chip" href="/sun/${c.slug}/">${esc(c.city)}</a>`).join("")}</div>
    <p class="hint">Don't see your town? <a href="/sun/anywhere/">Get sun times for any location →</a></p>
  </div>
  <div class="card">
    <h2>More for ${esc(s.state)}</h2>
    <p class="timer-presets"><a class="chip" data-xlink="moon" href="/moon/state/${esc(s.slug)}/">Moonrise across ${esc(s.state)}</a>${TIDE_STATE_SLUGS.has(s.slug) ? `<a class="chip" data-xlink="tides" href="/tides/${esc(s.slug)}/">${esc(s.state)} tide charts</a>` : ""}</p>
    <p class="hint">Same places, different question — all computed for the same coordinates.</p>
  </div>
  <div class="card">
    <h2>How the times are computed</h2>
    <p>Every page computes today's times live in your browser from the city's coordinates with the standard solar-position algorithm — accurate to a minute or two, in the city's own time zone, and never stale. <a href="/methodology/sunrise-sunset/">The method in full, and what it doesn't model →</a> · <a href="/sun/">All cities and states →</a></p>
  </div>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;
  mkdirSync(join(root, "sun", "state", s.slug), { recursive: true });
  writeFileSync(join(root, "sun", "state", s.slug, "index.html"), html);
}

/* ---- /sun/anywhere/ — sun times for ANY location (noindex utility).
 * Location resolution order: URL params -> nearest listed city to the
 * device clock. Search: local index (instant) + Open-Meteo geocoding for
 * small towns; picking a place navigates with the location in the URL so
 * results are shareable and the render path stays simple. ---- */
if (isMain) {
  const path = "/sun/anywhere/";
  const anywhereJs = `
(function(){
  var qs=new URLSearchParams(location.search);
  var deviceTz='UTC'; try{ deviceTz=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'; }catch(e){}
  var LIST=${JSON.stringify(SUN_CITIES.map((c) => [c.slug, c.city, c.tz, c.lat, c.lon]))};
  var STATES=${JSON.stringify(STATE_ABBR)};
  var C,NAME,FROM;
  var la=parseFloat(qs.get('lat')), lo=parseFloat(qs.get('lon'));
  if(isFinite(la)&&isFinite(lo)&&Math.abs(la)<=89.9&&Math.abs(lo)<=180){
    var tz=qs.get('tz')||deviceTz;
    try{ new Intl.DateTimeFormat('en-US',{timeZone:tz}); }catch(e){ tz=deviceTz; }
    NAME=(qs.get('name')||'Your location').slice(0,80);
    C={lat:Math.round(la*10000)/10000, lon:Math.round(lo*10000)/10000, tz:tz}; FROM='url';
  } else {
    /* nearest listed city to the device clock, same trick as the hub */
    function clockOf(z){ try{ return new Intl.DateTimeFormat('en-GB',{timeZone:z,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()); }catch(e){ return ''; } }
    var hit=null,i;
    for(i=0;i<LIST.length;i++){ if(LIST[i][2]===deviceTz){ hit=LIST[i]; break; } }
    if(!hit){ var mine=clockOf(deviceTz); for(i=0;i<LIST.length;i++){ if(clockOf(LIST[i][2])===mine){ hit=LIST[i]; break; } } }
    if(!hit) hit=LIST[0];
    C={lat:hit[3],lon:hit[4],tz:hit[2]}; NAME=hit[1]; FROM='clock';
  }
  document.getElementById('sun-place').textContent=NAME;
  document.title='Sun Times for '+NAME+' \\u2014 Sunrise & Sunset';
  /* a searched town gets its name as the page heading, like a city page */
  if(FROM==='url'){ var h1El=document.querySelector('h1'); if(h1El) h1El.textContent='Sunrise & Sunset in '+NAME; }
  var fn=document.getElementById('sun-fromnote');
  if(fn) fn.textContent = FROM==='clock'
    ? 'Showing '+NAME+' \\u2014 the nearest listed city to your clock. Search your exact town above for precise times.'
    : 'Times computed for '+NAME+' ('+C.lat.toFixed(3)+'\\u00b0, '+C.lon.toFixed(3)+'\\u00b0), in the zone '+C.tz.replace(/_/g,' ')+'.';
  ${PAGE_BODY_JS}
  ${SAVE_JS}
  wireSave(FROM==='clock'
    ? {slug:NAME&&LIST.filter(function(x){return x[1]===NAME;}).length?LIST.filter(function(x){return x[1]===NAME;})[0][0]:'@'+C.lat+','+C.lon, city:NAME, tz:C.tz, lat:C.lat, lon:C.lon}
    : {slug:'@'+C.lat+','+C.lon, city:NAME, tz:C.tz, lat:C.lat, lon:C.lon,
       url:'/sun/anywhere/?lat='+C.lat+'&lon='+C.lon+'&tz='+encodeURIComponent(C.tz)+'&name='+encodeURIComponent(NAME)});

  /* ---- search: local index first (instant), Open-Meteo geocoding for
     everything else (any town on the map). "Canby Oregon" / "canby, or"
     style queries split into city + state so the geocoder can find them. ---- */
  var q=document.getElementById('sun-q'), res=document.getElementById('sun-results'), go=document.getElementById('sun-qgo');
  var FULL=null, fullCbs=[], fetching=false, omSeq=0, omTimer=null, omRows=[], omBusy=false, omDone=false;
  function ensureFull(cb){ if(FULL){ if(cb) cb(); return; } if(cb) fullCbs.push(cb);
    if(fetching) return; fetching=true;
    fetch('/sun/cities.json').then(function(r){return r.json();}).then(function(j){ FULL=j; var c=fullCbs; fullCbs=[]; c.forEach(function(f){f();}); paint(); })
      .catch(function(){ fetching=false; var c=fullCbs; fullCbs=[]; c.forEach(function(f){f();}); }); }
  function d2(c2){ var dx=c2[3]-C.lat, dy=c2[4]-C.lon; return dx*dx+dy*dy; }
  function stateOf(v){ if(v.length===2){ var up=v.toUpperCase(); for(var k in STATES){ if(STATES[k]===up) return up; } }
    if(v.length>=4){ for(var k2 in STATES){ if(k2.toLowerCase().indexOf(v)===0) return STATES[k2]; } } return null; }
  /* "canby oregon" -> {q:"canby", st:"OR"}; "salem, or" -> {q:"salem", st:"OR"} */
  function splitPlace(v){ v=v.trim().replace(/  +/g,' ');
    var lo=v.toLowerCase(), k, kl;
    for(k in STATES){ kl=k.toLowerCase();
      if(lo.length>kl.length+1&&lo.slice(-kl.length)===kl){ var rest=v.slice(0,v.length-kl.length).replace(/[ ,]+$/,''); if(rest) return {q:rest, st:STATES[k], state:k}; } }
    var m=v.match(/^(.+?)[ ,]+([A-Za-z]{2})$/);
    if(m){ var up=m[2].toUpperCase(); for(k in STATES){ if(STATES[k]===up) return {q:m[1].replace(/[ ,]+$/,''), st:up, state:k}; } }
    return {q:v, st:null, state:null}; }
  function localMatches(v){ var src=FULL||LIST; v=v.trim().toLowerCase(); if(!v) return [];
    var ab=stateOf(v), out=[], j;
    if(ab){ for(j=0;j<src.length;j++){ if(src[j][1].slice(-4)===', '+ab) out.push(src[j]); }
      out.sort(function(a,b){ return d2(a)-d2(b); }); if(out.length) return out.slice(0,12); }
    var sp=splitPlace(v);
    if(sp.st){ var out2=[], q2=sp.q.toLowerCase(), suf=(', '+sp.st).toLowerCase();
      for(j=0;j<src.length;j++){ var lb=src[j][1].toLowerCase();
        if(lb.slice(-4)===suf&&lb.indexOf(q2)===0) out2.push(src[j]); }
      if(out2.length) return out2.slice(0,10); }
    var pre=[], sub=[];
    for(j=0;j<src.length;j++){ var l=src[j][1].toLowerCase();
      if(l.indexOf(v)===0) pre.push(src[j]); else if(l.indexOf(v)>-1) sub.push(src[j]); }
    return pre.concat(sub).slice(0,10); }
  function row(label,href,cls){ var li=document.createElement('li'), a=document.createElement('a');
    a.href=href; a.textContent=label; if(cls) li.className=cls; li.appendChild(a); res.appendChild(li); return li; }
  function paint(){ if(!q) return; var v=q.value.trim(); res.innerHTML='';
    var m=localMatches(v);
    m.forEach(function(c2){ row(c2[1], c2[0].charAt(0)==='@'?'#':'/sun/'+c2[0]+'/'); });
    omRows.forEach(function(r2){ var li=row(r2.label, r2.href); li.className='sun-om'; });
    res.hidden=!(m.length||omRows.length||v.length>=3);
    if(v.length>=3&&!omRows.length&&!m.length){ var hintLi=document.createElement('li'); hintLi.className='td-none';
      hintLi.textContent=omBusy?'Searching the map\\u2026':(omDone?'No location found for \\u201c'+v+'\\u201d \\u2014 check the spelling or try a nearby town.':'Searching the map\\u2026'); res.appendChild(hintLi); } }
  function omSearch(v,cb){ var seq=++omSeq; omBusy=true; omDone=false;
    var sp=splitPlace(v);
    fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(sp.q)+'&count=10&language=en&format=json')
      .then(function(r){ return r.json(); })
      .then(function(j){ if(seq!==omSeq) return; omBusy=false; omDone=true;
        var rs=j.results||[];
        if(sp.st){ var f=rs.filter(function(r2){ return r2.country_code==='US'&&r2.admin1===sp.state; }); if(f.length) rs=f; }
        omRows=rs.slice(0,6).map(function(r2){
          var lbl=r2.name+(r2.admin1?', '+r2.admin1:'')+(r2.country_code&&r2.country_code!=='US'?' \\u00b7 '+r2.country_code:'');
          return {label:lbl, href:'/sun/anywhere/?lat='+r2.latitude.toFixed(4)+'&lon='+r2.longitude.toFixed(4)+'&tz='+encodeURIComponent(r2.timezone||deviceTz)+'&name='+encodeURIComponent(r2.name+(r2.admin1?', '+r2.admin1:''))};
        });
        if(cb) cb(omRows); paint(); })
      .catch(function(){ if(seq!==omSeq) return; omBusy=false; omDone=true; if(cb) cb([]); paint(); }); }
  function onInput(){ ensureFull(); omRows=[]; omDone=false; paint();
    if(omTimer) clearTimeout(omTimer);
    var v=q.value.trim();
    if(v.length>=3) omTimer=setTimeout(function(){ omSearch(v); },350); }
  /* resolve a typed place to a page: existing city page -> go there;
     geocoder hit -> this page with the location in the URL; nothing ->
     say so (message in the note line + dropdown) */
  function autoResolve(v){
    ensureFull(function(){
      var m=localMatches(v);
      if(m.length&&String(m[0][0]).charAt(0)!=='@'){ location.replace('/sun/'+m[0][0]+'/'); return; }
      omSearch(v,function(rows){
        if(rows.length){ location.replace(rows[0].href); return; }
        var fn2=document.getElementById('sun-fromnote');
        if(fn2) fn2.textContent='No location found for \\u201c'+v+'\\u201d \\u2014 check the spelling or try a nearby town. Showing '+NAME+' meanwhile.';
        paint();
      });
    }); }
  if(q){ q.addEventListener('input',onInput);
    q.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault();
      var m=localMatches(q.value); if(m.length&&m[0][0].charAt(0)!=='@'){ location.href='/sun/'+m[0][0]+'/'; }
      else if(omRows.length){ location.href=omRows[0].href; }
      else if(q.value.trim().length>=2){ autoResolve(q.value.trim()); } } });
    document.addEventListener('click',function(e){ if(document.contains(e.target)&&!e.target.closest('#sun-q,#sun-results,#sun-qgo')) res.hidden=true; }); }
  if(go) go.addEventListener('click',function(){ var m=localMatches(q.value);
    if(m.length){ location.href='/sun/'+m[0][0]+'/'; } else if(omRows.length){ location.href=omRows[0].href; }
    else if(q.value.trim().length>=2){ autoResolve(q.value.trim()); } else { q.focus(); } });
  /* ?q= handoff from the hub search: resolve it immediately */
  var preQ=(qs.get('q')||'').slice(0,60).trim();
  if(preQ&&q){ q.value=preQ; autoResolve(preQ); }
  /* geolocation -> precise local times */
  var locBtn=document.getElementById('sun-loc');
  if(locBtn) locBtn.addEventListener('click',function(){
    if(!navigator.geolocation){ locBtn.textContent='Location unavailable'; return; }
    locBtn.textContent='Locating\\u2026';
    navigator.geolocation.getCurrentPosition(function(pos){
      location.href='/sun/anywhere/?lat='+pos.coords.latitude.toFixed(4)+'&lon='+pos.coords.longitude.toFixed(4)+'&tz='+encodeURIComponent(deviceTz)+'&name=My%20location';
    },function(){ locBtn.textContent='Location denied'; setTimeout(function(){ locBtn.textContent='Use my precise location'; },2500); });
  });
})();`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${head({
  title: "Sun Times for Any Location — Sunrise & Sunset Anywhere",
  preconnect: ["https://geocoding-api.open-meteo.com"],
  desc: "Sunrise, sunset, first light, last light, solar noon and day length for any town or exact spot on the map — search your location or use GPS. Computed live for today's date.",
  path,
})}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "sun", url: "/sun/" }, page: { label: "Any location", url: path } })}
  <h1>Sunrise &amp; Sunset — Any Location</h1>
  ${/* the placeholder used to be "…", so before JS ran (and to a crawler) the
       sentence read "Sun times for … ." — a fragment with dangling punctuation.
       It now names what the page does; setPlace() swaps in the real place. */""
  }<p class="sub">Sun times for <span id="sun-place">the place you pick below</span>. Not just the big cities: search any town, or use your exact GPS position. All times are local to the place shown.</p>
  <div class="card">
    <div class="td-qrow">
      <input id="sun-q" type="search" placeholder="Search any town — Canby, Bar Harbor, Ushuaia…" autocomplete="off" aria-label="Search any town">
      <button type="button" class="td-qgo" id="sun-qgo" aria-label="Search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg></button>
    </div>
    <ul class="hs-results" id="sun-results" hidden></ul>
    <p class="hint"><button type="button" class="chip" id="sun-loc">Use my precise location</button> <a class="chip" href="/sun/">Listed cities</a></p>
    <p class="hint" id="sun-fromnote"></p>
  </div>
${sunArcCard(null)}  <div class="card sun-dial-card">
    <h2>24-hour sun clock <input type="date" class="sun-hdate" id="sun-date" aria-label="Pick any date"></h2>
    <div class="sun-dial-wrap">
      <svg id="sun-dial" viewBox="0 0 292 292" role="img" aria-label="24-hour sun clock for this location"></svg>
    </div>
    <div class="sun-side">
      <div class="sun-srow"><span>First light</span><b id="sun-dawn">—</b></div>
      <div class="sun-srow sun-main"><span>Sunrise</span><b id="sun-rise">—</b></div>
      <div class="sun-srow"><span>Solar noon</span><b id="sun-noon">—</b></div>
      <div class="sun-srow sun-main"><span>Sunset</span><b id="sun-set">—</b></div>
      <div class="sun-srow"><span>Last light</span><b id="sun-dusk">—</b></div>
      <div class="sun-srow"><span>Day length</span><b id="sun-len">—</b></div>
      <p class="hint" id="sun-dial-note"></p>
      <p class="hint"><button type="button" class="chip" id="sun-save">＋ Save to My Cities</button> <span class="sun-ok" id="sun-saveok" hidden>✓ In My Cities</span> <span id="sun-today"></span></p>
      <p class="hint">First and last light are civil twilight — the sun less than 6° below the horizon. Accurate to a minute or two.</p>
    </div>
  </div>
${sunNowCard(null, orreryFigure(), orreryCaption(), tideNote(null) + simLink({}))}${goldMoonCard(null)}<div class="duo">
  <div class="card">
    <h2>Next 7 days</h2>
    <div class="td-tablewrap"><table class="sun-table" id="sun-week"></table></div>
  </div>
  <div class="card">
    <h2>Sunrise &amp; sunset through the year</h2>
    <div class="sun-year-wrap" id="sun-year-wrap" tabindex="0" role="group" aria-label="Annual sunrise and sunset trend for this location. Use the left and right arrow keys to read any date.">
      <svg id="sun-year" viewBox="0 0 640 260" role="img" aria-label="Annual sunrise and sunset trend for this location"></svg>
      <div class="sun-yt" id="sun-yt" hidden aria-hidden="true"></div>
      <p class="visually-hidden" id="sun-yt-live" role="status" aria-live="polite"></p>
    </div>
    <p class="hint" id="sun-year-note"></p>
  </div>
  </div>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
<script>${anywhereJs}</script>
</body>
</html>
`;
  mkdirSync(join(root, "sun", "anywhere"), { recursive: true });
  writeFileSync(join(root, "sun", "anywhere", "index.html"), html);

  /* the lazy search index */
  writeFileSync(join(root, "sun", "cities.json"), JSON.stringify(SEARCH_INDEX));

  /* ---- /sun/near-me/ — an INDEXABLE "sunrise & sunset near me" landing page
   * landing page that mirrors /tides/near-me/: it auto-detects the visitor's
   * location on load and shows today's sun times (dial, twilight, day length,
   * 7-day, annual) for their exact spot, reusing the same client tool as the
   * city pages. If location is denied/unavailable it falls back to a "use my
   * location" retry plus a server-rendered list of popular cities and a link to
   * search any city — never a dead end. A ?lat/lon URL (shared link or retry)
   * renders that spot directly. ---- */
  const POPULAR_SUN_SLUGS = ["new-york", "los-angeles", "chicago", "houston", "phoenix", "seattle", "miami", "denver", "boston", "atlanta", "san-francisco", "dallas"];
  const popularSun = POPULAR_SUN_SLUGS.map((sl) => SUN_CITIES.find((c) => c.slug === sl)).filter(Boolean);
  const mlPath = "/sun/near-me/";
  const mlFaq = [
    ["How do I get sunrise and sunset for my location?", "Allow location access and this page computes today's sunrise, sunset, first light, last light, solar noon and day length for your exact spot — plus a 24-hour sun dial and the next 7 days. Everything is worked out on your device from your coordinates, so it's always current. If you'd rather not share your location, pick one of the popular cities below or search any city."],
    ["Is it my exact location's sunrise and sunset?", "Yes — when you allow location access the times are calculated for your precise latitude and longitude, so they're accurate to about a minute. Sunrise and sunset shift by a few minutes over even a short distance, so your exact spot gives the best answer."],
    ["Do I have to share my location?", "No. If you skip or deny the location prompt, use the search or tap a popular city — every city page shows the same sunrise, sunset, twilight, day length and yearly trend. You can also add your city with the ＋ button and it appears on your saved list across the site."],
    ["Is this free? Do I need an account?", "Completely free, no sign-up. It runs entirely in your browser and works on any phone, tablet or computer."],
  ];
  /* the prompt IS the card — so when the location comes through and the prompt
     hides, an empty rounded box doesn't stay behind above the results */
  const mlBodyMarkup = `  <div class="card" id="ml-prompt">
    <div class="nm-statusrow">
      <span class="nm-spinner" id="ml-spinner" aria-hidden="true"></span>
      <p class="nm-status" id="ml-status" role="status">Detecting your location…</p>
    </div>
    <button type="button" class="btn" id="ml-locate" style="width:auto" hidden>📍 Use my location</button>
    <noscript><p class="hint">Turn on JavaScript to auto-detect your location, or pick a city below.</p></noscript>
  </div>
  <div id="ml-tool" hidden>
${sunArcCard(null)}  <div class="card sun-dial-card">
    <h2>24-hour sun clock <input type="date" class="sun-hdate" id="sun-date" aria-label="Pick any date"></h2>
    <div class="sun-dial-wrap">
      <svg id="sun-dial" viewBox="0 0 292 292" role="img" aria-label="24-hour sun clock for your location"></svg>
    </div>
    <div class="sun-side">
      <div class="sun-srow"><span>First light</span><b id="sun-dawn">—</b></div>
      <div class="sun-srow sun-main"><span>Sunrise</span><b id="sun-rise">—</b></div>
      <div class="sun-srow"><span>Solar noon</span><b id="sun-noon">—</b></div>
      <div class="sun-srow sun-main"><span>Sunset</span><b id="sun-set">—</b></div>
      <div class="sun-srow"><span>Last light</span><b id="sun-dusk">—</b></div>
      <div class="sun-srow"><span>Day length</span><b id="sun-len">—</b></div>
      <p class="hint" id="sun-dial-note"></p>
      <p class="hint"><button type="button" class="chip" id="sun-save">＋ Save to My Cities</button> <span class="sun-ok" id="sun-saveok" hidden>✓ In My Cities</span> <span id="sun-today"></span></p>
      <p class="hint">First and last light are civil twilight — the sun less than 6° below the horizon. Accurate to a minute or two.</p>
    </div>
  </div>
  <p id="ml-place" class="hint ml-place" hidden></p>
${sunNowCard(null, orreryFigure(), orreryCaption(), tideNote(null) + simLink({}))}${goldMoonCard(null)}<div class="duo">
  <div class="card">
    <h2>Next 7 days</h2>
    <div class="td-tablewrap"><table class="sun-table" id="sun-week"></table></div>
  </div>
  <div class="card">
    <h2>Sunrise &amp; sunset through the year</h2>
    <div class="sun-year-wrap" id="sun-year-wrap" tabindex="0" role="group" aria-label="Annual sunrise and sunset trend for your location. Use the left and right arrow keys to read any date.">
      <svg id="sun-year" viewBox="0 0 640 260" role="img" aria-label="Annual sunrise and sunset trend for your location"></svg>
      <div class="sun-yt" id="sun-yt" hidden aria-hidden="true"></div>
      <p class="visually-hidden" id="sun-yt-live" role="status" aria-live="polite"></p>
    </div>
    <p class="hint" id="sun-year-note"></p>
  </div>
  </div>
  </div>
  <div class="card">
    <h2>Popular sunrise &amp; sunset pages</h2>
    <p class="hint" style="margin:0 0 8px">Prefer not to share your location? Jump straight to a city:</p>
    <div class="timer-presets">${popularSun.map((c) => `<a class="chip" href="/sun/${c.slug}/">${esc(c.city)}</a>`).join("")}</div>
    <p class="hint">Any other city — <a href="/sun/">search all sunrise &amp; sunset pages →</a></p>
  </div>
  <div class="card cd-answer">
    ${mlFaq.map(([q, a]) => `<h2>${esc(q)}</h2><p>${esc(a)}</p>`).join("\n    ")}
  </div>`;
  const mlJs = `
(function(){
  var deviceTz='UTC'; try{ deviceTz=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'; }catch(e){}
  var qs=new URLSearchParams(location.search);
  var C=null, NAME='your location';
  var promptEl=document.getElementById('ml-prompt'), statusEl=document.getElementById('ml-status'),
      locateBtn=document.getElementById('ml-locate'), spin=document.getElementById('ml-spinner'),
      toolEl=document.getElementById('ml-tool'), placeEl=document.getElementById('ml-place'),
      subEl=document.getElementById('ml-sub');
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  var settled=false, watchdog=0;
  ${SAVE_JS}
  function renderTool(){
    ${PAGE_BODY_JS}
    try{ wireSave({slug:'@'+C.lat+','+C.lon, city:NAME, tz:C.tz, lat:C.lat, lon:C.lon,
      url:'/sun/near-me/?lat='+C.lat+'&lon='+C.lon+'&tz='+encodeURIComponent(C.tz)+'&name='+encodeURIComponent(NAME)}); }catch(e){}
  }
  /* the coordinates, as a Google Maps link — the one way a visitor can actually
     check that the spot the browser handed us is where they are */
  function coordLink(){
    return '<a href="https://www.google.com/maps?q='+C.lat+','+C.lon+'" target="_blank" rel="noopener" title="Open this spot in Google Maps">'+
      C.lat.toFixed(3)+'\\u00b0, '+C.lon.toFixed(3)+'\\u00b0</a>';
  }
  function updatePlace(){
    if(!C) return;
    /* the Sun-Earth-Moon view labels the reader's own spot, and on a prebuilt
       city page that name lives on C. Keep it there here too, so the picture
       picks up the reverse-geocoded name on its next repaint. */
    C.city=NAME;
    /* the line under the H1 stops asking for permission once we have it, and
       becomes the spot itself */
    if(subEl) subEl.innerHTML='Showing the location for '+coordLink()+' \\u2014 open it in Google Maps to verify your location.';
    if(!placeEl) return; placeEl.hidden=false;
    placeEl.innerHTML='Today\\u2019s sun times for <b>'+esc(NAME)+'</b>, computed for your own spot in the '+esc(C.tz.replace(/_/g,' '))+' zone.';
  }
  /* with only a generic label, look up the town/state from the coordinates (a
     free, keyless reverse geocoder) so the visitor sees a name they recognise
     and can confirm it's really their location. Coords rounded to ~1 km first. */
  function reverseName(){
    if(!C||!/^(your location|my location)$/i.test(NAME)) return;
    try{ var la=Math.round(C.lat*100)/100, lo=Math.round(C.lon*100)/100;
      fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude='+la+'&longitude='+lo+'&localityLanguage=en')
        .then(function(r){ return r.ok?r.json():null; })
        .then(function(j){ if(!j) return; var city=j.city||j.locality||'', region=j.principalSubdivision||'', cc=j.countryCode||'';
          var label=(city&&region&&city!==region)?(city+', '+region):(city||region);
          if(label&&cc&&cc!=='US') label+=' ('+(j.countryName||cc)+')';
          if(label){ NAME=label; updatePlace(); } })["catch"](function(){});
    }catch(e){}
  }
  function resolve(lat,lon,name,tz){
    settled=true; if(watchdog) clearTimeout(watchdog);
    C={lat:Math.round(lat*10000)/10000, lon:Math.round(lon*10000)/10000, tz:tz||deviceTz};
    NAME=name||'your location';
    if(spin) spin.hidden=true;
    if(promptEl) promptEl.hidden=true;
    updatePlace();
    if(toolEl) toolEl.hidden=false;
    document.title='Sunrise & Sunset at My Location';
    renderTool();
    reverseName();
  }
  function fail(msg){ settled=true; if(watchdog) clearTimeout(watchdog); if(spin) spin.hidden=true; if(statusEl) statusEl.textContent=msg; if(locateBtn) locateBtn.hidden=false; }
  var BLOCKED='Location is blocked for this site. Allow it in your browser\\u2019s site settings (the icon beside the address bar), then tap \\u201cUse my location\\u201d \\u2014 or pick a popular city below.';
  /* The browser's timeout clock starts when getCurrentPosition is CALLED and
     keeps running while the permission prompt sits on screen. A short window
     therefore fails the visitor who takes a few seconds to read the prompt and
     tap Allow: they grant permission and still get "we couldn't get your
     location", with no retry. So size the window to what we're waiting for —
     a fresh prompt needs room for a human, an already-granted site doesn't. */
  var GRANTED_MS=12000, PROMPT_MS=45000;
  function ask(ms){
    /* backstop for a call that fires NEITHER callback (some browsers/devices);
       it has to outlast the request's own timeout, never undercut it */
    if(watchdog) clearTimeout(watchdog);
    watchdog=setTimeout(function(){ if(!settled) fail('Still trying to find you \\u2014 tap \\u201cUse my location\\u201d to retry, or pick a popular city below.'); }, ms+3000);
    navigator.geolocation.getCurrentPosition(
      function(pos){ resolve(pos.coords.latitude,pos.coords.longitude,'your location',deviceTz); },
      function(err){
        var code=err&&err.code;
        /* timed out on the short window: the permission wasn't as settled as
           the Permissions API claimed, or the first fix is slow. Ask once more
           with room for a prompt rather than giving up on the visitor. */
        if(code===3&&ms===GRANTED_MS){ ask(PROMPT_MS); return; }
        fail(code===1 ? BLOCKED
          : code===3 ? 'Finding you took too long. Tap \\u201cUse my location\\u201d to try again, or pick a popular city below.'
          : 'We couldn\\u2019t get your location. Tap \\u201cUse my location\\u201d to try again, or pick a popular city below.');
      },
      {timeout:ms, maximumAge:600000});
  }
  function locate(){
    if(!navigator.geolocation){ fail('Your browser can\\u2019t share your location. Pick a popular city below, or search any city.'); return; }
    settled=false; if(spin) spin.hidden=false;
    if(statusEl) statusEl.textContent='Detecting your location\\u2026';
    if(locateBtn) locateBtn.hidden=true;
    function go(state){
      if(state==='denied'){ fail(BLOCKED); return; }   /* don't fire a doomed request */
      ask(state==='granted'?GRANTED_MS:PROMPT_MS);
    }
    /* the Permissions API isn't everywhere (older Safari); without it, assume a
       prompt is coming and use the long window */
    try{
      if(navigator.permissions&&navigator.permissions.query)
        navigator.permissions.query({name:'geolocation'}).then(function(s){ go(s.state); },function(){ go('prompt'); });
      else go('prompt');
    }catch(e){ go('prompt'); }
  }
  if(locateBtn) locateBtn.addEventListener('click',locate);
  var la=parseFloat(qs.get('lat')), lo=parseFloat(qs.get('lon'));
  if(isFinite(la)&&isFinite(lo)&&Math.abs(la)<=89.9&&Math.abs(lo)<=180){
    var tz=qs.get('tz')||deviceTz; try{ new Intl.DateTimeFormat('en-US',{timeZone:tz}); }catch(e){ tz=deviceTz; }
    resolve(la,lo,(qs.get('name')||'your location').slice(0,80),tz);
  } else { locate(); }
})();`;
  const mlHtml = `<!DOCTYPE html>
<html lang="en">
<head>
${head({
  title: "Sunrise & Sunset Near Me — Exact Local Times",
  preconnect: ["https://api.bigdatacloud.net"],
  desc: "See today's sunrise and sunset times for your exact location — first light, last light, solar noon, day length, a 24-hour sun dial, and the next 7 days. Allow location or pick your city.",
  path: mlPath,
  faq: mlFaq,
})}
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Sunrise & Sunset", url: "/sun/" }, { name: "My location", url: mlPath }]).replace(/</g, "\\u003c")}</script>
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "sun", url: "/sun/" }, page: { label: "My location", url: mlPath } })}
  <h1>Sunrise &amp; Sunset at My Location</h1>
  <p class="sub" id="ml-sub">Allow location access to see today's sunrise and sunset.</p>
${mlBodyMarkup}
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
<script>${mlJs}</script>
</body>
</html>
`;
  mkdirSync(join(root, "sun", "near-me"), { recursive: true });
  writeFileSync(join(root, "sun", "near-me", "index.html"), mlHtml);
}

/* ---- hub ---- */
if (isMain) {
const us = SUN_CITIES.filter((c) => c.area === "USA").sort((a, b) => a.city.localeCompare(b.city));
const world = SUN_CITIES.filter((c) => c.area !== "USA").sort((a, b) => a.city.localeCompare(b.city));
const chip = (c) => `<a class="chip" href="/sun/${c.slug}/">${esc(c.city)}</a>`;
const hubFaq = [
  ["How accurate are the times?", "These are calculated estimates, computed live in your browser with a standard solar-position method (the SunCalc library) from each city's listed coordinates — so they're always for today's date and can't go stale. Actual observed sunrise and sunset can differ by a few minutes with terrain, elevation, weather, atmospheric refraction, and how far you are from the listed coordinates."],
  ["Whose time zone are the times in?", "Each city page shows times in that city's own local time zone, labelled on the page."],
  ["What's the difference between sunrise and first light?", "First light (civil dawn) is when the sun reaches 6° below the horizon — bright enough to see clearly. Sunrise is when the sun's upper edge crosses the horizon itself."],
];
/* THE HUB CONTROLLER, MOVED TO THE END OF THE BODY.
 * It is 41KB (the city list is most of it) and it used to sit inline at the
 * 46% mark of the document, where the parser stops dead until it has run —
 * so the six cards below it could not render until a 41KB script had been
 * compiled and executed. Same bytes, same single request, still inline: only
 * the position changed, so everything above it now paints first.
 * It stays a plain (non-defer) inline block because build-inline hoists it
 * into a hashed, deferred external file on the way out. */
const HUB_JS = `  <script>
  (function(){
    var LIST=${JSON.stringify(SUN_CITIES.map((c) => [c.slug, c.city, c.tz, c.lat, c.lon]))};
    ${AC_JS}
    ${SUN_JS}
    ${DIAL_JS}
    /* match the visitor's device time zone to a city: exact IANA match first,
       then any city whose zone shows the same clock time right now, else NYC */
    var tz="UTC"; try{ tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC"; }catch(e){}
    function clockOf(z){ try{ return new Intl.DateTimeFormat('en-GB',{timeZone:z,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()); }catch(e){ return ""; } }
    var hit=null,i;
    /* Several cities share a zone and LIST is alphabetical, so a plain
       first-match gave a New York visitor Atlanta and a London one Edinburgh.
       Harmless while it only ranked mini dials; the new "Nearby cities" list
       says "Closest to X" out loud, so prefer the city the ZONE IS NAMED
       AFTER (America/New_York -> New York), falling back to first-in-zone.
       Same rule /moon/ uses. */
    var tzNamed=tz.split('/').pop().toLowerCase().replace(/_/g,'-'), tzFirst=null;
    for(i=0;i<LIST.length;i++){ if(LIST[i][2]!==tz) continue;
      if(LIST[i][0]===tzNamed){ hit=LIST[i]; break; } if(!tzFirst) tzFirst=LIST[i]; }
    if(!hit) hit=tzFirst;
    if(!hit){ var mine=clockOf(tz); for(i=0;i<LIST.length;i++){ if(clockOf(LIST[i][2])===mine){ hit=LIST[i]; break; } } }
    if(!hit) for(i=0;i<LIST.length;i++){ if(LIST[i][0]==="new-york"){ hit=LIST[i]; break; } }
    if(!hit) hit=LIST[0];
    var now=new Date(), curNearest=hit;
    function hodOf(ms,tz){ var p=new Intl.DateTimeFormat('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ms)).split(':'); return +p[0]+p[1]/60; }
    function hmOf(ms,tz){ try{ return new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',minute:'2-digit'}).format(new Date(ms)); }catch(e){ return '—'; } }
    function dmin(m){ var r=Math.round(m); return (r>=0?'+':'−')+Math.abs(r)+'m'; }
    /* mini sundials: nearest city first, then the two next-closest (stable
       for this visitor), then saved cities, and the rest filled from a
       per-visit random shuffle so the "beyond" picks vary between visits */
    var SHUF=LIST.slice();
    for(var si=SHUF.length-1;si>0;si--){ var sj=Math.floor(Math.random()*(si+1)), st=SHUF[si]; SHUF[si]=SHUF[sj]; SHUF[sj]=st; }
    function renderMinis(){
      var box=document.getElementById('sun-minis'); if(!box) return;
      var seen={}, cands=[];
      function push(c2){ if(!c2||seen[c2[0]]) return; seen[c2[0]]=1; cands.push(c2); }
      push(curNearest);
      /* the visitor's saved cities come next (they may be small towns saved on
         /sun/anywhere/ that aren't in LIST at all) */
      favs().forEach(function(f){ if(f.tz&&f.lat!=null) push([f.slug,f.city,f.tz,f.lat,f.lon,f.url]); });
      /* then fill from big cities spread NORTH and SOUTH of here (SHUF is a
         per-visit shuffle of LIST), alternating so the day length visibly swings
         with latitude — no fixed reference city */
      var myLat=curNearest[3], north=[], south=[];
      for(var kn=0;kn<SHUF.length;kn++){ (SHUF[kn][3]>myLat?north:south).push(SHUF[kn]); }
      for(var ni=0,sj=0,turn=0; cands.length<8 && (ni<north.length||sj<south.length); turn^=1){
        if(turn===0){ if(ni<north.length) push(north[ni++]); } else { if(sj<south.length) push(south[sj++]); } }
      cands=cands.slice(0,8);
      box.innerHTML='';
      cands.forEach(function(c2,idx){
        var S2=sunCalc(now,c2[3],c2[4],-0.833), TW2=sunCalc(now,c2[3],c2[4],-6);
        var card=document.createElement('div'); card.className='sun-mini-card';
        var link=document.createElement('a'); link.href=c2[5]||'/sun/'+c2[0]+'/'; link.className='sun-mini-link';
        link.setAttribute('aria-label',c2[1]+' sunrise and sunset');
        var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.setAttribute('viewBox','0 0 292 292'); svg.setAttribute('aria-hidden','true');
        link.appendChild(svg);
        var tag=idx===0?' · nearest':(c2[3]>myLat?' · north':' · south');
        var nm=document.createElement('span'); nm.className='sun-mini-name'; nm.textContent=c2[1]+tag;
        link.appendChild(nm); card.appendChild(link);
        var tm=document.createElement('div'); tm.className='sun-mini-times';
        tm.textContent=(S2.rise?'↑ '+hmOf(S2.rise,c2[2]):'↑ —')+'  ↓ '+(S2.set?hmOf(S2.set,c2[2]):'—'); card.appendChild(tm);
        box.appendChild(card);
        /* live:true so every mini hand ticks each minute and snaps to the
           right time when the tab is refocused (append first — the dial's
           self-cleanup checks svg.isConnected) */
        drawDial(S2,TW2,c2[2],svg,{hand:true,live:true});
      });
      var note=document.getElementById('sun-minis-note');
      if(note) note.textContent='On each dial the gold band is daylight and the dashes mark first and last light; the hand shows the local time there right now. Cities are spread north and south of you so you can see how the day length shifts with latitude.';
    }
    var locBtn=document.getElementById('sun-loc');
    if(locBtn) locBtn.addEventListener('click',function(){
      if(!navigator.geolocation){ locBtn.textContent='Location unavailable'; return; }
      locBtn.textContent='Locating…';
      navigator.geolocation.getCurrentPosition(function(pos){
        setFix(pos.coords.latitude,pos.coords.longitude,true);
        locBtn.textContent='Use my precise location';
      },function(){ locBtn.textContent='Location denied — using your clock'; setTimeout(function(){ locBtn.textContent='Use my precise location'; },2500); });
    });

    /* "My location" is a plain link to /sun/near-me/ — that page already
       asks for GPS and computes the sun for the exact spot, which beats
       redirecting to whichever listed city happens to be closest. */

    /* ---- search a city or state: the inline LIST answers the first
       keystrokes instantly while the full ~1,100-city index lazy-loads;
       typing a state (name or abbreviation) lists that state's cities
       closest-first; anything else falls through to /sun/anywhere/ ---- */
    var q=document.getElementById('sun-q'), res=document.getElementById('sun-results'), go=document.getElementById('sun-qgo');
    var STATES=${JSON.stringify(STATE_ABBR)};
    var FULL=null, fetching=false;
    var fullWaiting=[];
    function ensureFull(cb){ if(cb) fullWaiting.push(cb);
      if(FULL){ var w=fullWaiting; fullWaiting=[]; w.forEach(function(f){f();}); return; }
      if(fetching) return; fetching=true;
      fetch('/sun/cities.json').then(function(r){return r.json();}).then(function(j){ FULL=j; renderRes();
        var w2=fullWaiting; fullWaiting=[]; w2.forEach(function(f){f();}); }).catch(function(){ fetching=false; fullWaiting=[]; }); }
    function dq(c2){ var dx=c2[3]-curNearest[3], dy=c2[4]-curNearest[4]; return dx*dx+dy*dy; }
    function stateOf(v){ if(v.length===2){ var up=v.toUpperCase(); for(var k in STATES){ if(STATES[k]===up) return up; } }
      if(v.length>=4){ for(var k2 in STATES){ if(k2.toLowerCase().indexOf(v)===0) return STATES[k2]; } } return null; }
    /* "canby oregon" -> {q:"canby", st:"OR"}; "salem, or" -> {q:"salem", st:"OR"} */
    function splitPlace(v){ v=v.trim().replace(/  +/g,' ');
      var lo=v.toLowerCase(), k, kl;
      for(k in STATES){ kl=k.toLowerCase();
        if(lo.length>kl.length+1&&lo.slice(-kl.length)===kl){ var rest=v.slice(0,v.length-kl.length).replace(/[ ,]+$/,''); if(rest) return {q:rest, st:STATES[k], state:k}; } }
      var m=v.match(/^(.+?)[ ,]+([A-Za-z]{2})$/);
      if(m){ var up=m[2].toUpperCase(); for(k in STATES){ if(STATES[k]===up) return {q:m[1].replace(/[ ,]+$/,''), st:up, state:k}; } }
      return {q:v, st:null, state:null}; }
    function matches(v){ var src=FULL||LIST; v=v.trim().toLowerCase(); if(!v) return [];
      var ab=stateOf(v), out=[], j;
      if(ab){ for(j=0;j<src.length;j++){ if(src[j][1].slice(-4)===', '+ab) out.push(src[j]); }
        out.sort(function(a,b){ return dq(a)-dq(b); }); if(out.length) return out.slice(0,12); }
      var sp=splitPlace(v);
      if(sp.st){ var out2=[], q2=sp.q.toLowerCase(), suf=(', '+sp.st).toLowerCase();
        for(j=0;j<src.length;j++){ var lb=src[j][1].toLowerCase();
          if(lb.slice(-4)===suf&&lb.indexOf(q2)===0) out2.push(src[j]); }
        if(out2.length) return out2.slice(0,10); }
      /* shared ranking (lib.mjs AC_JS): quality buckets, population order
         inside a bucket, cities near the visitor pulled forward */
      return acRank(src,v,curNearest?[curNearest[3],curNearest[4]]:null,10); }
    /* towns not in the index resolve right here in the dropdown: when the
       local index has no match, Open-Meteo geocoding fills the list and a
       click lands on the sun page for that exact spot — same row shape as
       local results, so ＋ Save works on them too */
    var omSeq=0, omTimer=null, omRows=[], omBusy=false, omDone=false;
    function omSearch(v){ var seq=++omSeq; omBusy=true; omDone=false;
      var sp=splitPlace(v);
      fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(sp.q)+'&count=10&language=en&format=json')
        .then(function(r){ return r.json(); })
        .then(function(j){ if(seq!==omSeq) return; omBusy=false; omDone=true;
          var rs=j.results||[];
          if(sp.st){ var f=rs.filter(function(r2){ return r2.country_code==='US'&&r2.admin1===sp.state; }); if(f.length) rs=f; }
          omRows=rs.slice(0,6).map(function(r2){
            var nm=r2.name+(r2.admin1?', '+r2.admin1:'');
            var lbl=nm+(r2.country_code&&r2.country_code!=='US'?' · '+r2.country_code:'');
            return ['@'+r2.latitude.toFixed(4)+','+r2.longitude.toFixed(4), lbl, r2.timezone||tz, r2.latitude, r2.longitude,
              '/sun/anywhere/?lat='+r2.latitude.toFixed(4)+'&lon='+r2.longitude.toFixed(4)+'&tz='+encodeURIComponent(r2.timezone||tz)+'&name='+encodeURIComponent(nm)];
          });
          renderRes(); })
        .catch(function(){ if(seq!==omSeq) return; omBusy=false; omDone=true; renderRes(); }); }
    function renderRes(){ var v=q.value.trim(), all=matches(v).concat(omRows); res.innerHTML='';
      acKeyboardReset();
      res.hidden=!(all.length||(v.length>=3&&(omBusy||omDone)));
      all.forEach(function(c2){ var li=document.createElement('li'), a=document.createElement('a');
        a.href=c2[5]||'/sun/'+c2[0]+'/'; a.appendChild(acMark(c2[1],v));
        var sv=document.createElement('button'); sv.type='button'; sv.className='chip sun-mini'; sv.textContent='＋ Save';
        sv.addEventListener('click',function(ev){ ev.preventDefault(); ev.stopPropagation(); favAdd(c2); q.value=''; res.hidden=true; });
        if(favs().some(function(f){return f.slug===c2[0];})){ sv.textContent='✓ Saved'; sv.disabled=true; }
        li.appendChild(a); li.appendChild(sv); res.appendChild(li); });
      if(!all.length&&v.length>=3){ var li3=document.createElement('li'); li3.className='td-none';
        li3.textContent=omBusy?'Searching the map…':(omDone?'No location found for “'+v+'” — check the spelling or try a nearby town.':'Searching the map…'); res.appendChild(li3); } }
    function anyQHref(){ return '/sun/anywhere/?q='+encodeURIComponent(q.value.trim().slice(0,60)); }
    if(q){ q.addEventListener('input',function(){ ensureFull(); omRows=[]; omDone=false;
      if(omTimer) clearTimeout(omTimer);
      var v=q.value.trim();
      if(v.length>=3) omTimer=setTimeout(function(){ if(!matches(q.value).length){ omSearch(q.value.trim()); renderRes(); } },350);
      renderRes(); });
      acKeyboard(q,res);
      q.addEventListener('keydown',function(e){ if(e.key!=='Enter') return; e.preventDefault();
        var hi=acSelected(res); if(hi){ location.href=hi.href; return; }
        var m=matches(q.value).concat(omRows);
        if(m.length) location.href=m[0][5]||'/sun/'+m[0][0]+'/';
        else if(q.value.trim().length>=2) location.href=anyQHref(); });
      document.addEventListener('click',function(e){ if(document.contains(e.target)&&!e.target.closest('#sun-q,#sun-results,#sun-qgo')) res.hidden=true; }); }
    if(go) go.addEventListener('click',function(){ var m=matches(q.value).concat(omRows);
      if(m.length) location.href=m[0][5]||'/sun/'+m[0][0]+'/';
      else if(q.value.trim().length>=2) location.href=anyQHref(); else q.focus(); });

    /* ---- "Nearby cities": drop the closest cities into the search dropdown.
       Ranked by real great-circle miles rather than the squared-degree sort
       used for tie-breaking elsewhere — degrees of longitude shrink toward the
       poles, so at high latitude that ordering is visibly wrong. Distance is
       measured from the same place the rest of the page uses (the tz-matched
       city, upgraded if the visitor allowed GPS) and the index lazy-loads, so
       the list is real towns near you, not just the big world cities. */
    function milesFrom(c2){ var R=3958.8, t=Math.PI/180;
      var dLa=(c2[3]-curNearest[3])*t, dLo=(c2[4]-curNearest[4])*t;
      var x=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(curNearest[3]*t)*Math.cos(c2[3]*t)*Math.sin(dLo/2)*Math.sin(dLo/2);
      return 2*R*Math.asin(Math.sqrt(x)); }
    var nearBtn=document.getElementById('sun-nearby'), nearOpen=false;
    function showNearby(){
      var src=FULL||LIST, out=[], i;
      for(i=0;i<src.length;i++){ if(src[i][0]===curNearest[0]) continue; out.push([src[i],milesFrom(src[i])]); }
      out.sort(function(a,b){ return a[1]-b[1]; });
      res.innerHTML='';
      var head=document.createElement('li'); head.className='td-none';
      head.textContent='Closest to '+curNearest[1]+':'; res.appendChild(head);
      out.slice(0,8).forEach(function(pair){
        var c2=pair[0], li=document.createElement('li'), a=document.createElement('a');
        a.href=c2[5]||'/sun/'+c2[0]+'/'; a.textContent=c2[1]+' — '+Math.round(pair[1])+' mi';
        var sv=document.createElement('button'); sv.type='button'; sv.className='chip sun-mini'; sv.textContent='＋ Save';
        sv.addEventListener('click',function(ev){ ev.preventDefault(); ev.stopPropagation(); favAdd(c2); res.hidden=true; setNear(false); });
        if(favs().some(function(f){return f.slug===c2[0];})){ sv.textContent='✓ Saved'; sv.disabled=true; }
        li.appendChild(a); li.appendChild(sv); res.appendChild(li); });
      res.hidden=false;
    }
    function setNear(open){ nearOpen=open; if(nearBtn) nearBtn.setAttribute('aria-expanded',open?'true':'false'); }
    if(nearBtn) nearBtn.addEventListener('click',function(e){
      e.stopPropagation();
      if(nearOpen){ res.hidden=true; setNear(false); return; }
      if(q) q.value='';
      nearBtn.textContent='Nearby cities';
      ensureFull(function(){ if(nearOpen) showNearby(); });
      setNear(true); showNearby();
    });
    /* the outside-click handler that closes the results must also reset the
       button, or it reopens on the next click */
    document.addEventListener('click',function(e){
      if(nearOpen&&document.contains(e.target)&&!e.target.closest('#sun-results,#sun-nearby')) setNear(false); });

    /* ---- where "near you" actually is -----------------------------------
       Everything above measures from curNearest, which starts as a TIME ZONE
       match — and a zone is not a location. America/Los_Angeles spans the
       whole US west coast, so a visitor in Portland is told "Closest to Los
       Angeles" and handed a list of southern-California towns 800 miles off.
       Two fixes, in order of confidence:
         setFix(lat,lon,precise) adopts a real position, and re-runs the match
         once the full ~1,100-city index has landed — matching against LIST
         alone (the curated world cities) would answer Portland with Seattle
         at 145 mi while Beaverton sits 7 mi away. fixSeq drops a stale
         re-match if a better position arrived while the index was loading,
         and a precise (GPS) fix is never overwritten by a coarse one.
       The coarse source is /api/geo, the Cloudflare Function that echoes the
       approximate lat/lon the edge already attached to this request: no
       permission prompt, no external call, no cookie. It runs after the first
       paint and only ever replaces the guess, so the page never waits on it
       and still works when the endpoint is absent (local preview, or
       Functions disabled) — same approach /moon/ uses. */
    function nearestTo(lat,lon){
      var src=FULL||LIST, best=null, bd=1e9, i, R=3958.8, t=Math.PI/180;
      for(i=0;i<src.length;i++){
        var dLa=(src[i][3]-lat)*t, dLo=(src[i][4]-lon)*t;
        var x=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(lat*t)*Math.cos(src[i][3]*t)*Math.sin(dLo/2)*Math.sin(dLo/2);
        var mi=2*R*Math.asin(Math.sqrt(x));
        if(mi<bd){ bd=mi; best=src[i]; }
      }
      return best;
    }
    var fixSeq=0, fixPrecise=false;
    function setFix(lat,lon,precise){
      if(fixPrecise&&!precise) return;
      if(precise) fixPrecise=true;
      var seq=++fixSeq;
      function use(){
        if(seq!==fixSeq) return;
        var best=nearestTo(lat,lon);
        if(!best||best[0]===curNearest[0]) return;
        curNearest=best; renderMinis();
        /* refresh the list in place if it happens to be open */
        if(nearOpen) showNearby();
      }
      use(); ensureFull(use);
    }
    function refineFromEdge(){
      fetch('/api/geo').then(function(r){ return r.ok?r.json():null; }).then(function(g){
        if(g&&g.lat!=null&&g.lon!=null) setFix(g.lat,g.lon,false);
      }).catch(function(){});
    }

    /* ---- My Cities: saved list (sun_favs) with a Default radio + Edit,
       mirroring the tides page; seeded from saved tide stations ---- */
    function favs(){ try{ return JSON.parse(localStorage.getItem('sun_favs'))||[]; }catch(e){ return []; } }
    function favSet(v){ try{ localStorage.setItem('sun_favs',JSON.stringify(v)); }catch(e){} }
    function homeGet(){ try{ return localStorage.getItem('sun_home')||''; }catch(e){ return ''; } }
    function homeSet(v){ try{ localStorage.setItem('sun_home',v); }catch(e){} }
    var editing=false;
    var myBtn=document.getElementById('sun-mybtn'), myPanel=document.getElementById('sun-mypanel'), ed=document.getElementById('sun-myedit');
    function favAdd(c2){ var f=favs(); if(f.some(function(x){return x.slug===c2[0];})) return;
      var o={slug:c2[0],city:c2[1],tz:c2[2],lat:c2[3],lon:c2[4]}; if(c2[5]) o.url=c2[5];
      f.push(o); favSet(f); renderMy(); renderMinis(); }
    function renderMy(){
      var listEl=document.getElementById('sun-mylist'); if(!listEl) return;
      var f=favs(), home=homeGet();
      var col=document.getElementById('sun-mycol'); if(col) col.textContent=editing?'Delete':'Default';
      if(ed) ed.disabled=!f.length;
      listEl.innerHTML='';
      if(!f.length){ var none=document.createElement('p'); none.className='td-none'; none.textContent='No cities yet — search above and tap ＋ Save.'; listEl.appendChild(none); renderSeed(); return; }
      f.forEach(function(c2){
        var row=document.createElement('div'); row.className='td-myitem';
        var a=document.createElement('a'); a.href=c2.url||'/sun/'+c2.slug+'/'; a.textContent=c2.city; a.style.flex='1'; row.appendChild(a);
        if(editing){ var x=document.createElement('button'); x.type='button'; x.className='chip sun-mini'; x.textContent='✕';
          x.setAttribute('aria-label','Remove '+c2.city);
          x.addEventListener('click',function(){ favSet(favs().filter(function(y){return y.slug!==c2.slug;})); if(homeGet()===c2.slug) homeSet(''); renderMy(); renderMinis(); });
          row.appendChild(x); }
        else { var r=document.createElement('input'); r.type='radio'; r.name='sun-def'; r.checked=(home===c2.slug);
          r.setAttribute('aria-label','Make '+c2.city+' the default');
          r.addEventListener('change',function(){ homeSet(c2.slug); renderMy(); });
          row.appendChild(r); }
        listEl.appendChild(row); });
      renderSeed();
    }
    function syncDisc(){ if(myBtn&&myPanel) myBtn.setAttribute('aria-expanded', myPanel.hidden?'false':'true'); }
    if(myBtn) myBtn.addEventListener('click',function(){ myPanel.hidden=!myPanel.hidden; if(!myPanel.hidden){ editing=false; if(ed) ed.textContent='Edit'; renderMy(); } syncDisc(); });
    if(ed) ed.addEventListener('click',function(){ editing=!editing; ed.textContent=editing?'Done':'Edit'; if(myPanel) myPanel.hidden=false; renderMy(); syncDisc(); });
    document.addEventListener('click',function(e){ if(myPanel&&document.contains(e.target)&&!e.target.closest('.td-saved-wrap')){ myPanel.hidden=true; syncDisc(); } });
    syncDisc();
    /* seed suggestions from the tides page's saved stations (td_favs + td_home):
       nearest listed city within ~150 miles, skipping already-saved cities */
    function renderSeed(){
      var seedEl=document.getElementById('sun-seed'); if(!seedEl) return;
      var tf=[]; try{ tf=(JSON.parse(localStorage.getItem('td_favs'))||[]); var th=JSON.parse(localStorage.getItem('td_home')||'null'); if(th) tf.push(th); }catch(e){}
      var have={}; favs().forEach(function(f){ have[f.slug]=1; });
      var sugg=[], seen={};
      tf.forEach(function(st){ if(st==null||st.lat==null) return;
        var best=null,bd=1e9,j;
        for(j=0;j<LIST.length;j++){ var dx=(LIST[j][3]-st.lat), dy=(LIST[j][4]-(st.lng!=null?st.lng:st.lon)), dd=dx*dx+dy*dy;
          if(dd<bd){ bd=dd; best=LIST[j]; } }
        if(best&&bd<4&&!have[best[0]]&&!seen[best[0]]){ seen[best[0]]=1; sugg.push(best); } });
      seedEl.innerHTML=''; seedEl.hidden=!sugg.length;
      if(!sugg.length) return;
      var p=document.createElement('p'); p.className='hint'; p.textContent='From your saved tide stations:'; seedEl.appendChild(p);
      sugg.forEach(function(c2){ var b=document.createElement('button'); b.type='button'; b.className='chip';
        b.textContent='＋ '+c2[1]; b.addEventListener('click',function(){ favAdd(c2); }); seedEl.appendChild(b); });
    }
    renderMy();
    renderMinis();
    refineFromEdge();
    /* Warm the search index once the page is idle. It used to be fetched by
       the FIRST KEYSTROKE, so the opening characters were matched against the
       curated world cities alone and the list visibly rewrote itself a moment
       later — typing "port" showed nothing until Portland arrived. */
    if(window.requestIdleCallback) requestIdleCallback(function(){ ensureFull(); },{timeout:2500});
    else setTimeout(function(){ ensureFull(); },600);
    var pk=document.getElementById('sun-dial-pick'); if(pk) pk.innerHTML='Showing the nearest listed city to your clock. Not yours? <a href="/sun/'+hit[0]+'/">Open '+hit[1]+'\u2019s full page</a> or pick any city below.';
  })();
  </script>`;

const hub = `<!DOCTYPE html>
<html lang="en">
<head>
${head({
  title: "Sunrise and Sunset Times Today — Any Location",
  preconnect: ["https://geocoding-api.open-meteo.com"],
  desc: "Today's sunrise & sunset times plus first light, last light, solar noon, day length and a 7-day outlook.",
  path: "/sun/",
  faq: hubFaq,
})}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "sun", url: "/sun/" } })}
  <h1>Sunrise &amp; Sunset Times</h1>
  <p class="sub">Pick a city for today's sunrise, sunset, first light, last light, solar noon and day length — plus the next 7 days. Calculated estimates, computed live from each city's coordinates for today's date.</p>
  <div class="card">
    <div class="td-qrow">
      <input id="sun-q" type="search" placeholder="Search a city or state — Miami, Salem, Oregon…" autocomplete="off" aria-label="Search a city or state">
      <button type="button" class="td-qgo" id="sun-qgo" aria-label="Search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg></button>
    </div>
    <div class="td-myrow">
      <a class="chip" href="/sun/near-me/">Use my location</a>
      <button type="button" class="chip" id="sun-nearby" aria-expanded="false" aria-controls="sun-results">Nearby cities</button>
      <!-- My Cities. The controller for this panel has always shipped on the
           hub — add, remove, pick a default, seed from saved tide stations —
           but the markup it drives was missing, so a city saved from its own
           page could never be removed or made the default from anywhere.
           Same shape as the tides page's Saved Stations, which is what the
           script was written to mirror. -->
      <span class="td-saved-wrap">
        <button type="button" class="chip" id="sun-mybtn" aria-expanded="false" aria-controls="sun-mypanel">My Cities ▾</button>
        <button type="button" class="chip" id="sun-myedit">Edit</button>
        <div class="td-panel" id="sun-mypanel" hidden>
          <div class="td-myhead"><span>City</span><span id="sun-mycol">Default</span></div>
          <div id="sun-mylist"></div>
        </div>
      </span>
    </div>
    <!-- the dropdown is absolutely positioned from wherever it sits in flow, so
         it goes AFTER the button row: placed before it, the open list covered
         "Nearby cities" and you could not click it again to close. -->
    <ul class="hs-results" id="sun-results" hidden></ul>
    <div id="sun-seed" hidden></div>
  </div>
  <div class="card">
    <h2>Today's sun — near you and beyond</h2>
    <div class="sun-minis" id="sun-minis"></div>
    <p class="hint" id="sun-minis-note"></p>
    <p class="hint"><button type="button" class="chip" id="sun-loc">Use my precise location</button></p>
  </div>
  <div class="card" id="us-cities">
    <h2>United States</h2>
    <div class="timer-presets">${us.map(chip).join("")}</div>
  </div>
  <div class="card">
    <h2>Browse by state</h2>
    <div class="timer-presets">${SUN_STATES.map((s) => `<a class="chip" href="/sun/state/${s.slug}/">${esc(s.state)}</a>`).join("")}</div>
    <p class="hint">1,000 US cities in all — every city of roughly 37,000 people or more. Smaller towns: <a href="/sun/anywhere/">sun times for any location →</a></p>
  </div>
  <div class="card">
    <details class="sun-world">
      <summary><h2>Around the world (${world.length} cities)</h2></summary>
      <div class="timer-presets">${world.map(chip).join("")}</div>
    </details>
  </div>
  <div class="card">
    ${hubFaq.map(([q, a]) => `<h2>${esc(q)}</h2><p>${esc(a)}</p>`).join("\n    ")}
  </div>
  <div class="card">
    <h2>More sun &amp; time tools</h2>
    <p>The <a href="/world-clock/">world clock</a> shows live times and today's sunrise/sunset around the globe at a glance. Counting down to a season? Try the <a href="/holiday-countdowns/summer-solstice/">summer solstice countdown</a>. Want the maths? <a href="/methodology/sunrise-sunset/">How sunrise and sunset are calculated</a>.</p>
  </div>
${hubQuestionsCard("/sun/")}
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${HUB_JS}</body>
</html>
`;
mkdirSync(join(root, "sun"), { recursive: true });
writeFileSync(join(root, "sun", "index.html"), hub);
console.log(`Generated /sun/ hub + ${SUN_ALL.length} city pages + ${SUN_STATES.length} state hubs + anywhere + cities.json (${SEARCH_INDEX.length} search entries).`);
}
