/* place.mjs — the place ITSELF, stated as facts and marked up as an entity.
 *
 * WHY. ~2,300 sun, moon and tide pages published a time for a place and said
 * almost nothing about the place. /sun/boston/ named "Massachusetts" once, in
 * passing, and carried no country, no coordinates and no time zone as a fact.
 * The 1,074 sun pages and 1,074 moon pages had no Place or GeoCoordinates
 * markup at all — their only structured data was WebApplication, FAQPage and
 * BreadcrumbList, so a search engine had to infer which Boston it was from the
 * URL. (The tide pages were the exception: they already emitted a Place with
 * geo and an address. That one is kept and enriched in build-tides.mjs rather
 * than replaced, so no page carries two competing Place entities.)
 *
 * This module is the one answer to "which place is this page about", so the
 * three families cannot drift into three different answers — the same reason
 * crosslinks.mjs and localtime.mjs exist.
 *
 * WHAT IT EMITS
 *   placeFacts()  a visible key/value block: city, state, country, time zone
 *                 and UTC offset, coordinates, and the nearest larger city.
 *   placeLd()     Place JSON-LD with GeoCoordinates and a PostalAddress, plus
 *                 containedInPlace for the state and country.
 * Both come from the SAME object, so the visible facts and the markup can
 * never disagree — Google treats that mismatch as a reason to distrust both.
 *
 * ELEVATION IS SUPPORTED BUT MAY BE EMPTY. Schema.org's GeoCoordinates has an
 * `elevation` property and it would fit here, but this repo has no elevation
 * data: the census file behind the 1,000 US cities is City, State, Population,
 * lat, lon, and the curated list is city, area, tz, lat, lon. Publishing a
 * number for the height of a thousand cities without a source for it would be
 * inventing data, and inventing it inside structured markup — where it is
 * asserted as fact to a machine — is worse than leaving it out. Getting it
 * properly means one build-time pass over a real elevation source (USGS EPQS
 * or an SRTM tile set) written to a committed JSON, the same shape as
 * make-coastal-map.mjs — which seo/tools/make-elevations.mjs now does, run on
 * a machine with a network. If that file exists the row and the
 * GeoCoordinates.elevation appear; if it does not, or a place is missing from
 * it, both are silently omitted. No zero, no guess, no "approximately".
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc } from "./lib.mjs";
import { miles, metres } from "./units.mjs";

/* Elevations, IF seo/tools/make-elevations.mjs has been run and its output
 * committed. Absent file, or a place missing from it, means the row is simply
 * not shown — never a zero and never a guess. This is why the build still
 * works with no network and no elevation data at all. */
const ELEV_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "_data", "elevations.json");
const ELEV = existsSync(ELEV_PATH) ? (JSON.parse(readFileSync(ELEV_PATH, "utf8")).meters || {}) : {};
export const elevationFor = (key) => (key in ELEV ? ELEV[key] : null);

const RAD = Math.PI / 180;
/** great-circle miles */
export function milesBetween(a, b, c, d) {
  const dLat = (c - a) * RAD, dLon = (d - b) * RAD;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a * RAD) * Math.cos(c * RAD) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.min(1, Math.sqrt(s)));
}
const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
/** plain-language bearing from (a,b) to (c,d) */
export function bearingWord(a, b, c, d) {
  const y = Math.sin((d - b) * RAD) * Math.cos(c * RAD);
  const x = Math.cos(a * RAD) * Math.sin(c * RAD) - Math.sin(a * RAD) * Math.cos(c * RAD) * Math.cos((d - b) * RAD);
  const deg = ((Math.atan2(y, x) / RAD) + 360) % 360;
  return COMPASS[Math.round(deg / 45) % 8];
}

/** "42.3601° N, 71.0589° W" — the form an atlas uses, not a signed pair */
export function coordText(lat, lon) {
  const f = (v, pos, neg) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;
  return `${f(lat, "N", "S")}, ${f(lon, "E", "W")}`;
}

/** current UTC offset for a zone, as "UTC−5" / "UTC+5:30" */
export function utcOffset(tz, when = new Date()) {
  try {
    const d = new Date(when.toLocaleString("en-US", { timeZone: "UTC" }));
    const t = new Date(when.toLocaleString("en-US", { timeZone: tz }));
    const m = Math.round((t - d) / 60000);
    if (m === 0) return "UTC";
    const sign = m < 0 ? "\u2212" : "+", abs = Math.abs(m);
    return `UTC${sign}${Math.floor(abs / 60)}${abs % 60 ? `:${String(abs % 60).padStart(2, "0")}` : ""}`;
  } catch (e) { return ""; }
}

/** readable zone name ("Eastern Daylight Time"); "" when ICU only has an offset */
export function zoneLabel(tz, when = new Date()) {
  for (const style of ["long", "longGeneric"]) {
    try {
      const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: style })
        .formatToParts(when).find((x) => x.type === "timeZoneName");
      if (p && p.value && !/^GMT/.test(p.value)) return p.value;
    } catch (e) { /* try the next style */ }
  }
  return "";
}

/* The nearest city that is BIGGER, not merely nearest. "Nearby major city" is
 * only a useful anchor if the reader has heard of it: for Cambridge MA the
 * answer people want is Boston, not Somerville. So a candidate has to be a
 * decent multiple of this city's population (or large outright), and near
 * enough to be a real reference point. Returns null rather than reaching for
 * something 300 miles away — no anchor beats a misleading one, and for a city
 * that IS the major one (New York, Boston) null is the honest answer.
 *
 * THE CANDIDATE LIST IS PASSED IN, not derived here. It is always the same
 * array the generator is already iterating (SUN_ALL), so the anchor is
 * guaranteed to have a page — deriving slugs independently would eventually
 * produce a link to a URL that does not exist. Entries with no `pop` are the
 * curated world cities, all of which are major by construction. */
const MAJOR_MIN_POP = 200000;
const MAX_ANCHOR_MI = 180;
export function nearestMajor(self, list) {
  const selfPop = self.pop || 0;
  let best = null;
  for (const c of list) {
    if (c.slug === self.slug) continue;
    const pop = c.pop || 0;
    /* a curated world city (no pop) counts as major; a census city must be
       either big outright or several times this one */
    /* A CURATED CITY ANCHORS ONLY TO ANOTHER CURATED CITY. Without that,
       "pop >= selfPop * 4" reads as "pop >= 0" when this city has no
       population field, and every neighbour qualified — Boston anchored to
       Chelsea, New York to Jersey City. A city on the curated list is already
       the major one in its area; the only anchor worth giving it is another
       city of that standing (Amsterdam to Brussels), and otherwise none. */
    const curated = !("pop" in c);
    const isMajor = selfPop === 0
      ? curated
      : curated || pop >= MAJOR_MIN_POP || pop >= selfPop * 4;
    if (!isMajor || (selfPop && pop && pop <= selfPop)) continue;
    const mi = milesBetween(self.lat, self.lon, c.lat, c.lon);
    if (mi > MAX_ANCHOR_MI) continue;
    if (!best || mi < best.mi) best = { c, mi };
  }
  if (!best) return null;
  return {
    slug: best.c.slug, city: best.c.city, st: best.c.st || best.c.area,
    miles: Math.round(best.mi),
    bearing: bearingWord(self.lat, self.lon, best.c.lat, best.c.lon),
  };
}



/* ISO codes for the countries the curated list actually uses, plus the US
 * state names the curated US entries only carry as a two-letter code. Both are
 * static tables rather than lookups because they are small, they never change,
 * and importing build-sun.mjs for the state names would be circular. */
const COUNTRY_CODE = {
  "Afghanistan":"AF","American Samoa":"AS","Argentina":"AR","Australia":"AU","Austria":"AT","Bangladesh":"BD",
  "Belgium":"BE","Brazil":"BR","Canada":"CA","Chile":"CL","China":"CN","Colombia":"CO","Croatia":"HR","Cuba":"CU",
  "Czechia":"CZ","Denmark":"DK","Egypt":"EG","Finland":"FI","France":"FR","French Polynesia":"PF","Germany":"DE",
  "Greece":"GR","Iceland":"IS","India":"IN","Indonesia":"ID","Iran":"IR","Iraq":"IQ","Ireland":"IE","Israel":"IL",
  "Italy":"IT","Japan":"JP","Kenya":"KE","Malaysia":"MY","Maldives":"MV","Mexico":"MX","Morocco":"MA","Nepal":"NP",
  "Netherlands":"NL","New Caledonia":"NC","New Zealand":"NZ","Nigeria":"NG","Norway":"NO","Pakistan":"PK","Peru":"PE",
  "Philippines":"PH","Poland":"PL","Portugal":"PT","Russia":"RU","Samoa":"WS","Saudi Arabia":"SA","Singapore":"SG",
  "South Africa":"ZA","South Korea":"KR","Spain":"ES","Sweden":"SE","Switzerland":"CH","Taiwan":"TW","Tanzania":"TZ",
  "Thailand":"TH","T\u00fcrkiye":"TR","UAE":"AE","UK":"GB","USA":"US","Ukraine":"UA","Venezuela":"VE","Vietnam":"VN",
};
const ST_NAME = {AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",
  DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",
  IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",
  MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",
  NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",
  OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",
  UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",PR:"Puerto Rico",
  VI:"U.S. Virgin Islands",GU:"Guam",AS:"American Samoa"};

/** Normalise any of the three place shapes (census city, curated world city,
 *  NOAA tide station) into one object the facts block and the JSON-LD share. */
export function resolvePlace(c) {
  const area = c.area || "";
  const isUS = area === "USA" || (!area && c.st) || !!ST_NAME[c.st];
  const country = isUS ? "United States" : (area || "United States");
  const state = isUS ? (ST_NAME[c.st] || (area !== "USA" ? area : "")) : "";
  return {
    city: c.city, state, country,
    countryCode: isUS ? "US" : (COUNTRY_CODE[area] || ""),
    tz: c.tz, lat: c.lat, lon: c.lon != null ? c.lon : c.lng, slug: c.slug, pop: c.pop,
  };
}

/* ONE LABEL FOR A CITY, EVERYWHERE. "Portland" is Oregon or Maine; "Amsterdam"
 * could be the Netherlands or upstate New York. US cities were already
 * qualified ("Portland, OR"), but the 98 non-US curated cities were published
 * bare — "Amsterdam", "Tokyo", "London" — in titles, H1s, descriptions and
 * every chip linking to them.
 *
 * US cities take the two-letter state. Everywhere else takes the country's
 * FULL name. The qualifier used to be the ISO code for symmetry with the state
 * abbreviation, but on a site where every other qualifier is a US state, a
 * two-letter code reads as one: "Toronto, CA" is Toronto, California and
 * "Marrakech, MA" is Marrakech, Massachusetts, to a reader and to a search
 * engine alike. The data's own short forms (UK, UAE) are already the names
 * people use and are kept. Machine fields keep the ISO code — see
 * `resolvePlace().countryCode`, which feeds `addressCountry` in the JSON-LD.
 *
 * Lives here, not in build-sun.mjs, because build-sun and build-moon had
 * separate identical copies and any change had to be made twice. */
export function cityLabel(c) {
  if (c.st) return `${c.city}, ${c.st}`;
  const area = c.area || "";
  if (!area || area === "USA") return c.city;
  return `${c.city}, ${area}`;
}

/* ------------------------------------------------------------------ render */

/** The visible facts block. `sunSlug` links the nearby city to its own page
 *  when that page exists, which is also a real internal link the crawler can
 *  follow between two places that are genuinely related. */
export function placeFacts({ city, state, country, tz, lat, lon, nearby, kind = "sun", extra = [], elevKey = null }) {
  const zone = zoneLabel(tz), off = utcOffset(tz);
  const elev = elevKey ? elevationFor(elevKey) : null;
  const rows = [
    ["City", esc(city)],
    state ? ["State", esc(state)] : null,
    ["Country", esc(country)],
    ["Time zone", `${esc(tz)}${zone ? ` — ${esc(zone)}` : ""}`],
    ["UTC offset", esc(off)],
    ["Latitude", `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}`],
    ["Longitude", `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "E" : "W"}`],
    /* ONE FIGURE, NOT BOTH. This row printed metres and then the same height in
       feet beside it, because it could not know which the reader wanted. The
       units control answers that now (units.mjs), so it prints one. */
    elev != null ? ["Elevation", metres(elev)] : null,
    ...extra,
    /* the distance follows the reader's units (units.mjs): this row is the one
       place on a /sun/ or /moon/ page that measures anything, and it was in
       miles for everybody */
    nearby ? ["Nearest major city", `<a href="/${kind}/${esc(nearby.slug)}/">${esc(nearby.city)}, ${esc(nearby.st)}</a> — ${miles(nearby.miles)}${nearby.bearing ? ` ${esc(nearby.bearing)}` : ""}`] : null,
  ].filter(Boolean);
  return `  <div class="card">
    <h2>About ${esc(city)}</h2>
    <div class="wc-facts pl-facts">
${rows.map(([k, v]) => `      <div class="wc-frow"><span>${k}</span><b>${v}</b></div>`).join("\n")}
    </div>
    <p class="hint">These coordinates are what every time on this page is solved for — sunrise, moonrise and the rest are computed from this exact point, not from a regional average.</p>
  </div>
`;
}

/** Place JSON-LD. Same object as the visible block, so the two cannot disagree. */
export function placeLd({ city, state, country, countryCode, lat, lon, url, sameAs = [], elevKey = null }) {
  const elev = elevKey ? elevationFor(elevKey) : null;
  const address = { "@type": "PostalAddress", addressLocality: city, addressCountry: countryCode || country };
  if (state) address.addressRegion = state;
  const contained = [];
  if (state) contained.push({ "@type": "AdministrativeArea", name: state });
  contained.push({ "@type": "Country", name: country });
  return `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Place",
    name: city,
    address,
    geo: {
      "@type": "GeoCoordinates",
      latitude: Number(lat.toFixed(4)), longitude: Number(lon.toFixed(4)),
      ...(elev != null ? { elevation: `${elev} m` } : {}),
    },
    containedInPlace: contained,
    ...(url ? { url } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  }).replace(/</g, "\\u003c")}</script>`;
}
