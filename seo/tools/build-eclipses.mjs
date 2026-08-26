#!/usr/bin/env node
/* build-eclipses.mjs — /moon/eclipses/ hub + one page per lunar eclipse.
 *
 * The one thing the moon section could not answer. Every other moon question
 * here has a page; "when is the next lunar eclipse" had zero mentions across
 * 1,113 moon pages.
 *
 * SOLVED, NOT TABULATED. seo/tools/eclipse.mjs implements Meeus chapter 54 on
 * top of the same series the phase calendar already uses. No eclipse date is
 * typed in, which matters because a typed-in table is exactly the kind of
 * content that silently rots — and because a date nobody can re-derive is a
 * date nobody should trust.
 *
 * HOW IT WAS CHECKED, since "I implemented an algorithm" is not evidence:
 *   - Against known events. The first run was twelve hours out on every
 *     eclipse — Julian Day starts at noon and the epoch conversion had dropped
 *     the half day. Comparing three well-documented eclipses caught it in one
 *     pass. Fixed, the solver reproduces 2025-03-14 06:59, 2025-09-07 18:12,
 *     2026-03-03 11:34 and 2026-08-28 04:13 UTC to the minute, with umbral
 *     magnitudes and the distinctive ~101-minute totality of 2029-06-26.
 *   - Against this site's own astronomy. Every eclipse must fall at a full
 *     moon; each one lands within 15 minutes of the full-moon instant that
 *     build-moon computes independently, and the residual tracks gamma exactly
 *     as the geometry requires — 0.6 min for the near-central 2029 eclipse,
 *     14.4 min for a grazing penumbral one. That is the signature of correct
 *     code, not of agreement by luck.
 *   - Against geography. The sub-lunar point at greatest eclipse puts each one
 *     over the region that actually saw it (2025-03-14 over the eastern
 *     Pacific, the Americas; 2025-09-07 over the Indian Ocean, Asia).
 *
 * NO SOLAR ECLIPSES. Same chapter, deliberately not built: a solar eclipse is
 * only visible along a narrow track, which needs Besselian elements to compute,
 * and publishing a bare date without one tells people to look at the sun on a
 * day when they may not be anywhere near the path.
 *
 *   node seo/tools/build-eclipses.mjs   (run before build-sitemap + build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, faqLd, breadcrumbLD } from "./lib.mjs";
import { ico } from "./icons.mjs";
import { eclipsesBetween } from "./eclipse.mjs";
import { moonPos, moonGlyph, moonIllum, MOON_ASSET_JS } from "./moon.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const HUB = "/moon/eclipses/";
const NOW = new Date();
const Y = NOW.getUTCFullYear();
/* the same span the moon calendars cover, so the two sections never disagree
 * about which years this site claims to know about */
const FROM = Date.UTC(Y - 1, 0, 1), TO = Date.UTC(Y + 4, 0, 1);

const ECLIPSES = eclipsesBetween(FROM, TO);
if (!ECLIPSES.length) throw new Error("no eclipses computed for the window — eclipse.mjs is broken, and an empty eclipse hub would be worse than none");

/* ---- formatting ---- */
const utc = (ms, opt) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opt }).format(new Date(ms));
const uDate = (ms) => utc(ms, { year: "numeric", month: "long", day: "numeric" });
const uShort = (ms) => utc(ms, { year: "numeric", month: "short", day: "numeric" });
const uTime = (ms) => utc(ms, { hour: "2-digit", minute: "2-digit", hour12: false });
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const mins = (m) => {
  const t = Math.round(m);
  return t >= 60 ? `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, "0")} min` : `${t} min`;
};

const KIND_LABEL = { total: "Total lunar eclipse", partial: "Partial lunar eclipse", penumbral: "Penumbral lunar eclipse" };
const KIND_ONE = {
  total: "The moon passes entirely into the Earth's umbra — the dark core of the shadow — and turns a deep copper red.",
  partial: "Part of the moon enters the Earth's umbra, taking a visible dark bite out of the disc; the rest stays in the fainter penumbra.",
  penumbral: "The moon passes only through the penumbra, the soft outer shadow. The disc dims slightly on one side and never darkens sharply — the subtlest kind, and easy to miss.",
};
const slugFor = (e) => `${iso(e.maxMs)}-${e.kind}-lunar-eclipse`;

/* ---- where on Earth it is overhead. Coarse grid, then refined — the moon's
 * position code is the authority, so this is a search rather than a formula,
 * and it cannot drift away from the rest of the site's astronomy. ---- */
function subLunar(ms) {
  let best = { alt: -99, lat: 0, lon: 0 };
  for (let lat = -90; lat <= 90; lat += 5) for (let lon = -180; lon < 180; lon += 5) {
    const a = moonPos(ms, lat, lon).alt; if (a > best.alt) best = { alt: a, lat, lon };
  }
  for (let s = 2; s >= 0.05; s /= 2) {
    for (let lat = best.lat - s; lat <= best.lat + s; lat += s / 2)
      for (let lon = best.lon - s; lon < best.lon + s; lon += s / 2) {
        const a = moonPos(ms, lat, lon).alt; if (a > best.alt) best = { alt: a, lat, lon };
      }
  }
  return best;
}
/* A named region for a longitude band. Deliberately coarse: this says which
 * side of the world had the moon up, which is the honest resolution of a
 * single sub-lunar point. It is not a visibility map and does not pretend to
 * be one — the page tells you to check your own location, and gives you the
 * control to do it. */
function regionFor(lon) {
  const bands = [
    [-180, -140, "the central Pacific"],
    [-140, -100, "the eastern Pacific and western North America"],
    [-100, -60, "the Americas"],
    [-60, -20, "eastern South America and the Atlantic"],
    [-20, 20, "Europe, west Africa and the eastern Atlantic"],
    [20, 60, "eastern Europe, Africa and the Middle East"],
    [60, 100, "central and south Asia and the Indian Ocean"],
    [100, 140, "east and southeast Asia and Australia"],
    [140, 180, "the western Pacific, Japan, eastern Australia and New Zealand"],
  ];
  return (bands.find(([a, b]) => lon >= a && lon < b) || bands[4])[2];
}

const FAQ = [
  ["What is a lunar eclipse?",
    "The Earth passing directly between the sun and the moon, so the moon moves through the Earth's shadow. It can only happen at a full moon, and only when that full moon is near one of the two points where the moon's tilted orbit crosses the Earth's — which is why there are a handful a year rather than one a month."],
  ["Why does the moon turn red?",
    "The Earth's atmosphere bends some sunlight around the planet and into the shadow, and scatters the blue out of it on the way — the same physics that makes a sunset red. What reaches the moon during totality is the light of every sunrise and sunset on Earth at once."],
  ["Do I need a telescope, or eye protection?",
    "Neither. A lunar eclipse is safe to look at with bare eyes — you are looking at the moon, not the sun — and binoculars help but nothing is required. This is the opposite of a solar eclipse, which is never safe to look at unaided."],
  ["Will I be able to see it from where I live?",
    "If the moon is above your horizon at the time, yes — a lunar eclipse is visible to the entire night side of the Earth at once, with no narrow path. Each eclipse page below converts the times to your own zone and tells you whether the moon is up for you."],
  ["Why are the times the same everywhere?",
    "Because the shadow falls on the moon, not on you. The moon enters the umbra at one instant for the whole planet; only the clock reading differs, and only because your time zone does."],
  ["How are these dates worked out?",
    "They are computed, not listed — the same periodic-term method this site uses for the moon phases, extended to solve for the geometry of each eclipse. The method, and its limits, are set out on the methodology pages."],
];

/* ---- shared page shell ---- */
function doc({ url, title, desc, h1, sub, body, faq = [], crumbSub = null, js = "" }) {
  const crumbs = [{ name: "Time and Space Science", url: "/" }, { name: "Moon", url: "/moon/" }, { name: "Lunar eclipses", url: HUB }];
  if (crumbSub) crumbs.push({ name: crumbSub, url });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, crumbs)}</script>
${faq.length ? faqLd(faq) : ""}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand(crumbSub
    ? { crumb: { slug: "moon", url: "/moon/" }, sub: { slug: "eclipses", url: HUB } }
    : { crumb: { slug: "moon", url: "/moon/" }, sub: { slug: "eclipses", url: HUB } })}
  <h1>${h1}</h1>
  <p class="sub">${sub}</p>
${body}
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${js ? `<script>\n${MOON_ASSET_JS}\n${js}\n</script>` : ""}
</body>
</html>
`;
}

/* Converts every baked UTC instant to the reader's own zone, and answers "can
 * I see it from here" using the moon-position code already on the page. Both
 * are done in the browser on purpose: the times are the same worldwide but the
 * clock is not, and visibility is the one genuinely local part of a lunar
 * eclipse. Baked UTC stays in the markup so a crawler sees real values. */
const ECL_JS = `
(function(){
  var rows=[].slice.call(document.querySelectorAll('[data-ecl-ms]'));
  if(rows.length){
    var tz=''; try{ tz=Intl.DateTimeFormat().resolvedOptions().timeZone||''; }catch(e){}
    var fmt=new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    rows.forEach(function(el){
      var ms=+el.getAttribute('data-ecl-ms'); if(!ms) return;
      try{ el.textContent=fmt.format(new Date(ms)); el.removeAttribute('title'); }catch(e){}
    });
    var lab=document.getElementById('ecl-tzlabel');
    if(lab&&tz) lab.textContent=' ('+tz.replace(/_/g,' ')+')';
  }
  var box=document.getElementById('ecl-local'); if(!box||!window.AC_MOON) return;
  var maxMs=+box.getAttribute('data-ecl-max'), out=document.getElementById('ecl-vis');
  function verdict(lat,lon,where){
    var p=window.AC_MOON.pos(maxMs,lat,lon), a=Math.round(p.alt);
    if(a>25) out.innerHTML='<b>Yes — visible from '+where+'.</b> At greatest eclipse the moon is about '+a+'\\u00B0 above your horizon, high enough to watch comfortably.';
    else if(a>0) out.innerHTML='<b>Yes, but low — from '+where+'.</b> The moon is only about '+a+'\\u00B0 up at greatest eclipse, so you need a clear view towards the '+window.AC_MOON.compass(p.az)+' horizon.';
    else out.innerHTML='<b>No — not from '+where+'.</b> The moon is below your horizon ('+a+'\\u00B0) at greatest eclipse, so this one happens during your daytime.';
    box.hidden=false;
  }
  var btn=document.getElementById('ecl-locate');
  if(btn) btn.addEventListener('click',function(){
    if(!navigator.geolocation){ out.textContent='This browser will not share a location.'; box.hidden=false; return; }
    btn.disabled=true; btn.textContent='Locating\\u2026';
    navigator.geolocation.getCurrentPosition(function(p){
      btn.hidden=true; verdict(p.coords.latitude,p.coords.longitude,'your location');
    },function(){ btn.disabled=false; btn.textContent='Check my location'; out.textContent='Location unavailable \\u2014 the times above are still correct for your time zone.'; box.hidden=false; });
  });
})();`;

/* ============================================================ eclipse pages */
/* IMPORTING THIS FILE MUST NOT WRITE PAGES — build-inline imports it for
 * ECLIPSE_SLUGS. Without the guard every build wrote these pages twice, and
 * running build-inline (or build-sitemap) alone rewrote them WITHOUT the inline
 * pass, leaving render-blocking stylesheet links on disk. Same guard build-sun
 * and build-moon have. PAGES is still built on import, because ECLIPSE_SLUGS
 * is derived from it; only the writes are conditional. */
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) mkdirSync(join(root, "moon", "eclipses"), { recursive: true });
const PAGES = [];

for (const e of ECLIPSES) {
  const slug = slugFor(e);
  const label = KIND_LABEL[e.kind];
  const sub = subLunar(e.maxMs);
  const region = regionFor(sub.lon);
  const ill = moonIllum(e.maxMs);
  const upcoming = e.maxMs > NOW.getTime();

  /* the timeline: only the phases this eclipse actually has */
  const steps = [["Penumbral eclipse begins", e.penumbralBeginMs, "the moon touches the soft outer shadow — hard to notice at first"]];
  if (e.partialBeginMs) steps.push(["Partial eclipse begins", e.partialBeginMs, "the dark umbra reaches the edge of the disc"]);
  if (e.totalBeginMs) steps.push(["Totality begins", e.totalBeginMs, "the moon is fully inside the umbra and turns red"]);
  steps.push(["Greatest eclipse", e.maxMs, "the moon is deepest in the shadow"]);
  if (e.totalEndMs) steps.push(["Totality ends", e.totalEndMs, "the first bright edge returns"]);
  if (e.partialEndMs) steps.push(["Partial eclipse ends", e.partialEndMs, "the umbra leaves the disc"]);
  steps.push(["Penumbral eclipse ends", e.penumbralEndMs, "the moon is clear of the shadow"]);

  const rows = steps.map(([n, ms, why]) => `      <div class="wc-frow"><span><b>${esc(n)}</b><br><span class="hint">${esc(why)}</span></span><b>${uTime(ms)} UTC<br><span class="hint" data-ecl-ms="${ms}" title="local time appears here">${uShort(ms)}</span></b></div>`).join("\n");

  const facts = [
    ["Type", label],
    ["Date (UTC)", uDate(e.maxMs)],
    ["Greatest eclipse", `${uTime(e.maxMs)} UTC`],
    ["Umbral magnitude", e.magnitudeUmbral > 0 ? e.magnitudeUmbral.toFixed(3) : "— (penumbral only)"],
    ["Penumbral magnitude", e.magnitudePenumbral.toFixed(3)],
    e.durationTotalMin ? ["Totality lasts", mins(e.durationTotalMin)] : null,
    e.durationPartialMin ? ["Partial phase lasts", mins(e.durationPartialMin)] : null,
    ["Whole event lasts", mins(e.durationPenumbralMin)],
    ["Moon overhead near", `${Math.abs(sub.lat).toFixed(0)}°${sub.lat < 0 ? "S" : "N"}, ${Math.abs(sub.lon).toFixed(0)}°${sub.lon < 0 ? "W" : "E"}`],
  ].filter(Boolean);

  const body = `
  <div class="card mn-hero">
    <div class="mn-hero-top">
      <div class="mn-hero-art">${moonGlyph(ill.fraction, ill.waxing, 68)}</div>
    </div>
    <div class="mn-hero-facts">
      <p class="mn-phase">${esc(label)}</p>
      <p class="mn-illum"><b>${uDate(e.maxMs)}</b> · greatest eclipse ${uTime(e.maxMs)} UTC</p>
      <p>${esc(KIND_ONE[e.kind])}</p>
    </div>
  </div>

  <div class="card">
    <h2>Timeline</h2>
    <p>Every one of these instants is the same moment everywhere on Earth — the shadow falls on the moon, not on you. UTC is baked in; your own time zone<span id="ecl-tzlabel"></span> appears underneath when the page loads.</p>
    <div class="wc-facts">
${rows}
    </div>
  </div>

  <div class="card">
    <h2>Can you see it?</h2>
    <p>A lunar eclipse has no narrow path — everyone on the night side of the Earth sees the same thing at the same instant. At greatest eclipse the moon is directly overhead near ${Math.abs(sub.lat).toFixed(0)}°${sub.lat < 0 ? "S" : "N"}, ${Math.abs(sub.lon).toFixed(0)}°${sub.lon < 0 ? "W" : "E"}, so it is best placed over <strong>${esc(region)}</strong>. Further from there, the moon sits lower; on the far side of the world it is below the horizon and the eclipse happens in daylight.</p>
    <p><button class="btn secondary" id="ecl-locate" type="button" style="width:auto">Check my location</button></p>
    <div class="card" id="ecl-local" data-ecl-max="${e.maxMs}" hidden><p id="ecl-vis"></p></div>
    <p class="hint">Worked out from the moon's altitude at your coordinates at greatest eclipse. Cloud is not included — nothing on this site knows the weather.</p>
  </div>

  <div class="card tool-about">
    <h2>What to expect</h2>
    ${e.kind === "total"
      ? `<p>Totality lasts <strong>${mins(e.durationTotalMin)}</strong>, inside a partial phase of ${mins(e.durationPartialMin)}. The colour during totality varies from a bright orange to a dark brick red depending on how much dust and cloud is in the Earth's atmosphere at the time — it is not predictable in advance, which is part of the appeal.</p>`
      : e.kind === "partial"
        ? `<p>The umbra covers about <strong>${Math.round(e.magnitudeUmbral * 100)}%</strong> of the moon's diameter at maximum, over a partial phase of ${mins(e.durationPartialMin)}. The bite out of the disc is obvious to the naked eye; the shadow's edge is soft, not sharp.</p>`
        : `<p>This is a penumbral eclipse — the moon misses the dark umbra entirely and passes only through the soft outer shadow, for ${mins(e.durationPenumbralMin)}. Expect a subtle grey shading across one side of the disc near maximum, not a bite. Many people looking casually would not notice it at all.</p>`}
    <p>No equipment and no eye protection are needed. Unlike a solar eclipse, a lunar eclipse is completely safe to watch with bare eyes.</p>
  </div>

  <div class="card tool-about">
    <h2>More</h2>
    <p>${PAGES.length ? `Previous: <a href="${HUB}${slugFor(ECLIPSES[ECLIPSES.indexOf(e) - 1])}/">${esc(uShort(ECLIPSES[ECLIPSES.indexOf(e) - 1].maxMs))}</a> · ` : ""}${ECLIPSES.indexOf(e) < ECLIPSES.length - 1 ? `Next: <a href="${HUB}${slugFor(ECLIPSES[ECLIPSES.indexOf(e) + 1])}/">${esc(uShort(ECLIPSES[ECLIPSES.indexOf(e) + 1].maxMs))}</a> · ` : ""}<a href="${HUB}">All lunar eclipses</a> · <a href="/moon/calendar/">Moon calendar</a> · <a href="/moon/">Moon phase today</a></p>
    <p class="hint">Dates and circumstances are computed with the same method as the moon phases on this site — see <a href="/methodology/moon-phase/">how the moon phase is calculated</a>.</p>
  </div>`;

  const kindWord = e.kind === "total" ? "Total" : e.kind === "partial" ? "Partial" : "Penumbral";
  if (isMain) { mkdirSync(join(root, "moon", "eclipses", slug), { recursive: true });
  writeFileSync(join(root, "moon", "eclipses", slug, "index.html"), doc({
    url: `${HUB}${slug}/`,
    crumbSub: iso(e.maxMs),
    title: `${kindWord} Lunar Eclipse — ${uDate(e.maxMs)}`,
    desc: `${label} on ${uDate(e.maxMs)}: every phase in UTC and your own time zone, ${e.durationTotalMin ? `${mins(e.durationTotalMin)} of totality, ` : ""}and whether the moon is above your horizon.`,
    h1: `${esc(label)} — ${esc(uDate(e.maxMs))}`,
    sub: `${upcoming ? "Coming up" : "This one has passed"}: every phase timed to the minute, the same instant worldwide, converted to your own clock — and whether the moon is up where you are.`,
    body, faq: [], js: ECL_JS,
  })); }
  PAGES.push({ slug, e });
}

/* ====================================================================== hub */
const next = ECLIPSES.find((e) => e.maxMs > NOW.getTime());
const byYear = new Map();
for (const { slug, e } of PAGES) {
  const y = new Date(e.maxMs).getUTCFullYear();
  if (!byYear.has(y)) byYear.set(y, []);
  byYear.get(y).push({ slug, e });
}

const nextCard = next ? `
  <div class="card mn-hero">
    <div class="mn-hero-top">
      <div class="mn-hero-art">${moonGlyph(moonIllum(next.maxMs).fraction, moonIllum(next.maxMs).waxing, 68)}</div>
    </div>
    <div class="mn-hero-facts">
      <p class="mn-phase">${esc(KIND_LABEL[next.kind])}</p>
      <p class="mn-illum"><b>${esc(uDate(next.maxMs))}</b> · greatest eclipse ${uTime(next.maxMs)} UTC</p>
      <p>${esc(KIND_ONE[next.kind])}</p>
      <p><a class="btn" style="width:auto;display:inline-flex" href="${HUB}${slugFor(next)}/">Times, and can you see it →</a></p>
    </div>
  </div>` : "";

const yearBlocks = [...byYear.entries()].map(([y, list]) => `
  <div class="card">
    <h2>${y}</h2>
    <div class="wc-facts">
${list.map(({ slug, e }) => `      <div class="wc-frow"><span><a href="${HUB}${slug}/">${esc(uDate(e.maxMs))}</a><br><span class="hint">${esc(KIND_LABEL[e.kind])}${e.durationTotalMin ? ` · ${mins(e.durationTotalMin)} of totality` : ""}</span></span><b>${uTime(e.maxMs)} UTC</b></div>`).join("\n")}
    </div>
  </div>`).join("\n");

const totals = ECLIPSES.filter((e) => e.kind === "total").length;
if (isMain) writeFileSync(join(root, "moon", "eclipses", "index.html"), doc({
  url: HUB,
  title: "Lunar Eclipses — Dates, Times & Whether You Can See Them",
  desc: `Every lunar eclipse from ${Y - 1} to ${Y + 3}: exact times for each phase in UTC and your own zone, how long totality lasts, and whether the moon is above your horizon.`,
  h1: `${ico("moon")} Lunar eclipses`,
  sub: `Every lunar eclipse from ${Y - 1} through ${Y + 3} — ${ECLIPSES.length} of them, ${totals} total. Each one is computed, not copied from a list, and each page converts the times to your own clock.`,
  body: `${nextCard}
${yearBlocks}

  <div class="card tool-about">
    <h2>Why they don't happen every month</h2>
    <p>A lunar eclipse needs the sun, Earth and moon in a straight line, which sounds like every full moon — and would be, if the moon's orbit lay flat. It is tilted about five degrees, so most full moons pass above or below the Earth's shadow and nothing happens. Only when a full moon falls near one of the two points where the tilted orbit crosses the Earth's own orbital plane does the shadow actually reach it.</p>
    <p>That is why they arrive in a rhythm rather than at random: a handful a year, clustered about six months apart, with total eclipses rarer than partial ones and partial rarer than penumbral.</p>
  </div>

  <div class="card tool-about">
    <h2>The three kinds</h2>
    <p class="bullets">
      <em>Total.</em> ${esc(KIND_ONE.total)}<br>
      <em>Partial.</em> ${esc(KIND_ONE.partial)}<br>
      <em>Penumbral.</em> ${esc(KIND_ONE.penumbral)}
    </p>
  </div>

  <div class="card">
    ${FAQ.map(([q, a]) => `<h2>${esc(q)}</h2><p>${esc(a)}</p>`).join("\n    ")}
  </div>

  <div class="card tool-about">
    <h2>More moon</h2>
    <p><a href="/moon/">Moon phase today</a> · <a href="/moon/calendar/">Moon calendar</a> · <a href="/moon/full-moon-calendar/">Full moon calendar</a> · <a href="/moon/supermoons/">Supermoons</a> · <a href="/moon/blue-moons/">Blue moons</a></p>
    <p class="hint">These dates are solved with the same periodic-term method the moon phases use — see <a href="/methodology/moon-phase/">how the moon phase is calculated</a>. Solar eclipses are deliberately not listed: they are only visible along a narrow track, and a date without that track is not useful.</p>
  </div>`,
  faq: FAQ,
}));

export { ECLIPSES, ECL_JS, slugFor };
export const ECLIPSE_SLUGS = PAGES.map((p) => p.slug);
if (isMain) console.log(`built ${HUB} + ${PAGES.length} lunar eclipse pages (${totals} total, ${ECLIPSES.filter((e) => e.kind === "partial").length} partial, ${ECLIPSES.filter((e) => e.kind === "penumbral").length} penumbral)`);
