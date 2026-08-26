/* localtime.mjs — the one-line "what time is it THERE right now" strip shared by
 * the /sun/, /moon/ and /tides/ place pages.
 *
 * Every one of those pages is already about a specific place at a specific
 * moment — sunrise there, moonrise there, the next high tide there — and every
 * one of them quietly assumed you knew what time it was there. The times on the
 * page are in the place's own zone, not yours, which is easy to miss on a city
 * you don't live in. This states it, and links onward to the world clock page
 * for that zone.
 *
 * Baked at build (the hourly rebuild keeps it within the hour) and corrected to
 * the real minute by LOCALTIME_JS on load, so it is right for a visitor and
 * present for a crawler. The line is not a countdown or a widget — one sentence,
 * no card, so it sits under the heading without competing with what the page is
 * for.
 *
 * The onward link's anchor text names WHAT IS ACTUALLY AT THE OTHER END, in
 * three cases. If this very city has a world-clock page (Toronto, Berlin, and
 * the rest of tier 2 in wc-cities.mjs), the anchor is the city. If it doesn't
 * but its zone has a representative page, the anchor is the ZONE ("Pacific
 * Daylight Time on the world clock") — Portland has no clock page and the link
 * lands on Los Angeles, so promising "Portland on the world clock" would be a
 * promise the destination doesn't keep. If neither, it goes to the hub and says
 * so. No data-xlink: check-crosslinks governs the sun/moon/tide triangle, and
 * this is a one-way link out of it by design.
 */
import { WC_BY_TZ, WC_SLUGS, WC_CITY_LIST } from "./wc-cities.mjs";
import { citySlug } from "./cities.mjs";
import { esc } from "./lib.mjs";

/* The DST-independent name ICU gives a zone ("Eastern Time", "Central European
 * Time"). It catches the cities whose IANA id has no world-clock page of its
 * own: America/Detroit is "Eastern Time" like America/New_York, so Detroit
 * reaches the Eastern page. Zones that really are their own thing match nothing
 * and fall back to the hub — the honest answer, and no hand-kept alias table. */
function genericZone(tz) {
  try {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longGeneric" })
      .formatToParts(new Date()).find((x) => x.type === "timeZoneName");
    return p && p.value && !/^GMT/.test(p.value) ? p.value : "";
  } catch (e) { return ""; }
}
/* slug -> the IANA zone that slug's world-clock page is actually about */
const WC_TZ_BY_SLUG = new Map(WC_CITY_LIST.map((c) => [citySlug(c.city), c.tz]));
const WC_BY_ZONE = new Map();
for (const [tz, slug] of WC_BY_TZ) { const g = genericZone(tz); if (g && !WC_BY_ZONE.has(g)) WC_BY_ZONE.set(g, slug); }

/* readable zone name ("Pacific Daylight Time", "Central European Time") from
 * ICU; empty when the zone only has a GMT-offset name, which reads badly in a
 * sentence and is dropped rather than shown. */
export function zoneName(tz, when = new Date()) {
  for (const style of ["long", "longGeneric"]) {
    try {
      const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: style })
        .formatToParts(when).find((x) => x.type === "timeZoneName");
      if (p && p.value && !/^GMT/.test(p.value)) return p.value;
    } catch (e) { /* zone unknown to this ICU build — try the next style */ }
  }
  return "";
}

const clock = (tz, when) => {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(when);
  } catch (e) { return ""; }
};

/** One line: "It's 5:35 PM in Portland right now — Pacific Time on the world clock."
 *  Returns "" for an unusable zone, so a caller can drop it in unconditionally. */
export function localTimeLine(place, tz, when = new Date()) {
  const now = clock(tz, when);
  if (!now) return "";
  const zone = zoneName(tz, when);
  /* THIS CITY's page first. Asking the zone first would have sent Seattle to
   * Los Angeles — both are America/Los_Angeles and the tier-1 city owns the
   * zone — even though Seattle has a page of its own.
   *
   * The zone has to match, though: a bare city NAME is not an identity. The
   * page for Melbourne, Florida shares a name with Melbourne, Australia, and
   * taking the name match sent it to a clock page ten hours and one hemisphere
   * away. Same for Dublin OH/CA, Lima OH, Portland ME and Vancouver WA. When
   * the zones disagree the name match is discarded and the line falls through
   * to the zone-based link, which is the correct destination for all of them. */
  const cand = WC_SLUGS.has(citySlug(place)) ? citySlug(place) : null;
  const own = cand && WC_TZ_BY_SLUG.get(cand) === tz ? cand : null;
  const slug = own || WC_BY_TZ.get(tz) || WC_BY_ZONE.get(genericZone(tz));
  /* "It's 2:19 PM Pacific Daylight Time in Newport, OR." — the time AND the zone
   * name are one link to the world-clock page for that zone. The old wording
   * ("It's 2:19 PM in Newport right now — Pacific Daylight Time on the world
   * clock") said the same thing in two clauses and buried the zone behind an
   * em-dash; this puts the fact first and makes the whole time-and-zone phrase
   * the thing you click. */
  const target = own || slug;
  const timeHtml = `<b class="lt-now">${esc(now)}</b>${zone ? ` ${esc(zone)}` : ""}`;
  const phrase = target ? `<a href="/world-clock/${target}/">${timeHtml}</a>` : timeHtml;
  return `  <p class="lt-line" data-lt-tz="${esc(tz)}">It's ${phrase} in ${esc(place)}.</p>\n`;
}

/** Ticks every .lt-now to the real minute. Aligned to the minute boundary and
 *  paused while the tab is hidden, the same rule the world clock itself uses. */
export const LOCALTIME_JS = `
(function(){
  var els=[].slice.call(document.querySelectorAll('.lt-line[data-lt-tz]')); if(!els.length) return;
  function tick(){ els.forEach(function(el){ var b=el.querySelector('.lt-now'); if(!b) return;
    try{ b.textContent=new Intl.DateTimeFormat('en-US',{timeZone:el.getAttribute('data-lt-tz'),hour:'numeric',minute:'2-digit',hour12:true}).format(new Date()); }catch(e){} }); }
  var t=null;
  function schedule(){ if(t){clearTimeout(t);t=null;} if(document.hidden) return;
    var n=new Date(); t=setTimeout(function(){ tick(); schedule(); },60000-(n.getSeconds()*1000+n.getMilliseconds())); }
  tick(); schedule();
  document.addEventListener('visibilitychange',function(){ if(document.hidden){ if(t){clearTimeout(t);t=null;} } else { tick(); schedule(); } });
})();`;
