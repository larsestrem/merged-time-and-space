/* lib.mjs — tiny shared helpers for the page generators. */

/* Escapes for BOTH text nodes and double-quoted attribute values, because it is
 * used for both site-wide. It escaped only & < > , so a data value containing a
 * double quote — a song called "Heroes", a place with an apostrophe in a
 * JS-adjacent attribute — would have closed the attribute it was sitting in.
 * Latent with today's data; one curated entry away from real. */
export const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/* Streaming-service row for an artist's songs — same visual language as the
 * 420 page's "soundtrack" card (small vinyl-disc glyph, then Spotify/Apple
 * Music/YouTube Music icons), reused on musician birthday pages so a fan
 * lands on something to actually listen to rather than a product to buy.
 * `url`, when given, is a genuine page on the artist's own official site
 * (never a guessed/invented URL) — the song title links there first, then
 * the three streaming icons. Spotify needs a real track ID (its /search/
 * deep link doesn't resolve reliably logged-out); Apple Music and YouTube
 * Music use search deep links, which resolve fine without an ID and can
 * never go stale. */
const songDiscIco = (acc) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#15151c"/>` +
  `<circle cx="12" cy="12" r="7" fill="none" stroke="#2c2c37" stroke-width="1.2"/>` +
  `<circle cx="12" cy="12" r="3.4" fill="${acc}"/><circle cx="12" cy="12" r=".9" fill="#15151c"/></svg>`;
export const SONG_SVC = {
  spotify: `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1DB954"/><path d="M6.9 9.8c3.3-1 7.4-.8 10.2 1" stroke="#0e0e14" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M7.4 12.7c2.7-.8 6-.6 8.5.9" stroke="#0e0e14" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M7.9 15.5c2.2-.6 4.8-.4 6.7.7" stroke="#0e0e14" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`,
  apple: `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><rect width="24" height="24" rx="5.5" fill="#fa2d48"/><path d="M15.9 5.7l-5.5 1.2c-.3.1-.5.3-.5.6v6.7a2.6 2.6 0 1 0 1.1 2.1V9.7l4-.9v3.9a2.6 2.6 0 1 0 1.1 2.1V6.3c0-.4-.3-.7-.7-.6z" fill="#fff"/></svg>`,
  yt: `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#f00"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M10.3 9.4l4.8 2.6-4.8 2.6z" fill="#fff"/></svg>`,
};
export function songRow({ title, artist, url, spotifyId, acc }) {
  const q = encodeURIComponent(artist ? `${title} ${artist}` : title);
  const name = url
    ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(title)}</a>`
    : esc(title);
  return `<div class="song-row">${songDiscIco(acc)}<span class="song-name">${name}</span><span class="song-links">` +
    /* no id -> no Spotify link at all; it used to emit /track/undefined */
    (spotifyId ? `<a href="https://open.spotify.com/track/${esc(spotifyId)}" target="_blank" rel="noopener nofollow" title="Spotify" aria-label="${esc(title)} on Spotify">${SONG_SVC.spotify}</a>` : "") +
    `<a href="https://music.apple.com/us/search?term=${q}" target="_blank" rel="noopener nofollow" title="Apple Music" aria-label="${esc(title)} on Apple Music">${SONG_SVC.apple}</a>` +
    `<a href="https://music.youtube.com/search?q=${q}" target="_blank" rel="noopener nofollow" title="YouTube Music" aria-label="${esc(title)} on YouTube Music">${SONG_SVC.yt}</a>` +
    `</span></div>`;
}

/* Conservative minify for the large hand-written inline widget scripts
 * (alarm/timer/stopwatch controllers): drop /* *\/ block comments and blank
 * lines, trim each line's indentation. Mirrors build-inline.mjs's minifyCss —
 * never joins lines, so it can't change ASI behavior, and only strips block
 * comments (none of these scripts use // line comments or nested template
 * literals, so there's no risk of eating a literal "/*" inside a string). */
export const minifyJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.trim()).filter(Boolean).join("\n");

export const GA = "G-Z6VS7WYEP7";

/* Google Analytics now runs through Cloudflare Zaraz (loaded at the edge, not
 * from the page), so the inline gtag snippet is removed — shipping it too would
 * double-count every visit and re-add the heavy gtag.js download we just moved
 * off the client. GA_SNIPPET is intentionally empty: every generator still
 * interpolates ${GA_SNIPPET} and build-inline still runs GA_RE, which strips
 * any old inline gtag out of already-committed HTML on rebuild. To bring the
 * inline tag back, restore the snippet here (the GA id above is unchanged). */
export const GA_SNIPPET = "";

/* ---- page header: a breadcrumb (domain [/ first-folder]) plus a copy/share
 * dropdown. It doubles as breadcrumb, page identity and a share affordance.
 * Stays <div>-free inside the .brand wrapper so build-inline's nav injector
 * (which matches the first </div>) keeps working. ---- */
const COPY_ICON =
  `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 15l6-6M10.5 6.5l1.8-1.8a4 4 0 0 1 5.7 5.7l-1.8 1.8M13.5 17.5l-1.8 1.8a4 4 0 0 1-5.7-5.7l1.8-1.8"/></svg>`;
const COPY_SCRIPT =
  `<script>document.addEventListener("click",function(e){var b=e.target.closest(".copy-item");if(!b)return;e.preventDefault();var u=location.origin+b.getAttribute("data-path");function done(){var o=b.getAttribute("data-label");b.textContent="Copied!";b.classList.add("copied");setTimeout(function(){b.textContent=o;b.classList.remove("copied");},1300);var d=b.closest("details");if(d)d.removeAttribute("open");}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(u).then(done,done);}else{var t=document.createElement("textarea");t.value=u;document.body.appendChild(t);t.select();try{document.execCommand("copy");}catch(_){}document.body.removeChild(t);done();}});</script>`;

/* brand({ crumb, page }) — crumb {slug,url} is the first folder shown after the
 * domain (and linked to its hub); page {label,url} is the current leaf, used
 * only as the last "copy link" option. With no args it renders just the domain
 * (the home page). Copy options are ordered by site architecture: site, folder,
 * page. */
/* h1: an <h1> to sit INSIDE the brand bar, between the logo and the menu. The
 * home page uses it — that page's heading is the site's name for itself, so it
 * belongs on the same line as the logo rather than repeating below it. Every
 * other page keeps its heading in the body where it describes that page. */
export function brand({ crumb = null, page = null, sub = null, h1 = null } = {}) {
  const home = `<a class="brand-name" href="/">Time and Space Science</a>`;
  const cat = crumb ? `<a class="brand-cat" href="${esc(crumb.url)}">/${esc(crumb.slug)}</a>` : "";
  const seg = sub ? `<a class="brand-cat" href="${esc(sub.url)}">/${esc(sub.slug)}</a>` : "";
  const items = [{ label: "Time and Space Science", path: "/" }];
  if (crumb) items.push({ label: crumb.slug, path: crumb.url });
  if (sub) items.push({ label: sub.slug, path: sub.url });
  if (page && (!crumb || page.url !== crumb.url)) items.push({ label: page.label, path: page.url });
  /* THE COPY-LINK DROPDOWN IS GONE (owner's call, with the breadcrumb). The
     bar is now logo | wordmark | menu and nothing else; `items` above is left
     in place because it costs nothing and is what a future share control
     would be built from. build-inline strips any copy-dd still sitting in the
     hand-maintained pages, whose brand markup never passes through here. */
  const head = h1 ? `<h1 class="brand-h1">${h1}</h1>` : "";
  return `<div class="brand${h1 ? " brand-titled" : ""}"><span class="crumbs">${home}${cat}${seg}</span>${head}</div>`;
}

/* BreadcrumbList JSON-LD for richer search results. items: [{name,url}] from
 * the home page outward to the current page; url is site-relative. */
export function breadcrumbLD(site, items) {
  return JSON.stringify({
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: site + it.url })),
  });
}

/* /<path>[/<slug>]/<year>?... — a live display-countdown URL for a curated link.
 * recur (link- or category-level) marks annual fixed-date events: the countdown
 * page rolls a passed date to the next year automatically, so links never go
 * stale. Don't set it on one-offs or nth-weekday/movable holidays. */
export function linkUrl(cat, l) {
  const path = l.path || cat.path;
  const q = new URLSearchParams({
    name: l.name, date: l.date, time: l.time || "08:00", tz: l.tz || "America/New_York",
    effect: l.effect || cat.effect, sound: l.sound || cat.sound,
    theme: l.theme || cat.theme, art: l.art || cat.art,
  });
  if (l.message || cat.message) q.set("message", l.message || cat.message);
  if (l.recur ?? cat.recur) q.set("recur", "1");
  const segs = [path, l.slug, l.date.slice(0, 4)].filter(Boolean);
  return `/${segs.join("/")}?${q.toString()}`;
}

const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
export const when = (d) => fmt.format(new Date(d + "T00:00:00Z"));

/* Keep a curated label's year in step with the date shown next to it. Many hub
 * labels carry a year for search ("Christmas 2026", "Easter 2027"); the date
 * badge is computed from the next occurrence, so once an event passes and the
 * date rolls to next year the hardcoded label year would go stale and mismatch.
 * This rewrites the first 4-digit year in the label to the resolved date's year
 * so the two never disagree. No year in the label, or no date -> unchanged. */
export function syncLabelYear(label, dateStr) {
  if (!label || !dateStr || !/^\d{4}/.test(dateStr)) return label;
  return label.replace(/\b20\d{2}\b/, dateStr.slice(0, 4));
}

/* Map of "type[/slug]" -> rich landing URL (the nested /<hub>/<slug>/ path),
 * so curated links in the data resolve to the real page. */
export function richMap(events) {
  const m = new Map();
  for (const e of events) {
    m.set(e.slug ? `${e.type}/${e.slug}` : e.type, e.urlPath);
  }
  return m;
}

/* Preferred href for a curated link: the rich landing page when one exists,
 * otherwise the dynamic display URL. */
export function hrefFor(cat, l, rich) {
  if (l.url) return l.url;            // a curated link straight to an existing page
  const path = l.path || cat.path;
  return rich.get(l.slug ? `${path}/${l.slug}` : path) || linkUrl(cat, l);
}

/* The instant every date resolution is measured from: one millisecond before
 * midnight UTC today, so TODAY'S occurrence counts as the next one. Comparing
 * against `new Date()` instead meant that any build after midnight UTC on the
 * day itself resolved to next year — on Dec 25 the Christmas page's answer
 * card, description, FAQ and JSON-LD all said the event was a year away, and
 * the "it's today" branch was unreachable. */
function startOfTodayUTC() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()) - 1);
}

/* Next occurrence (date-only, UTC math) of a recurrence on or after today.
 * {once} a one-off date (null once it is past); {month, day} fixed date;
 * {month, nth, weekday} nth weekday (nth -1 = last);
 * {dates:[...]} an explicit table (for movable feasts) — picks the next one. */
export function nextOccurrence(e, from = startOfTodayUTC()) {
  /* One-off events have a date like any other; without this branch they fell
   * through to the nth-weekday arm, produced an Invalid Date and vanished from
   * the calendar, the "Happening soon" rails and the popular/trending lists. */
  if (e.once) {
    const d = new Date(e.once + "T00:00:00Z");
    return d.getTime() > from.getTime() ? d : null;
  }
  if (Array.isArray(e.dates)) {
    const d = e.dates.map((s) => new Date(s + "T00:00:00Z")).sort((a, b) => a - b)
      .find((x) => x.getTime() > from.getTime());
    return d || null;
  }
  const y = from.getUTCFullYear();
  for (const year of [y, y + 1]) {
    let d;
    if (e.day) d = new Date(Date.UTC(year, e.month - 1, e.day));
    else if (e.nth === -1) { /* last weekday of month */
      const last = new Date(Date.UTC(year, e.month, 0));
      d = new Date(Date.UTC(year, e.month - 1, last.getUTCDate() - ((last.getUTCDay() - e.weekday + 7) % 7)));
    } else { /* nth weekday of month */
      const first = new Date(Date.UTC(year, e.month - 1, 1));
      const off = (e.weekday - first.getUTCDay() + 7) % 7;
      d = new Date(Date.UTC(year, e.month - 1, 1 + off + (e.nth - 1) * 7));
    }
    if (d.getTime() > from.getTime()) return d;
  }
  return null;
}

export const iso = (d) => d.toISOString().slice(0, 10);

/* Standard federal holiday observance: a holiday landing on Saturday is
 * observed the preceding Friday, one landing on Sunday the following Monday.
 * (Edge case, accepted as-is: nextOccurrence's own "from" comparison uses the
 * unshifted date, so on the single day per year a Sat/Sun-shifting holiday's
 * raw date falls today, this rolls to next year a day early rather than
 * resolving to the shifted date — rare, low-stakes, not worth the complexity
 * to special-case.) */
function observedShift(d) {
  const dow = d.getUTCDay();
  if (dow === 6) return new Date(d.getTime() - 86400000);
  if (dow === 0) return new Date(d.getTime() + 86400000);
  return d;
}

/* Upcoming occurrences of every entry in seo/_data/federal-holidays.json
 * (nextOccurrence()-shaped rules + `observed:true` for Sat/Sun shifting),
 * `count` per holiday, soonest first. `longWeekend` flags a holiday whose
 * (observed) date falls on Monday or Friday — or is Thanksgiving, which is
 * always Thursday but culturally always a long weekend too. Baking in
 * multiple years per holiday means the two pages that consume this
 * (/next-federal-holiday/, /next-long-weekend/) stay correct for years even
 * without a rebuild, not just until the next daily maintenance run. */
export function upcomingFederalHolidays(holidays, from = new Date(), count = 3) {
  const out = [];
  for (const h of holidays) {
    let cursor = from;
    for (let i = 0; i < count; i++) {
      const raw = nextOccurrence(h, cursor);
      if (!raw) break;
      const observed = h.observed ? observedShift(raw) : raw;
      const dow = observed.getUTCDay();
      out.push({ name: h.name, date: iso(observed), longWeekend: dow === 1 || dow === 5 || h.name === "Thanksgiving Day" });
      cursor = raw;
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/* Stable short id (<=16 chars, [a-z0-9]) per page, keyed on the URL — the id
 * the /api/views counter stores under "v:<id>". Must stay byte-for-byte
 * identical to viewHash() in build-events.mjs so rankings line up. */
export function viewHash(s) {
  let h1 = 2166136261 >>> 0, h2 = 2246822519 >>> 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2654435761) >>> 0;
  }
  return (h1.toString(36) + h2.toString(36)).slice(0, 16);
}

/* Exact UTC instant for a wall-clock time in an IANA timezone (two-pass for
 * DST). Used for one-off events (kickoffs, ceremonies) that happen at a real
 * moment rather than recurring annually. */
function tzOffsetMs(tz, date) {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const p = {};
  dtf.formatToParts(date).forEach((x) => { p[x.type] = x.value; });
  return Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - date.getTime();
}
export function epochFor(dateStr, timeStr, tz) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = (timeStr || "00:00").split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  let off = tzOffsetMs(tz, new Date(guess));
  let utc = guess - off;
  const off2 = tzOffsetMs(tz, new Date(utc));
  if (off2 !== off) utc = guess - off2;
  return utc;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/* Load all rich events: hand-written entries (events.json) plus celebrity
 * profiles (people.json) expanded into birthday-page entries. */
export function loadEvents(readFileSync, join, root) {
  const { events } = JSON.parse(readFileSync(join(root, "seo/_data/events.json"), "utf8"));
  const { people } = JSON.parse(readFileSync(join(root, "seo/_data/people.json"), "utf8"));
  const { categories } = JSON.parse(readFileSync(join(root, "seo/_data/popular-countdowns.json"), "utf8"));
  /* richKey ("type[/slug]") -> the owning category, from the curated lists, so
   * each event knows which hub folder it nests under. */
  const keyToCat = {};
  for (const c of categories)
    for (const l of [...(c.links || []), ...(c.more || [])]) {
      const p = l.path || c.path;
      const k = l.slug ? `${p}/${l.slug}` : p;
      if (!keyToCat[k]) keyToCat[k] = c;
    }
  const byId = Object.fromEntries(categories.map((c) => [c.id, c]));
  const fromPeople = people.map((p) => {
    const poss = p.label + (p.label.endsWith("s") ? "'" : "'s");
    const md = `${MONTHS[p.month - 1]} ${p.day}`;
    const links = [];
    if (p.official) links.push(p.official);
    if (p.extraLinks) links.push(...p.extraLinks);
    if (p.wiki) links.push({ label: "Wikipedia", url: "https://en.wikipedia.org/wiki/" + p.wiki });
    /* Age-aware copy: with a birth year, the build resolves {NTH}/{DATE} to
     * e.g. "80th" / "June 14, 2026" — concrete, refreshed on every rebuild.
     * `late` switches to "what would be her Nth birthday" for those no longer
     * with us. */
    const nthBday = p.late ? `what would be ${poss} {NTH} birthday` : `${poss} {NTH} birthday`;
    /* swap the intro's generic closing sentence for the concrete one */
    const intro = p.born
      ? p.intro.replace(/[\s,—–-]*[Tt]h(?:is|e)\s+countdown[^.]*\.\s*$/, "").replace(/([^.!?])\s*$/, "$1.")
        + ` Countdown to ${nthBday} on {DATE}, live to the second.`
      : p.intro;
    return {
      type: "birthday-countdown", slug: p.slug, label: p.label,
      profile: p.profile,
      related: p.related,
      name: `${poss} Birthday`,
      month: p.month, day: p.day, time: "08:00", born: p.born,
      /* A memorial page is not a party. `late` pages already say "what would be
         …" in their own H1, and shipping them confetti, a fanfare and a share
         message reading "🎂 Happy Birthday, Martin Luther King Jr.!" was the
         one place the site's warm voice landed badly. */
      theme: "birthday", art: "birthday",
      effect: p.late ? "none" : "confetti", sound: p.late ? "none" : "fanfare",
      title: `How Many Days Until ${poss} Birthday? Live Countdown`,
      desc: p.born
        ? `Live countdown to ${nthBday} on {DATE}, with fun facts about ${p.label} and links to official sites.`
        : `Live countdown to ${poss} birthday on ${md}, with fun facts about ${p.label} and links to official sites.`,
      h1: p.born ? `Countdown to ${nthBday}` : `Countdown to ${poss} birthday`,
      intro,
      message: p.late ? `Remembering ${p.label}` : `🎂 Happy Birthday, ${p.label}!`,
      /* rich profiles add story sections after the About paragraph */
      sections: [{ h: `About ${p.label}`, p: p.about }, ...(p.sections || [])],
      facts: p.facts,
      works: p.works, worksLabel: p.worksLabel,
      songs: p.songs, songsLabel: p.songsLabel,
      music: p.music,
      timeline: p.timeline, timelineLabel: p.timelineLabel,
      records: p.records, recordsLabel: p.recordsLabel,
      linkify: p.linkify,
      give: p.give,
      links,
    };
  });
  const all = [...events, ...fromPeople];
  /* Assign each event its category + nested URL: /<hub-folder>/<slug>/, where
   * the leaf slug drops the "-countdown" suffix. Unmapped events fall back to
   * birthdays (people) or holidays. */
  for (const e of all) {
    const key = e.slug ? `${e.type}/${e.slug}` : e.type;
    const c = keyToCat[key] || (e.type === "birthday-countdown" ? byId.birthdays : byId.holidays);
    const slug = e.slug || e.type.replace(/-countdown$/, "");
    e.category = { id: c.id, hub: c.hub, nav: c.nav };
    e.urlSlug = slug;
    e.urlPath = `/${c.hub}/${slug}/`;
  }
  return all;
}

/* ---- timer presets: stable slug/label/phrase from a duration in seconds.
 * Shared by build-timers.mjs, build-inline.mjs and build-sitemap.mjs so the
 * generated URLs never drift between generation, inlining and the sitemap. */
/* Decompose a duration into [value, unit] parts. Whole hours render as a single
 * "hours" part; everything else is whole minutes plus any leftover seconds. This
 * keeps the compact "90-minutes"/"65-minutes" form (rather than splitting into
 * hours+minutes) and only adds a seconds part when the duration isn't a whole
 * number of minutes (e.g. 75 -> 1 minute 15 seconds). */
function timerParts(sec) {
  if (sec % 3600 === 0) return [[sec / 3600, "hour"]];
  const m = Math.floor(sec / 60), s = sec % 60, parts = [];
  if (m) parts.push([m, "minute"]);
  if (s) parts.push([s, "second"]);
  return parts;
}
export function timerSlug(sec) {
  return timerParts(sec).map(([v, u]) => `${v}-${u}${v > 1 ? "s" : ""}`).join("-");
}
export function timerLabel(sec) {
  return timerParts(sec).map(([v, u]) => `${v} ${u[0].toUpperCase()}${u.slice(1)}`).join(" ") + " Timer";
}
export function timerPhrase(sec) {
  return timerParts(sec).map(([v, u]) => `${v}-${u}`).join("-");
}
/* Grammatically correct spoken form for prose: "2 minutes", "1 hour",
 * "90 minutes", "1 minute 15 seconds". */
export function timerSpoken(sec) {
  return timerParts(sec).map(([v, u]) => `${v} ${u}${v > 1 ? "s" : ""}`).join(" ");
}

/* ---- 7-segment LED display, shared by the alarm clock, timer and stopwatch.
 * segMarkup() renders a static, pre-lit display (for the home-page card
 * mockups); SEG_JS defines window.acSegDisplay(el) -> a setter function that
 * live-updates the cells, building the digit/colon/dot structure once. */
const SEG_MAP = { "0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg", "5": "acdfg", "6": "acdefg", "7": "abc", "8": "abcdefg", "9": "abcdfg" };
export function segMarkup(str) {
  return String(str).split("").map((ch) => {
    if (ch === ":") return `<span class="ac-colon"><i></i><i></i></span>`;
    if (ch === ".") return `<span class="seg-dot"></span>`;
    const on = SEG_MAP[ch] || "";
    return `<span class="dig">` + "abcdefg".split("").map((s) => `<i class="seg seg-${s}${on.indexOf(s) > -1 ? " on" : ""}"></i>`).join("") + `</span>`;
  }).join("");
}
/* POPOUT_JS — "Pop out": pop a tool's display into a Document
 * Picture-in-Picture window, which the operating system floats ABOVE other
 * windows. ONE NAME, EVERYWHERE. This same feature was "Show on top" on the
 * alarm, "Pop out" on the timer and stopwatch buttons, and "Always visible" in
 * the timer's prose — three names for one control, which is three chances for
 * a reader to think they are different things.
 *
 * The host element is MOVED, not copied, so its event listeners and any
 * closure holding a reference to it keep working — a running stopwatch carries
 * on ticking in the floating window, and its buttons still work, because they
 * are the same nodes.
 *
 * A placeholder clone keeps the page from collapsing while the real thing is
 * away, and EVERY id is stripped from that clone. That is not cosmetic: the
 * alarm clock shipped a version that stripped only the clone's outer id, which
 * left a second #ac-close-tl in the document, and getElementById handed back
 * the listener-less copy — a close button that looked right and did nothing.
 *
 * Chrome and Edge only. Everywhere else the button hides itself rather than
 * offering something that will not happen.
 */
export const POPOUT_JS = minifyJs(`
window.acPopOut=function(opt){
  var btn=document.querySelector(opt.btn), host=document.querySelector(opt.host);
  if(!btn||!host) return;
  if(!(window.documentPictureInPicture&&documentPictureInPicture.requestWindow)){ btn.hidden=true; return; }
  /* Min / Sm / Med / Lg / Xlg. Heights are multiplied by opt.hk for hosts that
     stack (the multi-timer board needs room for three cards, a single timer
     does not). */
  var SIZES=[['min','Min',260,150],['sm','Sm',330,190],['med','Med',420,240],['lg','Lg',580,320],['xlg','Xlg',780,420]];
  var KEY='ac_popout_size', hk=opt.hk||1;
  function sizeFor(k){ for(var i=0;i<SIZES.length;i++) if(SIZES[i][0]===k) return [SIZES[i][2],Math.round(SIZES[i][3]*hk)];
    return [420,Math.round(240*hk)]; }
  var chosen='med'; try{ var sv=localStorage.getItem(KEY); if(sv) chosen=sv; }catch(e){}

  var home=host.parentNode, next=host.nextSibling, clone=null, win=null, label=btn.textContent;
  function restore(){
    if(clone&&clone.parentNode) clone.parentNode.removeChild(clone); clone=null;
    if(next&&next.parentNode===home) home.insertBefore(host,next); else home.appendChild(host);
    host.classList.remove('ac-popped'); host.style.removeProperty('--pop-k');
    btn.setAttribute('aria-pressed','false'); btn.textContent=label; win=null;
  }
  btn.addEventListener('click',function(){
    if(win){ try{ win.close(); }catch(e){} restore(); return; }
    var dim=sizeFor(chosen);
    documentPictureInPicture.requestWindow({width:dim[0],height:dim[1]}).then(function(pip){
      win=pip;
      [].forEach.call(document.querySelectorAll('style'),function(st){ pip.document.head.appendChild(st.cloneNode(true)); });
      /* EVERYTHING IN THE ROW IS SIZED IN cqw, not just the digits. The host is
         the size container, so the name, the read-out, the Start button, the
         reset link and the close cross all scale together with the window —
         previously only the display did, and a wide window gave you huge digits
         beside a 14px button. --pop-k is a multiplier the size menu falls back
         to if the window itself cannot be resized. */
      var st2=pip.document.createElement('style');
      st2.textContent='html,body{height:100%}'
        +'body.ac-pop{margin:0;background:#0b1020;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 8px 40px;box-sizing:border-box}'
        +'.ac-popped{display:block;container-type:inline-size;width:100%}'
        /* single timer / stopwatch */
        +'.ac-popped .tool-time{font-size:calc(15cqw*var(--pop-k,1));margin:0 auto;max-width:100%}'
        +'.ac-popped .tool-controls{margin-top:3cqw;gap:2cqw;flex-wrap:nowrap}'
        +'.ac-popped .tool-controls .btn{padding:2.4cqw 3.2cqw;font-size:calc(clamp(11px,3.4cqw,22px)*var(--pop-k,1));white-space:nowrap}'
        /* multi-timer board: stacked one above the other, whole card scales */
        +'.ac-popped.mt-board{display:flex;flex-direction:column;gap:2cqw;margin:0}'
        +'.ac-popped .mt-timer{padding:2cqw 2.6cqw 2.6cqw;border-radius:2.5cqw}'
        +'.ac-popped .mt-head{margin:0 5cqw 1cqw}'
        +'.ac-popped .mt-name{font-size:calc(clamp(11px,4.2cqw,26px)*var(--pop-k,1))}'
        +'.ac-popped .mt-sep,.ac-popped .mt-reset-link{font-size:calc(clamp(9px,3cqw,18px)*var(--pop-k,1))}'
        +'.ac-popped .mt-x{font-size:calc(clamp(14px,4.5cqw,28px)*var(--pop-k,1));padding:0 1.5cqw;top:1cqw;right:1.5cqw}'
        +'.ac-popped .mt-row{gap:2.5cqw}'
        +'.ac-popped .mt-disp.seg-screen{font-size:calc(clamp(18px,12cqw,74px)*var(--pop-k,1))}'
        +'.ac-popped .mt-toggle{padding:2cqw 3.5cqw;font-size:calc(clamp(11px,3.4cqw,24px)*var(--pop-k,1))}'
        /* bottom bar */
        +'.ac-popbar{position:fixed;right:8px;bottom:8px;display:flex;gap:6px;align-items:center;z-index:5}'
        +'.ac-popbar button,.ac-popbar select{font:600 12px system-ui,Arial,sans-serif;color:#cbd5e1;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.20);border-radius:8px;padding:5px 8px;cursor:pointer}'
        +'.ac-popbar button:hover{background:rgba(255,255,255,.20);color:#fff}'
        +'.ac-popnote{position:fixed;left:8px;bottom:11px;font:500 11px system-ui,Arial,sans-serif;color:#64748b}';
      pip.document.head.appendChild(st2);
      pip.document.body.className='ac-pop '+(opt.cls||'');
      /* Placeholder for the page, with EVERY id stripped — a duplicate id hands
         getElementById a copy that carries no listeners, which is how the alarm
         clock ended up with a close button that did nothing. */
      clone=host.cloneNode(true); clone.removeAttribute('id');
      [].forEach.call(clone.querySelectorAll('[id]'),function(n){ n.removeAttribute('id'); });
      clone.className+=' ac-clone';
      if(next&&next.parentNode===home) home.insertBefore(clone,next); else home.appendChild(clone);
      host.classList.add('ac-popped');
      pip.document.body.appendChild(host);

      var bar=pip.document.createElement('div'); bar.className='ac-popbar';
      var sel=pip.document.createElement('select');
      sel.setAttribute('aria-label','Pop-out size');
      SIZES.forEach(function(sz){ var o=pip.document.createElement('option'); o.value=sz[0]; o.textContent=sz[1];
        if(sz[0]===chosen) o.selected=true; sel.appendChild(o); });
      /* RESIZE THE WINDOW IF THE BROWSER ALLOWS IT, SCALE THE CONTENT IF NOT.
         resizeTo on a picture-in-picture window is not guaranteed, so this
         measures whether it took: if the window really changed, the container
         units do the rest and no multiplier is needed; if it did not, --pop-k
         scales the contents so choosing a size still does something. */
      sel.addEventListener('change',function(){
        chosen=sel.value; try{ localStorage.setItem(KEY,chosen); }catch(e){}
        var d=sizeFor(chosen), w0=pip.innerWidth;
        try{ pip.resizeTo(d[0],d[1]); }catch(e){}
        setTimeout(function(){
          if(Math.abs(pip.innerWidth-w0)<4 && Math.abs(pip.innerWidth-d[0])>24){
            host.style.setProperty('--pop-k',(d[0]/Math.max(pip.innerWidth,1)).toFixed(3));
          } else { host.style.removeProperty('--pop-k'); }
        },250);
      });
      bar.appendChild(sel);
      var closeB=pip.document.createElement('button'); closeB.type='button'; closeB.textContent='Close';
      closeB.addEventListener('click',function(){ try{ pip.close(); }catch(e){} restore(); });
      bar.appendChild(closeB);
      var note=pip.document.createElement('div'); note.className='ac-popnote'; note.textContent='Always on top';
      pip.document.body.appendChild(note); pip.document.body.appendChild(bar);
      btn.setAttribute('aria-pressed','true'); btn.textContent='Close pop-out';
      pip.addEventListener('pagehide',restore);
    })['catch'](function(){});
  });
};`);

/* Screen Wake Lock, as one shared thing rather than a fourth hand-rolled copy.
 *
 * window.acWakeLock.on()  ask to keep the screen awake, and keep asking
 * window.acWakeLock.off() give it back
 * window.acWakeLock.held() true only when the browser has ACTUALLY granted it
 *
 * The re-request on visibilitychange is the whole reason this is worth sharing:
 * the spec has the browser RELEASE the lock whenever the page stops being
 * visible, and it does not come back on its own. Without that listener, one
 * glance at a notification silently ends the lock and the phone dies a minute
 * later — with the full-screen timer still on screen, still claiming it won't.
 *
 * held() is deliberately separate from "did I call on()". Firefox has no Screen
 * Wake Lock at all, iOS Safari only got it in 16.4, and even where it exists the
 * request can be refused for low battery or power saving. Any UI that tells a
 * visitor their screen will stay on must read held(), never the intent. */
export const WAKE_JS = `
window.acWakeLock=(function(){
  var lock=null,want=false,cbs=[];
  function fire(){ for(var i=0;i<cbs.length;i++) try{ cbs[i](); }catch(e){} }
  function req(){ if(lock||!want) return;
    try{ if(navigator.wakeLock&&navigator.wakeLock.request&&document.visibilityState==='visible')
      navigator.wakeLock.request('screen').then(function(l){ if(!want){ try{l.release();}catch(e){} return; }
        lock=l; l.addEventListener('release',function(){ lock=null; fire(); }); fire(); })['catch'](fire); }catch(e){}
  }
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') req(); });
  return { on:function(){ want=true; req(); },
    off:function(){ want=false; try{ if(lock) lock.release(); }catch(e){} lock=null; },
    held:function(){ return !!lock; },
    onchange:function(fn){ cbs.push(fn); } };
})();`;

export const SEG_JS = `
window.acSegDisplay=function(el){
  var SEG={'0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg'},SEGL='abcdefg',cells=[],shape='';
  function build(str){ var sh=str.replace(/[0-9]/g,'#'); if(sh===shape)return; shape=sh; el.innerHTML=''; cells=[];
    for(var i=0;i<str.length;i++){ var ch=str.charAt(i);
      if(ch===':'){ var c=document.createElement('span'); c.className='ac-colon'; c.innerHTML='<i></i><i></i>'; el.appendChild(c); cells.push(null); }
      else if(ch==='.'){ var d=document.createElement('span'); d.className='seg-dot'; el.appendChild(d); cells.push(null); }
      else { var g=document.createElement('span'); g.className='dig'; for(var s=0;s<7;s++){ var sg=document.createElement('i'); sg.className='seg seg-'+SEGL.charAt(s); g.appendChild(sg);} el.appendChild(g); cells.push({el:g,last:''}); } } }
  return function(str){ str=''+str; build(str); el.setAttribute('aria-label',str); for(var i=0;i<str.length;i++){ var cell=cells[i]; if(!cell)continue; var ch=str.charAt(i); if(cell.last===ch)continue; cell.last=ch; var on=SEG[ch]||''; for(var s=0;s<7;s++) cell.el.children[s].classList.toggle('on', on.indexOf(SEGL.charAt(s))>-1); } };
};`;

/* ---- JSON-LD structured data helpers. ldSafe keeps a stray "</scr"+"ipt>"
 * from closing the inline tag early. */
const ldSafe = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");
export function appLd({ name, url, description, category = "UtilitiesApplication", image = null }) {
  return `<script type="application/ld+json">${ldSafe({
    "@context": "https://schema.org", "@type": "WebApplication",
    name, applicationCategory: category, operatingSystem: "Any (web browser)",
    url, description,
    /* an absolute image URL is a strong "use this thumbnail" signal to Google &
     * Bing image selection; omitted when a page has no representative image. */
    ...(image ? { image } : {}),
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
  })}</script>`;
}
/* LEARNINGRESOURCE. Be realistic about this one: there is no Google rich
 * result for it and no reason to expect a ranking change. It is here because it
 * is semantically true of these four pages, and because the consumers that DO
 * read it — AI answer engines and open-educational-resource aggregators — are
 * exactly the traffic a free classroom simulator wants. Only on the hubs and
 * the guide: repeating it across 1,103 near-identical city pages would be the
 * same duplication the per-city FAQs were written to undo. */
export function learningLd({ name, url, description, type = "simulation", audience = "student", level = "beginner" }) {
  return `<script type="application/ld+json">${ldSafe({
    "@context": "https://schema.org", "@type": "LearningResource",
    name, url, description,
    learningResourceType: type,
    educationalUse: ["instruction", "self-study"],
    educationalLevel: level,
    audience: { "@type": "EducationalAudience", educationalRole: audience },
    isAccessibleForFree: true,
    inLanguage: "en",
  })}</script>`;
}
export function faqLd(qa) {
  return `<script type="application/ld+json">${ldSafe({
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  })}</script>`;
}
/* The site's identity, as one graph. There was no Organization node anywhere —
 * only a bare publisher {name,url} on event pages — so nothing told a search
 * engine what this site's logo is. The logo has to be a RASTER (Google does not
 * reliably index SVG for this) and at least 112px on the short side;
 * make-logo-raster.mjs renders it from the same favicon the pages use.
 * Deliberately NO `sameAs`: the site has no social profiles, and inventing them
 * is the one thing worse than omitting them.
 *
 * THE NAME IS "Time and Space Science"; the domain is `alternateName`. Both
 * nodes carry the pair because the site spent its first months calling itself
 * by its domain, and that is what the existing links, the old titles and the
 * migration notice all say — dropping it outright would ask a search engine to
 * treat the rename as a different site. Google picks the site name for a
 * result from these plus og:site_name, so all three now agree. */
export const ORG_ID = (origin) => `${origin}/#organization`;
export function organizationNode(origin) {
  return {
    "@type": "Organization", "@id": ORG_ID(origin),
    name: "Time and Space Science", alternateName: "timeandspace.science", url: origin + "/",
    logo: { "@type": "ImageObject", url: `${origin}/assets/img/logo-512.png`, width: 512, height: 512 },
  };
}
export function webSiteLd(origin) {
  return `<script type="application/ld+json">${ldSafe({
    "@context": "https://schema.org", "@type": "WebSite",
    "@id": `${origin}/#website`,
    name: "Time and Space Science", alternateName: "timeandspace.science", url: origin + "/",
    description: "Free online clock tools: alarm clock, stopwatch, timer and shareable countdowns.",
    publisher: organizationNode(origin),
  })}</script>`;
}

/* ---- sun math + the 24-hour sun dial renderer. Shared by build-sun.mjs
 * (city pages, hub mini-dials) and build-home.mjs (homepage sunrise/sunset
 * card) so the two never drift apart. */
/* SunCalc solar math with a configurable sun angle: -0.833° for rise/set,
 * -6° for civil twilight (first/last light). Returns UTC ms or null when the
 * sun never crosses that angle (midnight sun / polar night). */
export const SUN_JS = `
function sunCalc(date,lat,lng,ang){
  var rad=Math.PI/180, dayMs=86400000, J1970=2440588, J2000=2451545, e=rad*23.4397;
  function toDays(d){ return d.valueOf()/dayMs - 0.5 + J1970 - J2000; }
  function sma(d){ return rad*(357.5291+0.98560028*d); }
  function ecl(M){ var C=rad*(1.9148*Math.sin(M)+0.02*Math.sin(2*M)+0.0003*Math.sin(3*M)), P=rad*102.9372; return M+C+P+Math.PI; }
  function dec(l){ return Math.asin(Math.sin(e)*Math.sin(l)); }
  function approxTransit(Ht,lw,n){ return 0.0009 + (Ht+lw)/(2*Math.PI) + n; }
  function transitJ(ds,M,L){ return J2000 + ds + 0.0053*Math.sin(M) - 0.0069*Math.sin(2*L); }
  function fromJ(j){ return (j + 0.5 - J1970)*dayMs; }
  var lw=rad*-lng, phi=rad*lat, d=toDays(date), n=Math.round(d-0.0009-lw/(2*Math.PI));
  var ds=approxTransit(0,lw,n), M=sma(ds), L=ecl(M), dc=dec(L), Jnoon=transitJ(ds,M,L);
  var x=(Math.sin(ang*rad)-Math.sin(phi)*Math.sin(dc))/(Math.cos(phi)*Math.cos(dc));
  var out={ noon:fromJ(Jnoon) };
  if(x>=-1&&x<=1){ var w=Math.acos(x), Jset=transitJ(approxTransit(w,lw,n),M,L); out.set=fromJ(Jset); out.rise=out.noon-(out.set-out.noon); }
  return out;
}`;

/* ---- shared city-autocomplete core --------------------------------------
 * /sun/ and /moon/ search the SAME index (/sun/cities.json) and had grown two
 * near-identical copies of the matcher. This is the one implementation both
 * now call, so ranking and keyboard behaviour can't drift between them.
 *
 * Three things make it feel instant rather than merely be correct:
 *   - acPrep caches the lowercased labels. The old matcher called
 *     toLowerCase() on all ~1,090 labels on EVERY keystroke, allocating a
 *     thousand throwaway strings per character typed.
 *   - acRank buckets by match quality (whole-label prefix, then word-start,
 *     then substring) instead of the old prefix/substring pair, so "salem"
 *     doesn't rank Jerusalem beside Salem.
 *   - inside a bucket, ordering stays the index's own population order —
 *     which is the best prominence signal available — with cities near the
 *     visitor pulled forward by a factor, not to the front. That is the
 *     difference between "Salem, OR" beating Sacramento for a Portland
 *     visitor (right) and "Newberg, OR" beating New York (wrong).
 * Rows are the index tuple: [slug, label, tz, lat, lon, url?]. */
export const AC_JS = `
var acSrc=null, acKeys=null;
function acPrep(src){
  if(acSrc===src&&acKeys) return acKeys;
  acSrc=src; acKeys=new Array(src.length);
  for(var i=0;i<src.length;i++) acKeys[i]=src[i][1].toLowerCase();
  return acKeys;
}
/* miles between two [lat,lon] pairs — great circle, same haversine the nearby
   lists use, so "near" means the same thing everywhere on the site */
function acMiles(aLat,aLon,bLat,bLon){
  var t=Math.PI/180, dLa=(bLat-aLat)*t, dLo=(bLon-aLon)*t;
  var x=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(aLat*t)*Math.cos(bLat*t)*Math.sin(dLo/2)*Math.sin(dLo/2);
  return 2*3958.8*Math.asin(Math.sqrt(x));
}
/* rank matches for \`v\` in \`src\`. near = [lat,lon] or null. Returns rows. */
function acRank(src,v,near,limit){
  var keys=acPrep(src), out=[], i, k, score;
  v=v.trim().toLowerCase(); if(!v) return [];
  for(i=0;i<src.length;i++){
    k=keys[i];
    if(k.indexOf(v)===0) score=0;
    else {
      var at=k.indexOf(v);
      if(at<0) continue;
      /* a word-start match ("louis" in "St. Louis") reads as intentional;
         a match buried mid-word ("ort" in "Portland") barely does */
      score=(at>0&&/[ .,'-]/.test(k.charAt(at-1)))?1:2;
    }
    var w=i;
    if(near) { var mi=acMiles(near[0],near[1],src[i][3],src[i][4]); if(mi<100) w=i*0.1; }
    out.push([score,w,src[i]]);
  }
  out.sort(function(a,b){ return a[0]-b[0]||a[1]-b[1]; });
  return out.slice(0,limit||10).map(function(r){ return r[2]; });
}
/* the label with the matched run wrapped in <b> — built as nodes, never as
   innerHTML, because city labels are data and must not be able to inject */
function acMark(label,v){
  var frag=document.createDocumentFragment();
  v=(v||'').trim().toLowerCase();
  var at=v?label.toLowerCase().indexOf(v):-1;
  if(at<0||!v){ frag.appendChild(document.createTextNode(label)); return frag; }
  if(at>0) frag.appendChild(document.createTextNode(label.slice(0,at)));
  var b=document.createElement('b'); b.textContent=label.slice(at,at+v.length); frag.appendChild(b);
  if(at+v.length<label.length) frag.appendChild(document.createTextNode(label.slice(at+v.length)));
  return frag;
}
/* Google-style keyboard driving of an existing results <ul>: Down/Up move a
   highlight, Escape closes. Rows are read from the DOM each time rather than
   tracked in a parallel array, so a re-render can never leave the selection
   pointing at a row that no longer exists.
   Enter is deliberately NOT handled here — the pages already own Enter (it
   means "go to the best match" when nothing is highlighted), so they read
   acSelected(res) first and fall through to their own behaviour. Two Enter
   listeners on one input would have needed registration-order tricks. */
function acSelected(res){ return res&&!res.hidden?res.querySelector('li.is-sel a'):null; }
var acKeyboardReset=function(){};
function acKeyboard(input,res){
  if(!input||!res) return;
  var sel=-1;
  function rows(){ return res.hidden?[]:res.querySelectorAll('li:not(.td-none) a'); }
  function paint(){
    var r=rows(), i;
    for(i=0;i<r.length;i++){
      var li=r[i].parentNode;
      if(i===sel){ li.classList.add('is-sel');
        if(!r[i].id) r[i].id='ac-opt-'+i;
        input.setAttribute('aria-activedescendant',r[i].id);
        if(li.scrollIntoView) li.scrollIntoView({block:'nearest'}); }
      else li.classList.remove('is-sel');
    }
    if(sel<0) input.removeAttribute('aria-activedescendant');
  }
  /* any re-render invalidates the highlight */
  acKeyboardReset=function(){ sel=-1; input.removeAttribute('aria-activedescendant'); };
  input.addEventListener('keydown',function(e){
    if(e.key==='Escape'){ res.hidden=true; sel=-1; return; }
    if(e.key!=='ArrowDown'&&e.key!=='ArrowUp') return;
    var r=rows(); if(!r.length) return;
    e.preventDefault();
    sel=e.key==='ArrowDown'?(sel+1>=r.length?0:sel+1):(sel-1<0?r.length-1:sel-1);
    paint();
  });
}`;

/* ---- where the sun IS, rather than when it crosses an angle -------------
 * sunCalc answers "what time does the sun reach −0.833°"; this answers "how
 * high and in which direction is it right now", which is what a live position
 * read-out needs. Same Meeus series as sunCalc (identical declination and
 * equation-of-centre terms), so the two agree at the horizon: feed it a
 * sunrise time out of sunCalc and it returns an altitude of −0.833°.
 * Azimuth is returned in the compass convention — 0° = north, 90° = east —
 * not SunCalc's south-based one, because every consumer here prints a compass
 * bearing. Returns { alt, az } in degrees. */
export const SUNPOS_JS = `
function sunPosition(date,lat,lng){
  var rad=Math.PI/180, dayMs=86400000, J1970=2440588, J2000=2451545, e=rad*23.4397;
  var d=date.valueOf()/dayMs - 0.5 + J1970 - J2000;
  var M=rad*(357.5291+0.98560028*d);
  var L=M+rad*(1.9148*Math.sin(M)+0.02*Math.sin(2*M)+0.0003*Math.sin(3*M))+rad*102.9372+Math.PI;
  var dec=Math.asin(Math.sin(e)*Math.sin(L));
  var ra=Math.atan2(Math.sin(L)*Math.cos(e),Math.cos(L));
  /* Greenwich mean sidereal time, then the local hour angle */
  var H=rad*(280.16+360.9856235*d)-rad*-lng-ra, phi=rad*lat;
  var alt=Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H));
  var az=Math.atan2(Math.sin(H), Math.cos(H)*Math.sin(phi)-Math.tan(dec)*Math.cos(phi));
  return { alt: alt/rad, az: ((az/rad+180)%360+360)%360 };
}
var SUN_COMPASS16=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
var SUN_COMPASS_LONG=['north','north-northeast','northeast','east-northeast','east','east-southeast','southeast','south-southeast','south','south-southwest','southwest','west-southwest','west','west-northwest','northwest','north-northwest'];
function sunCompass(deg){ return SUN_COMPASS16[Math.round((((deg%360)+360)%360)/22.5)%16]; }
function sunCompassLong(deg){ return SUN_COMPASS_LONG[Math.round((((deg%360)+360)%360)/22.5)%16]; }`;

/* Node twin of sunPosition, for baking a real value into the crawlable HTML */
export function nSunPos(date, lat, lng) {
  const rad = Math.PI / 180, dayMs = 86400000, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397;
  const d = date.valueOf() / dayMs - 0.5 + J1970 - J2000;
  const M = rad * (357.5291 + 0.98560028 * d);
  const L = M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const H = rad * (280.16 + 360.9856235 * d) - rad * -lng - ra, phi = rad * lat;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  return { alt: alt / rad, az: ((az / rad + 180) % 360 + 360) % 360 };
}

/* Node build-time twin of the client sunCalc above (same algorithm), so
 * generators can bake real sunrise/sunset values into the HTML instead of "—"
 * placeholders. Shared by build-sun.mjs (city pages) and build-home.mjs (the
 * homepage Sunrise & Sunset card). ang: -0.833° = sunrise/sunset, -6° = civil
 * twilight. Returns { noon, rise?, set? } in epoch ms (rise/set absent at
 * extreme latitudes on midnight-sun / polar-night days). */
export function nSunCalc(date, lat, lng, ang) {
  const rad = Math.PI / 180, dayMs = 86400000, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397;
  const toDays = (d) => d.valueOf() / dayMs - 0.5 + J1970 - J2000;
  const sma = (d) => rad * (357.5291 + 0.98560028 * d);
  const ecl = (M) => { const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)), P = rad * 102.9372; return M + C + P + Math.PI; };
  const dec = (l) => Math.asin(Math.sin(e) * Math.sin(l));
  const approxTransit = (Ht, lw, n) => 0.0009 + (Ht + lw) / (2 * Math.PI) + n;
  const transitJ = (ds, M, L) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const fromJ = (j) => (j + 0.5 - J1970) * dayMs;
  const lw = rad * -lng, phi = rad * lat, d = toDays(date), n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
  const ds = approxTransit(0, lw, n), M = sma(ds), L = ecl(M), dc = dec(L), Jnoon = transitJ(ds, M, L);
  const x = (Math.sin(ang * rad) - Math.sin(phi) * Math.sin(dc)) / (Math.cos(phi) * Math.cos(dc));
  const out = { noon: fromJ(Jnoon) };
  if (x >= -1 && x <= 1) { const w = Math.acos(x), Jset = transitJ(approxTransit(w, lw, n), M, L); out.set = fromJ(Jset); out.rise = out.noon - (out.set - out.noon); }
  return out;
}
/* format an epoch-ms instant as a local time ("6:01 AM") in the given tz */
export function sunHm(ms, tz) {
  try { return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(ms)); } catch (e) { return "—"; }
}

/* shared dial renderer (city pages + hub + homepage card) */
export const DIAL_JS = `
  /* ---- the 24-hour sun dial: noon at top, midnight at bottom. Day wedge
   * tinted gold, dawn/dusk twilight wedges tinted amber, radial lines at
   * sunrise/sunset (solid) and first/last light (dashed), a sun or moon
   * icon for each hour with the 24h numeral inside the ring, and a live
   * hand pointing at the current time in the city's own zone. ---- */
  function drawDial(S,TW,TZ,svg,opts){
    opts=opts||{}; if(!svg) return;
    /* R1 sits just past the icon tips so the margin outside the sun/moon
       icons equals the gap inside them (icon ring R2, rays to 8.6, inner
       separator ring at 112 -> gap 7.4 each side) */
    var C=146,R1=144,R2=128,R3=97,RW=86;
    function ang(h){ return h/24*2*Math.PI; }  /* 0h at top, noon at bottom */
    function px(h,r){ var a=ang(h); return (C+r*Math.sin(a)).toFixed(1); }
    function py(h,r){ var a=ang(h); return (C-r*Math.cos(a)).toFixed(1); }
    function hmz(ms,tz){ try{ return new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',minute:'2-digit'}).format(new Date(ms)); }catch(e){ return '—'; } }
    function hod(ms){ var p=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ms)).split(':'); return +p[0]+p[1]/60; }
    var hr=S.rise?hod(S.rise):6, hs=S.set?hod(S.set):18;
    var hd=TW.rise?hod(TW.rise):hr-0.6, hk=TW.set?hod(TW.set):hs+0.6;
    function wedge(h1,h2,color){ if(h2<=h1) h2+=24; if(h2<=h1) return ''; /* wrap past midnight (Arctic summer) */
      var large=(h2-h1)>12?1:0;
      return '<path d="M'+C+' '+C+' L'+px(h1,RW)+' '+py(h1,RW)+' A'+RW+' '+RW+' 0 '+large+' 1 '+px(h2,RW)+' '+py(h2,RW)+' Z" fill="'+color+'"/>'; }
    function line(h,color,dash){ return '<line x1="'+px(h,58)+'" y1="'+py(h,58)+'" x2="'+px(h,RW)+'" y2="'+py(h,RW)+'" stroke="'+color+'" stroke-width="1.8"'+(dash?' stroke-dasharray="3 4" opacity=".75"':'')+'/>'; }
    function sunIco(x,y){ var o='<g transform="translate('+x+' '+y+')"><circle r="4.6" fill="#fcd34d"/>';
      for(var k=0;k<8;k++){ var a=k*Math.PI/4; o+='<line x1="'+(6.2*Math.cos(a)).toFixed(1)+'" y1="'+(6.2*Math.sin(a)).toFixed(1)+'" x2="'+(8.6*Math.cos(a)).toFixed(1)+'" y2="'+(8.6*Math.sin(a)).toFixed(1)+'" stroke="#fcd34d" stroke-width="1.4" stroke-linecap="round"/>'; }
      return o+'</g>'; }
    function moonIco(x,y){ return '<g transform="translate('+x+' '+y+')"><circle r="6.2" fill="#cbd5e1"/><circle cx="3.2" cy="-2.2" r="5.2" fill="#12172b"/></g>'; }
    var out='<circle cx="'+C+'" cy="'+C+'" r="'+R1+'" fill="#12172b" stroke="#2b3350" stroke-width="1.5"/>';
    out+='<circle cx="'+C+'" cy="'+C+'" r="112" fill="none" stroke="rgba(148,163,184,.28)" stroke-width="1"/>';
    out+=wedge(hd,hk,'rgba(251,146,60,.13)');           /* dawn->dusk amber under-glow */
    out+=wedge(hr,hs,'rgba(252,211,77,.18)');           /* daylight gold */
    /* subtle ring enclosing the day/night face (matches the numeral ring) */
    out+='<circle cx="'+C+'" cy="'+C+'" r="'+RW+'" fill="none" stroke="rgba(148,163,184,.28)" stroke-width="1"/>';
    out+=line(hd,'#fb923c',true)+line(hk,'#fb923c',true);
    out+=line(hr,'#fcd34d')+line(hs,'#fcd34d');
    for(var i=0;i<24;i++){
      var mid=i+0.5, day=hs>hr?(mid>=hr&&mid<=hs):(mid>=hr||mid<=hs);
      out+=(day?sunIco(px(mid,R2),py(mid,R2)):moonIco(px(mid,R2),py(mid,R2)));
      var big=(i%6===0);
      out+='<text x="'+px(mid,R3)+'" y="'+py(mid,R3)+'" text-anchor="middle" dy=".34em" font-size="'+(big?11:8.5)+'" font-weight="'+(big?'700':'400')+'" fill="'+(big?'#e2e8f0':'#7c88a8')+'">'+i+'</text>';
    }
    var labels=[[hr,'Sunrise','#fcd34d'],[hs,'Sunset','#fcd34d'],[hd,'Dawn','#fb923c'],[hk,'Dusk','#fb923c']];
    var hand='';
    function handNow(){
      var hn=hod(Date.now()), a=ang(hn), sx=Math.sin(a), cx2=Math.cos(a);
      function X(r,o){ return (C+r*sx+o*cx2).toFixed(1); }
      function Y(r,o){ return (C-r*cx2+o*sx).toFixed(1); }
      return '<line x1="'+C+'" y1="'+C+'" x2="'+X(80,0)+'" y2="'+Y(80,0)+'" stroke="#f8fafc" stroke-width="2.2" stroke-linecap="round"/>'
        +'<polygon points="'+X(90,0)+','+Y(90,0)+' '+X(79,3.6)+','+Y(79,3.6)+' '+X(79,-3.6)+','+Y(79,-3.6)+'" fill="#f8fafc"/>'
        +'<circle cx="'+C+'" cy="'+C+'" r="4" fill="#fcd34d"/>';
    }
    /* the gold center pivot stays even when the hand is hidden (non-today dates) */
    var pivot='<circle cx="'+C+'" cy="'+C+'" r="4" fill="#fcd34d"/>';
    /* The hand is never in the served HTML — it's drawn here at view time,
       repainted every minute, and repainted IMMEDIATELY when a background
       tab becomes visible again (browsers throttle timers, so without this
       a tab reopened hours later could briefly show the old hand). A token
       on the svg makes stale repaints from superseded drawDial calls
       (e.g. after a date-picker change) clean themselves up. */
    var tok={}; svg.__acTok=tok; var iv=null;
    function paint(){ if(svg.__acTok!==tok||(iv&&!svg.isConnected)){ if(iv) clearInterval(iv); return; }
      svg.innerHTML=out+(opts.hand===false?pivot:handNow()); }
    paint();
    if(opts.live!==false){ iv=setInterval(paint,60000);
      var onVis=function(){ if(svg.__acTok!==tok||!svg.isConnected){ document.removeEventListener('visibilitychange',onVis); return; }
        if(!document.hidden) paint(); };
      document.addEventListener('visibilitychange',onVis); }
    var note=opts.noteEl;
    if(note) note.textContent='The gold band is daylight, from '+(S.rise?hmz(S.rise,TZ):'—')+' to '+(S.set?hmz(S.set,TZ):'—')+'. The amber dashes mark first light at '+(TW.rise?hmz(TW.rise,TZ):'—')+' and last light at '+(TW.set?hmz(TW.set,TZ):'—')+'. The hand shows the time there right now.';
  }
`;

/* Node twin of DIAL_JS's static drawing (everything EXCEPT the live "now"
 * hand): renders the 24-hour sun dial as a static SVG string at build time so
 * the dial ships as real HTML instead of an empty circle. On the /sun/ pages
 * the client drawDial() still redraws it with the live hand + interactivity;
 * on the home card it's left static (no JS). S/TW are nSunCalc results
 * ({rise,set} epoch ms, possibly absent at polar latitudes); tz is the IANA
 * zone. Returns the SVG INNER content for a viewBox="0 0 292 292" element. */
/* The dial ALWAYS draws its full ring — 24 hour numerals and 24 sun/moon
 * glyphs — including the home page's six thumbnails. A previous pass dropped
 * the ring from those on the grounds that it was 108KB of home page and
 * illegible at 90px; the ring is the dial's whole visual identity, so that
 * traded away the design to save bytes. It is back.
 *
 * The bytes came from writing the same two glyphs out 144 times. Each sun is a
 * circle plus eight rays (nine elements, ~700B of markup) and it is IDENTICAL
 * every time it appears. So both glyphs are defined once per page and
 * referenced — see SUN_ICON_DEFS, injected by build-inline into any page that
 * mentions them. Same picture, ~1/10th the markup.
 *
 * (This is safe where the moon FACE was not: that sprite is 828 elements behind
 * two blur filters, so 31 <use>s of it cost real paint time. A nine-element
 * rayed circle at 12px is not in that category — measured below.) */
/* The two dial glyphs, defined once per page. build-inline injects this into any
 * page whose markup references "#ac-sun-ico" (same pattern as the moon sprite),
 * so a generator only has to emit the <use>. Kept in a hidden 0x0 <svg> so it
 * contributes nothing to layout. */
export const SUN_ICON_DEFS = (() => {
  let rays = "";
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    rays += `<line x1="${(6.2 * Math.cos(a)).toFixed(1)}" y1="${(6.2 * Math.sin(a)).toFixed(1)}" x2="${(8.6 * Math.cos(a)).toFixed(1)}" y2="${(8.6 * Math.sin(a)).toFixed(1)}" stroke="#fcd34d" stroke-width="1.4" stroke-linecap="round"/>`;
  }
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>` +
    `<g id="ac-sun-ico"><circle r="4.6" fill="#fcd34d"/>${rays}</g>` +
    `<g id="ac-moon-ico"><circle r="6.2" fill="#cbd5e1"/><circle cx="3.2" cy="-2.2" r="5.2" fill="#12172b"/></g>` +
    `</defs></svg>`;
})();

export function sunDialSvg(S, TW, tz) {
  const C = 146, R2 = 128, R3 = 97, RW = 86;
  const ang = (h) => h / 24 * 2 * Math.PI;
  const px = (h, r) => (C + r * Math.sin(ang(h))).toFixed(1);
  const py = (h, r) => (C - r * Math.cos(ang(h))).toFixed(1);
  const hod = (ms) => { try { const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms)).split(":"); return +p[0] + p[1] / 60; } catch (e) { return 12; } };
  const hr = S.rise ? hod(S.rise) : 6, hs = S.set ? hod(S.set) : 18;
  const hd = TW.rise ? hod(TW.rise) : hr - 0.6, hk = TW.set ? hod(TW.set) : hs + 0.6;
  /* h2 <= h1 means the arc wraps past midnight (e.g. Arctic summer, sunset after
     12 AM) — carry it round the far side instead of drawing nothing */
  const wedge = (h1, h2, color) => { if (h2 <= h1) h2 += 24; if (h2 <= h1) return ""; const large = (h2 - h1) > 12 ? 1 : 0; return `<path d="M${C} ${C} L${px(h1, RW)} ${py(h1, RW)} A${RW} ${RW} 0 ${large} 1 ${px(h2, RW)} ${py(h2, RW)} Z" fill="${color}"/>`; };
  const line = (h, color, dash) => `<line x1="${px(h, 58)}" y1="${py(h, 58)}" x2="${px(h, RW)}" y2="${py(h, RW)}" stroke="${color}" stroke-width="1.8"${dash ? ' stroke-dasharray="3 4" opacity=".75"' : ""}/>`;
  const sunIco = (x, y) => `<use href="#ac-sun-ico" transform="translate(${x} ${y})"/>`;
  const moonIco = (x, y) => `<use href="#ac-moon-ico" transform="translate(${x} ${y})"/>`;
  let out = `<circle cx="${C}" cy="${C}" r="144" fill="#12172b" stroke="#2b3350" stroke-width="1.5"/>`;
  out += `<circle cx="${C}" cy="${C}" r="112" fill="none" stroke="rgba(148,163,184,.28)" stroke-width="1"/>`;
  out += wedge(hd, hk, "rgba(251,146,60,.13)");
  out += wedge(hr, hs, "rgba(252,211,77,.18)");
  out += `<circle cx="${C}" cy="${C}" r="${RW}" fill="none" stroke="rgba(148,163,184,.28)" stroke-width="1"/>`;
  out += line(hd, "#fb923c", true) + line(hk, "#fb923c", true);
  out += line(hr, "#fcd34d") + line(hs, "#fcd34d");
  for (let i = 0; i < 24; i++) {
    const mid = i + 0.5, day = hs > hr ? (mid >= hr && mid <= hs) : (mid >= hr || mid <= hs);
    out += day ? sunIco(px(mid, R2), py(mid, R2)) : moonIco(px(mid, R2), py(mid, R2));
    const big = i % 6 === 0;
    out += `<text x="${px(mid, R3)}" y="${py(mid, R3)}" text-anchor="middle" dy=".34em" font-size="${big ? 11 : 8.5}" font-weight="${big ? "700" : "400"}" fill="${big ? "#e2e8f0" : "#7c88a8"}">${i}</text>`;
  }
  out += `<circle cx="${C}" cy="${C}" r="4" fill="#fcd34d"/>`;  /* gold center pivot (no live hand) */
  return out;
}

/* ---- "set alarm for HH:MM" landing pages. One per half hour around the whole
 * 24-hour clock — 48 of them, 12:00 AM through 11:30 PM. Shared by
 * build-alarm-times.mjs, build-inline.mjs and build-sitemap.mjs so the slugs
 * never drift. (This said "5:00 AM to 11:30 AM" long after the loop stopped
 * agreeing with it; making the code match the comment would have deleted 34
 * live, indexed pages.) */
export function alarmTimes() {
  const p2 = (n) => String(n).padStart(2, "0");
  const out = [];
  /* Full 24-hour clock at :00 and :30. Each half-hour is a distinct, real
   * search ("set alarm for 9 pm", "set alarm for 3 am") the site presets a
   * working alarm for, with its own use-case copy in build-alarm-times.mjs. */
  for (let mins = 0; mins < 24 * 60; mins += 30) {
    const h = Math.floor(mins / 60), m = mins % 60;
    const ap = h < 12 ? "AM" : "PM", hh = h % 12 || 12;
    out.push({
      h, m, ap, hh,
      t24: `${p2(h)}:${p2(m)}`,          // "05:00"
      disp: `${hh}:${p2(m)} ${ap}`,       // "5:00 AM"
      slug: `${hh}${m ? `-${m}` : ""}-${ap.toLowerCase()}`, // "5-am", "5-30-am", "12-pm"
    });
  }
  return out;
}
