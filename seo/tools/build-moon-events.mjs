#!/usr/bin/env node
/* build-moon-events.mjs — /moon/supermoons/ and /moon/blue-moons/.
 *
 * Both were already half-built and had nowhere to land. "Supermoon" appeared on
 * 1,173 pages of this site with no page to send anyone to, and the moon code
 * carries a longer distance series SPECIFICALLY so the supermoon threshold is
 * decided correctly — the comment in moon.mjs says so. The data was there; the
 * destination wasn't.
 *
 * THE THRESHOLD IS STATED, NOT HIDDEN. There is no official definition of a
 * supermoon — it is not an astronomical term, it was coined by an astrologer in
 * 1979 and adopted by everyone else afterwards. So the page names the number it
 * uses (Espenak's 361,885 km, the common "within 90% of perigee" reading),
 * gives every full moon's actual distance, and says plainly that a different
 * source drawing the line elsewhere will list a different set. Publishing a
 * list without the rule would be presenting one arbitrary choice as fact.
 *
 * BLUE MOONS: the MONTHLY definition only. The seasonal one (third of four full
 * moons in an astronomical season) is explained but not tabulated, because
 * listing it needs the solstice and equinox instants and this site does not
 * solve for them. An explained-but-not-listed definition is honest; a listed
 * one computed from approximate season boundaries would not be.
 *
 *   node seo/tools/build-moon-events.mjs   (run before build-sitemap + build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, faqLd, breadcrumbLD } from "./lib.mjs";
import { kmSig } from "./units.mjs";
import { phasesBetween, moonDistance, moonIllum, moonGlyph, SUPERMOON_KM } from "./moon.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const NOW = Date.now();
const Y = new Date().getUTCFullYear();
const FROM = Date.UTC(Y - 1, 0, 1), TO = Date.UTC(Y + 4, 0, 1);

/* Espenak's threshold comes from moon.mjs, which is also what badges the full
 * moon calendar and the /moon/<year>/ pages — one rule, one number, one site. */

const FULLS = phasesBetween(FROM, TO).filter((p) => p.kind === 2)
  .map((p) => ({ t: p.t, km: moonDistance(p.t) }));
if (FULLS.length < 12) throw new Error("too few full moons computed — moon.mjs is broken");

const utc = (ms, o) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...o }).format(new Date(ms));
const uDate = (ms) => utc(ms, { year: "numeric", month: "long", day: "numeric" });
const uTime = (ms) => utc(ms, { hour: "2-digit", minute: "2-digit", hour12: false });
/* ONE FIGURE, NOT TWO. This page used to print every distance twice — km, then
   the same thing in miles underneath — because it could not know which its
   reader wanted. It can now: the span carries the number and the menu carries
   the choice (units.mjs), so the second copy and the "In miles" row that went
   with it are gone. */
const km = (n) => kmSig(Math.round(n), 6);

const SUPER = FULLS.filter((f) => f.km <= SUPERMOON_KM);
const closest = FULLS.reduce((a, b) => (b.km < a.km ? b : a));
const farthest = FULLS.reduce((a, b) => (b.km > a.km ? b : a));

/* monthly blue moon: the SECOND full moon inside one UTC calendar month */
const byMonth = new Map();
for (const f of FULLS) {
  const k = new Date(f.t).toISOString().slice(0, 7);
  if (!byMonth.has(k)) byMonth.set(k, []);
  byMonth.get(k).push(f);
}
const BLUE = [...byMonth.entries()].filter(([, v]) => v.length > 1)
  .map(([k, v]) => ({ month: k, first: v[0], blue: v[v.length - 1] }));

function doc({ url, slug, title, desc, h1, sub, body, faq }) {
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
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Moon", url: "/moon/" }, { name: h1, url }])}</script>
${faqLd(faq)}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "moon", url: "/moon/" }, sub: { slug, url } })}
  <h1>${esc(h1)}</h1>
  <p class="sub">${sub}</p>
${body}
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;
}

/* ========================================================== supermoons ==== */
const nextSuper = SUPER.find((f) => f.t > NOW);
const superFaq = [
  ["What counts as a supermoon?",
    `There is no official definition — "supermoon" is not an astronomical term. The common rule, and the one used here, is a full moon closer than ${km(SUPERMOON_KM)}, which is roughly the nearest 10% of the moon's range. A source drawing the line somewhere else will list a different set of dates, and neither is wrong.`],
  ["How much bigger does it actually look?",
    `At its closest the moon is about ${km(closest.km)} away; at its farthest, about ${km(farthest.km)}. That is a difference of roughly 14% in apparent width and 30% in brightness between the extremes. Side by side in a photograph it is obvious. Looking up on one night with nothing to compare against, most people cannot tell.`],
  ["Why does the distance change at all?",
    "The moon's orbit is an ellipse, not a circle, so it has a near point (perigee) and a far point (apogee) every month. A supermoon is simply a full moon that happens to land near the near point."],
  ["Is the moon bigger when it's near the horizon?",
    "No — that is the moon illusion, and it is entirely in your head. Measure it and the disc is the same size overhead as it is rising. Photograph both and they match."],
  ["Does a supermoon affect the tides?",
    "Slightly. A closer moon pulls a little harder, so the tidal range around a supermoon is larger than usual — perigean spring tides. The effect is real but modest, and coastal flooding blamed on it usually needs weather as well. Predicted heights for US stations are on the tide pages."],
];

mkdirSync(join(root, "moon", "supermoons"), { recursive: true });
writeFileSync(join(root, "moon", "supermoons", "index.html"), doc({
  url: "/moon/supermoons/", slug: "supermoons",
  title: "Supermoons — Dates, Distances & What You Actually See",
  desc: `Every supermoon from ${Y - 1} to ${Y + 3} with its exact distance, the threshold used to decide the list, and an honest answer to how much bigger it looks.`,
  h1: "Supermoons",
  sub: `Every full moon closer than ${km(SUPERMOON_KM)} from ${Y - 1} through ${Y + 3} — ${SUPER.length} of them — with the distance of each, and the rule used to draw the line.`,
  body: `${nextSuper ? `
  <div class="card mn-hero">
    <div class="mn-hero-top"><div class="mn-hero-art">${moonGlyph(moonIllum(nextSuper.t).fraction, moonIllum(nextSuper.t).waxing, 68)}</div></div>
    <div class="mn-hero-facts">
      <p class="mn-phase">Next supermoon</p>
      <p class="mn-illum"><b>${esc(uDate(nextSuper.t))}</b> · ${uTime(nextSuper.t)} UTC</p>
      <dl class="mn-stats">
        <div><dt>Distance</dt><dd>${km(nextSuper.km)}</dd></div>
        <div><dt>Closer than average by</dt><dd>${km(384400 - nextSuper.km)}</dd></div>
      </dl>
    </div>
  </div>` : ""}

  <div class="card">
    <h2>The list</h2>
    <div class="wc-facts">
${SUPER.map((f) => `      <div class="wc-frow"><span><b>${esc(uDate(f.t))}</b><br><span class="hint">${uTime(f.t)} UTC${f.km === closest.km ? " · closest full moon in this range" : ""}</span></span><b>${km(f.km)}</b></div>`).join("\n")}
    </div>
    <p class="hint">Distances are centre-to-centre at the instant of full moon, computed with the same series as the moon phases.</p>
  </div>

  <div class="card tool-about">
    <h2>Where the line is drawn, and why it's arbitrary</h2>
    <p>"Supermoon" is not an astronomical term. It was coined in 1979 by an astrologer, and astronomers adopted it only because everyone else already had. There is no committee that decides which full moons qualify.</p>
    <p>This page uses <strong>${km(SUPERMOON_KM)}</strong> — the threshold Fred Espenak used, corresponding to the moon being within about 90% of its closest approach. Under that rule, ${SUPER.length} of the ${FULLS.length} full moons in this range qualify. Another site drawing the line at a round 360,000 km, or requiring the full moon to fall within a day of perigee, will publish a shorter list. Neither is more correct; the useful thing is knowing which rule produced the list you are reading, so the distance of every full moon is given above rather than just the verdict.</p>
  </div>

  <div class="card tool-about">
    <h2>And the other end: the micromoon</h2>
    <p>The far side of the same ellipse gets far less attention. The most distant full moon in this range is <strong>${esc(uDate(farthest.t))}</strong> at ${km(farthest.km)} — about ${km(farthest.km - closest.km)} further away than the closest one on ${esc(uDate(closest.t))}. That is the real span behind the 14%-wider figure, and comparing photographs of those two nights is the only way most people will ever notice it.</p>
  </div>

  <div class="card">
    ${superFaq.map(([q, a]) => `<h2>${esc(q)}</h2><p>${esc(a)}</p>`).join("\n    ")}
  </div>

  <div class="card tool-about">
    <h2>More moon</h2>
    <p><a href="/moon/">Moon phase today</a> · <a href="/moon/calendar/">Moon calendar</a> · <a href="/moon/full-moon-calendar/">Full moon calendar</a> · <a href="/moon/blue-moons/">Blue moons</a> · <a href="/moon/eclipses/">Lunar eclipses</a></p>
    <p class="hint">How the distance is worked out, and why the series used here is longer than the usual one: <a href="/methodology/moon-phase/">how the moon phase is calculated</a>.</p>
  </div>`,
  faq: superFaq,
}));

/* =========================================================== blue moons === */
const nextBlue = BLUE.find((b) => b.blue.t > NOW);
const blueFaq = [
  ["What is a blue moon?",
    "Two different things, confusingly. The monthly blue moon — the one almost everyone means now — is the second full moon in a single calendar month. The seasonal blue moon, which is older, is the third full moon in a season that has four instead of the usual three. This page lists the monthly kind."],
  ["Is the moon actually blue?",
    "No. The name has nothing to do with colour. A genuinely blue-looking moon does happen, very rarely, when smoke or volcanic dust of just the right particle size scatters red light — it was reported after the 1883 Krakatoa eruption — but it has no connection to the calendar event."],
  ["How often does one happen?",
    `Roughly every two and a half years. It is a calendar artefact rather than an astronomical event: the moon's cycle is about 29.5 days and most months are longer, so occasionally two full moons fit inside one. In this ${Y + 4 - (Y - 1)}-year range there ${BLUE.length === 1 ? "is 1" : `are ${BLUE.length}`}.`],
  ["Why does the date depend on my time zone?",
    "Because \"which calendar month\" does. A full moon at 00:30 UTC on the 1st is still the 31st in New York, which can move it into the previous month and create — or destroy — a blue moon depending on where you stand. The dates here are UTC, and a genuinely borderline case is called out on the page."],
  ["Where did the phrase come from?",
    "\"Once in a blue moon\" is far older than either definition and simply meant something absurd or impossible. The modern monthly meaning traces to a 1946 magazine article that misread the older seasonal rule, and the mistake stuck."],
];

mkdirSync(join(root, "moon", "blue-moons"), { recursive: true });
writeFileSync(join(root, "moon", "blue-moons", "index.html"), doc({
  url: "/moon/blue-moons/", slug: "blue-moons",
  title: "Blue Moons — Every Date, and What the Name Really Means",
  desc: `Every blue moon from ${Y - 1} to ${Y + 3} with exact times, both definitions of the term explained, and why the date can depend on your time zone.`,
  h1: "Blue moons",
  sub: `The second full moon in a calendar month — ${BLUE.length === 1 ? "one falls" : `${BLUE.length} fall`} between ${Y - 1} and ${Y + 3}. Nothing about it is blue, and it is a fact about the calendar rather than about the moon.`,
  body: `${nextBlue ? `
  <div class="card mn-hero">
    <div class="mn-hero-top"><div class="mn-hero-art">${moonGlyph(moonIllum(nextBlue.blue.t).fraction, moonIllum(nextBlue.blue.t).waxing, 68)}</div></div>
    <div class="mn-hero-facts">
      <p class="mn-phase">Next blue moon</p>
      <p class="mn-illum"><b>${esc(uDate(nextBlue.blue.t))}</b> · ${uTime(nextBlue.blue.t)} UTC</p>
      <p>The second full moon of that month — the first is on ${esc(uDate(nextBlue.first.t))}.</p>
    </div>
  </div>` : ""}

  <div class="card">
    <h2>Every blue moon, ${Y - 1}–${Y + 3}</h2>
    <div class="wc-facts">
${BLUE.map((b) => `      <div class="wc-frow"><span><b>${esc(uDate(b.blue.t))}</b><br><span class="hint">first full moon that month: ${esc(uDate(b.first.t))}</span></span><b>${uTime(b.blue.t)} UTC</b></div>`).join("\n")}
    </div>
    <p class="hint">Dates are UTC. Because a blue moon is defined by the calendar, a full moon in the first or last hours of a month can fall in a different month for you — see below.</p>
  </div>

  <div class="card tool-about">
    <h2>Two definitions, and the mistake that created one of them</h2>
    <p><strong>Monthly.</strong> The second full moon in one calendar month. This is what almost everyone means today, and it is what the list above uses.</p>
    <p><strong>Seasonal.</strong> The third full moon in an astronomical season that contains four rather than the usual three. This is the older rule, from the Maine Farmers' Almanac.</p>
    <p>The monthly definition exists because of an error: a 1946 article in <em>Sky &amp; Telescope</em> misread the almanac's seasonal rule as a monthly one, the simpler version spread, and by the time anyone corrected it the meaning had changed. Both are now in use.</p>
    <p>This page deliberately does not list seasonal blue moons. Doing so needs the exact instants of the solstices and equinoxes, which this site does not solve for — and a list built on approximate season boundaries would be wrong in exactly the borderline cases that make it interesting.</p>
  </div>

  <div class="card tool-about">
    <h2>Why your blue moon might not be a blue moon</h2>
    <p>A monthly blue moon is not an event in the sky — it is a coincidence between the moon's 29.5-day cycle and the length of a calendar month. That makes it dependent on which calendar, and which clock, you are reading.</p>
    <p>A full moon at 00:20 UTC on the 1st has already happened on the 31st in the Americas. So a month can hold two full moons in London and only one in Los Angeles, or the reverse. Neither place is wrong, and there is no authority to appeal to — the moon did the same thing for both of them.</p>
  </div>

  <div class="card">
    ${blueFaq.map(([q, a]) => `<h2>${esc(q)}</h2><p>${esc(a)}</p>`).join("\n    ")}
  </div>

  <div class="card tool-about">
    <h2>More moon</h2>
    <p><a href="/moon/">Moon phase today</a> · <a href="/moon/calendar/">Moon calendar</a> · <a href="/moon/full-moon-calendar/">Full moon calendar</a> · <a href="/moon/supermoons/">Supermoons</a> · <a href="/moon/eclipses/">Lunar eclipses</a></p>
  </div>`,
  faq: blueFaq,
}));

console.log(`built /moon/supermoons/ (${SUPER.length} of ${FULLS.length} full moons) + /moon/blue-moons/ (${BLUE.length})`);
