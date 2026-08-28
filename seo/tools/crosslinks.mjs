/* crosslinks.mjs — the one "related astronomical information" strip, shared by
 * the /sun/, /moon/ and /tides/ page families.
 *
 * WHY THIS EXISTS. All three families already linked to each other, but through
 * three separate one-off blocks written at different times: a rich live card on
 * sun pages, a sentence inside a paragraph on moon pages, a single <p class=
 * "hint"> on tide pages. Same relationship, three levels of detail and three
 * voices — the same duplication that let /sun/ and /moon/ grow two different
 * search matchers. One component, so the fields and the wording cannot drift.
 *
 * WHAT IT IS FOR. Context, not advice. Each tile states a computed astronomical
 * fact and links to the page that explains it. It never suggests an activity,
 * never rates conditions, and never implies these figures are fit for planning
 * anything — hence NOTE below, which travels with the component so the framing
 * cannot be left off one family by accident.
 *
 * RECIPROCITY. Every anchor carries data-xlink="<family>", and
 * check-crosslinks.mjs walks the emitted HTML asserting that whatever A links
 * to links back to A. CLAUDE.md has claimed these links are reciprocal since
 * the coastal map was added; nothing verified it until now.
 *
 * The tide tile deliberately carries NO tide times. Tide predictions come from
 * NOAA at runtime (assets/js/tides.js); baking them here would put a network
 * dependency behind ~1,100 sun pages and ~1,100 moon pages to fill one tile.
 * It names the station and its distance, which is the part that is genuinely
 * static, and the tide page itself has the times.
 */
import { esc, nSunCalc, sunHm } from "./lib.mjs";
import { moonIllum, moonName, moonTimes } from "./moon.mjs";
import { sunToStations, stationToSun } from "./coastal.mjs";
import { cityRef, milesBetween } from "./city-registry.mjs";
import { TIDE_STATIONS } from "./tide-stations.mjs";

/* the framing, stated once, wherever the strip appears */
const NOTE = "Calculated astronomical positions for these coordinates. Local weather and conditions are not modelled.";

const hm = (ms, tz) => (ms ? sunHm(ms, tz) : "—");
const lenShort = (ms) => { const m = Math.round(ms / 60000); return `${Math.floor(m / 60)} h ${m % 60} m`; };

/* start of the local calendar day at `tz`, as epoch ms — moonTimes wants the
 * day's start, and "today" has to mean the place's today, not the builder's */
function dayStart(nowMs, tz) {
  /* Subtracting the elapsed hours and minutes assumes the offset has not
     changed since local midnight — on a DST transition day it has, and the
     24-hour scan window then starts an hour off. Solve for the zone's actual
     midnight instead, with the same two-pass technique epochFor uses: guess,
     measure the offset AT the guess, and re-measure once in case the guess
     landed on the far side of a transition. */
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const [y, mo, d] = f.format(new Date(nowMs)).split("-").map(Number);
  const guess = Date.UTC(y, mo - 1, d);
  const offAt = (ms) => {
    const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(ms));
    const g = (t) => +(p.find((x) => x.type === t) || {}).value;
    return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - ms;
  };
  let utc = guess - offAt(guess);
  const off2 = offAt(utc);
  if (off2 !== offAt(guess)) utc = guess - off2;
  return utc;
}

/* ---- the three tiles. Each returns null when it has nothing true to say,
 * which is how a landlocked city ends up with two tiles instead of a third
 * that apologises for being empty. ---- */
function sunTile({ slug, city, lat, lon, tz, now }) {
  const s = nSunCalc(now, lat, lon, -0.833);
  const val = s.rise
    ? `${hm(s.rise, tz)} – ${hm(s.set, tz)}`
    : "No sunrise or sunset today";
  const sub = s.rise ? `${lenShort(s.set - s.rise)} of daylight` : "The sun stays above or below the horizon";
  return { key: "sun", href: `/sun/${slug}/`, label: "Sun", head: `Sunrise &amp; sunset in ${esc(city)}`, val: esc(val), sub: esc(sub), cta: "Sun times, twilight &amp; the year" };
}

function moonTile({ slug, city, lat, lon, tz, now }) {
  const il = moonIllum(now);
  const t = moonTimes(dayStart(now.getTime(), tz), lat, lon);
  const rise = t.rise ? `rises ${hm(t.rise, tz)}` : (t.alwaysUp ? "up all day" : "does not rise today");
  return {
    key: "moon", href: `/moon/${slug}/`, label: "Moon", head: `Moon phase in ${esc(city)}`,
    val: `${esc(moonName(il.phase))} · ${Math.round(il.fraction * 100)}% lit`,
    sub: esc(rise), cta: "Moonrise, moonset &amp; the phase calendar",
  };
}

function tideTile({ station, stationCity, st, mi }) {
  return {
    key: "tide", href: `/tides/${station}/`, label: "Tide", head: `Predicted tide times`,
    val: `${esc(stationCity)}, ${esc(st)}`,
    sub: `Nearest NOAA station — about ${mi} mile${mi === 1 ? "" : "s"} away`,
    cta: "Predicted high &amp; low tide times",
  };
}

/* ---- the strip -----------------------------------------------------------
 * `from` is the family of the page rendering it, and is the one tile left out.
 * `slug` is the shared sun/moon city slug (the two families are generated from
 * the same SUN_ALL list, which build-moon already asserts). For a tide page,
 * pass the station and its mapped sun city.
 */
export function astroStrip({ from, slug, city, lat, lon, tz, station = null, now = new Date() }) {
  const tiles = [];
  const ctx = { slug, city, lat, lon, tz, now };
  if (from !== "sun" && slug) tiles.push(sunTile(ctx));
  if (from !== "moon" && slug) tiles.push(moonTile(ctx));
  if (from !== "tide") {
    /* a sun/moon city gets a tide tile only if the coastal map pairs it with a
     * station — the map is what makes "coastal" a fact rather than a guess.
     * ALL its stations, not just the closest: four cities are the nearest
     * listed city for two stations, and linking back to one of them left the
     * other one-way (check-crosslinks.mjs found them). */
    const pairs = slug ? sunToStations.get(slug) || [] : [];
    for (const pair of pairs) {
      tiles.push(tideTile({ station: pair.station, stationCity: pair.stationCity, st: pair.st, mi: pair.mi }));
    }
    /* THE COASTAL CITY WHOSE STATION CHOSE SOMEONE ELSE. The pair map answers
       "which stations chose this city", and for Los Angeles the answer is none:
       its station sits at San Pedro and picked a nearer listed city. On a sun or
       moon page that is already covered — tideNote() below uses the registry's
       own "is this place coastal" and links anyway. A world-clock page has no
       Sun-Earth-Moon view and so no tideNote, which left the one genuinely
       coastal clock page on the site with no tide link at all.
       No data-xlink: the pair map cannot express this direction, so demanding a
       return link would fail the reciprocity gate for a link that is correct.
       Contextual, exactly like tideNote's, and check-pages still resolves it. */
    if (from === "clock" && !pairs.length) {
      const ref = slug ? cityRef(slug) : null;
      const st = ref && ref.tide ? TIDE_STATIONS.find((s) => `/tides/${s.slug}/` === ref.tide) : null;
      if (st) tiles.push({ ...tideTile({ station: st.slug, stationCity: st.name, st: st.st, mi: Math.max(1, Math.round(milesBetween(ref.lat, ref.lon, st.lat, st.lng))) }), key: null });
    }
  }
  if (!tiles.length) return "";
  return `  <div class="card xl-card">
    <h2>Related astronomical information</h2>
    <div class="xl-strip">
${tiles.map((t) => `      <a class="xl-tile" href="${t.href}"${t.key ? ` data-xlink="${t.key}"` : ""}>
        <span class="xl-lab">${t.head}</span>
        <b class="xl-val">${t.val}</b>
        <span class="xl-sub">${t.sub}</span>
        <span class="xl-cta">${t.cta} →</span>
      </a>`).join("\n")}
    </div>
    <p class="hint">${esc(NOTE)}</p>
${/* the tide pages have no Sun-Earth-Moon view of their own, so this strip is
     where their pointer to the simulator belongs; sun and moon pages get theirs
     under the picture it enlarges (tideNote below) and must not get two */""
  }${from === "tide" || from === "clock" ? simLink({ slug, from, city }) : ""}  </div>
`;
}

/* The tide page's version: it knows a station, and the coastal map tells it
 * which sun/moon city that station belongs to. Both tiles are emitted from the
 * same pair, so the reciprocity check has something to match on both sides. */
export function astroStripForStation({ station, lat, lon, tz, now = new Date() }) {
  const pair = stationToSun.get(station);
  if (!pair) return "";
  return astroStrip({ from: "tide", slug: pair.sun, city: pair.sunCity, lat, lon, tz, now });
}

export { NOTE as CROSSLINK_NOTE };

/* ---- the tide sentence under the Sun–Earth–Moon view ----------------------
 * The picture in "Where the sun/moon is right now" (seo/tools/orrery.mjs) shows
 * the angle between the sun and the moon, and that angle is not only the phase
 * — it is also what makes the tides big or small. So the one place on the site
 * where a reader can SEE the alignment is the right place to say what else it
 * does, and to hand them the predictions for their own coast.
 *
 * The link is `cityRef(slug).tide`, the registry's answer to "is this place
 * coastal", NOT the reciprocal pair the strip above uses: the Los Angeles
 * station sits at San Pedro and chose a nearer city, so the pair map says LA
 * has no tides and the registry rightly says it does. This anchor therefore
 * carries no data-xlink — it is a contextual link, not a structural one, and
 * check-crosslinks would otherwise demand a return link the pair map cannot
 * express. check-pages still proves the href resolves.
 *
 * Inland and non-US places get the explanation and no link. Naming a station
 * 900 miles away would be worse than saying nothing, and NOAA is US-only, so
 * "no tide page here" is the correct answer for most of the world rather than
 * a gap to paper over. */

/* ---- the simulator ------------------------------------------------------
 * The card's slider covers one day, because the page it sits on is about one
 * day. A week and a month are where the moon's own cycle becomes visible, and
 * that needs a page with room for a scale disclaimer — so it has one, and every
 * sun, moon and tide page points at it from beside the picture it enlarges.
 * The per-place link from a SUN or MOON page carries `data-xlink`, because the
 * simulator's own city page names those two families in its markup and the
 * pairing can therefore be asserted (check-crosslinks.mjs). The tide page's
 * cannot: its slug is a station, and the simulator page it reaches names the
 * station's mapped city, not the station. So that one stays contextual. */
export const SIM_URL = "/sun-moon-earth-movement-simulator/";
/* The "also see" line. It names ONLY the simulator: it used to also name the
 * other families' pages for the place, which restated the "Related
 * astronomical information" strip a card away — the same destinations with
 * near-identical labels, and on a sun page the fourth moon link on the page.
 * `from` decides whether the simulator link can carry data-xlink. */
export function simLink({ slug = null, from = null, city = null } = {}) {
  if (!slug) {
    return `    <p class="hint orr-sim">Also see the <a href="${SIM_URL}">Sun, Earth &amp; Moon movement simulator</a>, to watch how the three move together over a day, a week or a month.</p>
`;
  }
  const forWhere = city ? ` for ${esc(city)}` : "";   /* the simulator is FOR a place */
  /* only sun and moon: the simulator's city page names those two back, so the
     pair is checkable. A tide page's slug is a station, and a clock page's zone
     has many cities — neither can be asserted, so neither is tagged. */
  const x = from === "sun" || from === "moon" ? ` data-xlink="sim"` : "";
  return `    <p class="hint orr-sim">Also see the <a href="${SIM_URL}${slug}/"${x}>Sun, Earth &amp; Moon movement simulator${forWhere}</a>, to watch how the three move together over a day, a week or a month.</p>
`;
}

export function tideNote(slug) {
  const ref = slug ? cityRef(slug) : null;
  const st = ref && ref.tide ? TIDE_STATIONS.find((s) => `/tides/${s.slug}/` === ref.tide) : null;
  /* Half a sentence of mechanism, because the picture has already done the
     work: the reader can see the angle. No claim about today's range — that is
     what the linked predictions are for, and the shore's own shape moves it
     more than the sky does. */
  const why = "That angle sets the tides, too. The moon does most of the pulling and the sun about half as much, "
    + "so when the two line up — new moon and full moon — their pulls add and the tide runs to its biggest (spring tides); "
    + "when they sit square on at the quarters the pulls fight and it runs to its smallest (neaps). "
    + "The coast follows a day or two behind, and the shape of the shore matters as much as the sky does.";
  return `<p class="hint orr-tide">${why}${st
    ? ` <a href="${ref.tide}">Predicted tide times for ${esc(st.name)}${st.st ? `, ${esc(st.st)}` : ""} &rarr;</a>`
    : ""}</p>
`;
}
